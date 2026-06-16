using Microsoft.EntityFrameworkCore;
using System.Text.Json;
using aiguard_api.Data;
using aiguard_api.DTOs.Common;
using aiguard_api.DTOs.Policies;
using aiguard_api.Models;

namespace aiguard_api.Services;

public interface IPolicyService
{
    Task<List<SecurityPolicyResponse>> GetDepartmentPoliciesAsync();
    Task<SecurityPolicyResponse?> UpdatePolicyAsync(Guid id, UpdatePolicyRequest request, string? actorEmail);
    Task<List<PolicyVersionResponse>> GetVersionsAsync(Guid? policyId = null);
    Task<bool> RollbackAsync(Guid versionId, string? actorEmail);
    Task<WhitelistBlacklistResponse> GetWhitelistBlacklistAsync();
    Task<WhitelistBlacklistResponse> UpdateWhitelistBlacklistAsync(UpdateWhitelistBlacklistRequest request);
    Task<SecurityPolicyResponse?> GetCurrentForDeviceAsync(string hostname);
}

public class PolicyService : IPolicyService
{
    private readonly AiguardDbContext _db;
    private readonly IDataScopeContext _scope;

    public PolicyService(AiguardDbContext db, IDataScopeContext scope)
    {
        _db = db;
        _scope = scope;
    }

    public async Task<List<SecurityPolicyResponse>> GetDepartmentPoliciesAsync()
    {
        return await _db.SecurityPolicies
            .Include(p => p.Department)
            .OrderBy(p => p.Name)
            .Select(p => MapToResponse(p))
            .ToListAsync();
    }

    public async Task<SecurityPolicyResponse?> GetCurrentForDeviceAsync(string hostname)
    {
        var device = await _db.Devices.FirstOrDefaultAsync(d => d.Hostname == hostname);
        if (device == null) return null;

        var user = await _db.Users
            .Include(u => u.Department)
            .FirstOrDefaultAsync(u => u.Email == device.UserEmail);
        var departmentId = user?.DepartmentId;

        var policy = await _db.SecurityPolicies
            .Include(p => p.Department)
            .FirstOrDefaultAsync(p => p.IsActive && departmentId != null && p.DepartmentId == departmentId)
            ?? await _db.SecurityPolicies
                .Include(p => p.Department)
                .FirstOrDefaultAsync(p => p.IsActive && p.Department != null && p.Department.Name == device.DepartmentName)
            ?? await _db.SecurityPolicies.Include(p => p.Department).FirstOrDefaultAsync(p => p.IsActive && p.DepartmentId == null)
            ?? await _db.SecurityPolicies.Include(p => p.Department).FirstOrDefaultAsync(p => p.IsActive);

        if (policy == null)
        {
            policy = new SecurityPolicy
            {
                Name = "Global Default Policy",
                DepartmentId = null,
                SensitivityThreshold = 70,
                Version = "p-global-1.0.0",
                TenantCode = _scope.TenantCode,
                IsActive = true
            };
            _db.SecurityPolicies.Add(policy);
            await _db.SaveChangesAsync();
        }

        return MapToResponse(policy);
    }

    public async Task<SecurityPolicyResponse?> UpdatePolicyAsync(
        Guid id,
        UpdatePolicyRequest request,
        string? actorEmail)
    {
        var policy = await _db.SecurityPolicies.Include(p => p.Department).FirstOrDefaultAsync(p => p.Id == id);
        if (policy == null) return null;

        await SaveSnapshotIfMissingAsync(policy, actorEmail, "Baseline before policy update");
        if (request.SensitivityThreshold.HasValue) policy.SensitivityThreshold = Math.Clamp(request.SensitivityThreshold.Value, 0, 100);
        if (request.EnableEmailDetection.HasValue) policy.EnableEmailDetection = request.EnableEmailDetection.Value;
        if (request.EnablePhoneDetection.HasValue) policy.EnablePhoneDetection = request.EnablePhoneDetection.Value;
        if (request.EnableCccdDetection.HasValue) policy.EnableCccdDetection = request.EnableCccdDetection.Value;
        if (request.EnableApiKeyDetection.HasValue) policy.EnableApiKeyDetection = request.EnableApiKeyDetection.Value;
        if (request.EnablePasswordDetection.HasValue) policy.EnablePasswordDetection = request.EnablePasswordDetection.Value;
        if (request.EnableTokenDetection.HasValue) policy.EnableTokenDetection = request.EnableTokenDetection.Value;
        if (request.EnableDbUrlDetection.HasValue) policy.EnableDbUrlDetection = request.EnableDbUrlDetection.Value;
        if (request.EnablePrivateKeyDetection.HasValue) policy.EnablePrivateKeyDetection = request.EnablePrivateKeyDetection.Value;
        if (request.EnableSourceCodeDetection.HasValue) policy.EnableSourceCodeDetection = request.EnableSourceCodeDetection.Value;
        if (request.EnableFinancialDetection.HasValue) policy.EnableFinancialDetection = request.EnableFinancialDetection.Value;
        if (request.EnableHrDetection.HasValue) policy.EnableHrDetection = request.EnableHrDetection.Value;
        if (request.LowAction != null) policy.LowAction = request.LowAction;
        if (request.MediumAction != null) policy.MediumAction = request.MediumAction;
        if (request.HighAction != null) policy.HighAction = request.HighAction;
        if (request.CriticalAction != null) policy.CriticalAction = request.CriticalAction;
        if (request.IsActive.HasValue) policy.IsActive = request.IsActive.Value;
        if (request.ScanOnPaste.HasValue) policy.ScanOnPaste = request.ScanOnPaste.Value;
        if (request.ScanOnSubmit.HasValue) policy.ScanOnSubmit = request.ScanOnSubmit.Value;
        if (request.ScanFileUpload.HasValue) policy.ScanFileUpload = request.ScanFileUpload.Value;
        if (request.ClipboardWarning.HasValue) policy.ClipboardWarning = request.ClipboardWarning.Value;
        if (request.OfflineCriticalBlock.HasValue) policy.OfflineCriticalBlock = request.OfflineCriticalBlock.Value;
        policy.UpdatedAt = DateTime.UtcNow;
        policy.Version = NewVersion();

        AddSnapshot(policy, actorEmail, request.ChangeReason ?? "Policy updated");
        await _db.SaveChangesAsync();
        return MapToResponse(policy);
    }

    public async Task<List<PolicyVersionResponse>> GetVersionsAsync(Guid? policyId = null)
    {
        var query = _db.SecurityPolicyVersions
            .Include(x => x.SecurityPolicy)
            .ThenInclude(x => x.Department)
            .AsQueryable();
        if (policyId.HasValue)
            query = query.Where(x => x.SecurityPolicyId == policyId.Value);

        return await query
            .OrderByDescending(x => x.CreatedAt)
            .Select(x => new PolicyVersionResponse
            {
                Id = x.Id,
                PolicyId = x.SecurityPolicyId,
                PolicyName = x.SecurityPolicy.Name,
                DepartmentName = x.SecurityPolicy.Department == null ? null : x.SecurityPolicy.Department.Name,
                Version = x.Version,
                UpdatedBy = x.CreatedByEmail ?? "system",
                UpdatedAt = x.CreatedAt,
                Reason = x.ChangeReason ?? string.Empty
            })
            .ToListAsync();
    }

    public async Task<bool> RollbackAsync(Guid versionId, string? actorEmail)
    {
        var version = await _db.SecurityPolicyVersions
            .Include(x => x.SecurityPolicy)
            .FirstOrDefaultAsync(x => x.Id == versionId);
        if (version == null) return false;

        var snapshot = JsonSerializer.Deserialize<PolicySnapshot>(version.SnapshotJson);
        if (snapshot == null) return false;

        var policy = version.SecurityPolicy;
        await SaveSnapshotIfMissingAsync(policy, actorEmail, "Baseline before rollback");
        ApplySnapshot(policy, snapshot);
        policy.UpdatedAt = DateTime.UtcNow;
        policy.Version = NewVersion();
        AddSnapshot(policy, actorEmail, $"Rolled back to {version.Version}");

        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<WhitelistBlacklistResponse> GetWhitelistBlacklistAsync()
    {
        var entries = await _db.PolicyListEntries
            .Where(e => e.IsActive && e.DepartmentId == null)
            .OrderBy(e => e.Value)
            .ToListAsync();

        return new WhitelistBlacklistResponse
        {
            Whitelist = entries.Where(e => e.ListType == "Whitelist").Select(e => e.Value).ToList(),
            Blacklist = entries.Where(e => e.ListType == "Blacklist").Select(e => e.Value).ToList()
        };
    }

    public async Task<WhitelistBlacklistResponse> UpdateWhitelistBlacklistAsync(UpdateWhitelistBlacklistRequest request)
    {
        var current = await _db.PolicyListEntries.Where(e => e.DepartmentId == null).ToListAsync();
        _db.PolicyListEntries.RemoveRange(current);

        var whitelist = NormalizeEntries(request.Whitelist);
        var blacklist = NormalizeEntries(request.Blacklist);
        _db.PolicyListEntries.AddRange(whitelist.Select(value => new PolicyListEntry
        {
            ListType = "Whitelist",
            EntryType = "Keyword",
            Value = value,
            TenantCode = _scope.TenantCode
        }));
        _db.PolicyListEntries.AddRange(blacklist.Select(value => new PolicyListEntry
        {
            ListType = "Blacklist",
            EntryType = "Keyword",
            Value = value,
            TenantCode = _scope.TenantCode
        }));
        await _db.SaveChangesAsync();

        return new WhitelistBlacklistResponse { Whitelist = whitelist, Blacklist = blacklist };
    }

    private static List<string> NormalizeEntries(List<string>? entries) =>
        (entries ?? [])
            .Where(value => !string.IsNullOrWhiteSpace(value))
            .Select(value => value.Trim())
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

    private async Task SaveSnapshotIfMissingAsync(
        SecurityPolicy policy,
        string? actorEmail,
        string reason)
    {
        var exists = await _db.SecurityPolicyVersions
            .AnyAsync(x => x.SecurityPolicyId == policy.Id && x.Version == policy.Version);
        if (!exists)
            AddSnapshot(policy, actorEmail, reason);
    }

    private void AddSnapshot(SecurityPolicy policy, string? actorEmail, string reason)
    {
        _db.SecurityPolicyVersions.Add(new SecurityPolicyVersion
        {
            SecurityPolicyId = policy.Id,
            Version = policy.Version,
            SnapshotJson = JsonSerializer.Serialize(PolicySnapshot.From(policy)),
            ChangeReason = reason.Trim(),
            CreatedByEmail = actorEmail,
            TenantCode = policy.TenantCode
        });
    }

    private static void ApplySnapshot(SecurityPolicy policy, PolicySnapshot snapshot)
    {
        policy.Name = snapshot.Name;
        policy.DepartmentId = snapshot.DepartmentId;
        policy.SensitivityThreshold = snapshot.SensitivityThreshold;
        policy.EnableEmailDetection = snapshot.EnableEmailDetection;
        policy.EnablePhoneDetection = snapshot.EnablePhoneDetection;
        policy.EnableCccdDetection = snapshot.EnableCccdDetection;
        policy.EnableApiKeyDetection = snapshot.EnableApiKeyDetection;
        policy.EnablePasswordDetection = snapshot.EnablePasswordDetection;
        policy.EnableTokenDetection = snapshot.EnableTokenDetection;
        policy.EnableDbUrlDetection = snapshot.EnableDbUrlDetection;
        policy.EnablePrivateKeyDetection = snapshot.EnablePrivateKeyDetection;
        policy.EnableSourceCodeDetection = snapshot.EnableSourceCodeDetection;
        policy.EnableFinancialDetection = snapshot.EnableFinancialDetection;
        policy.EnableHrDetection = snapshot.EnableHrDetection;
        policy.LowAction = snapshot.LowAction;
        policy.MediumAction = snapshot.MediumAction;
        policy.HighAction = snapshot.HighAction;
        policy.CriticalAction = snapshot.CriticalAction;
        policy.IsActive = snapshot.IsActive;
        policy.ScanOnPaste = snapshot.ScanOnPaste;
        policy.ScanOnSubmit = snapshot.ScanOnSubmit;
        policy.ScanFileUpload = snapshot.ScanFileUpload;
        policy.ClipboardWarning = snapshot.ClipboardWarning;
        policy.OfflineCriticalBlock = snapshot.OfflineCriticalBlock;
    }

    private static string NewVersion() =>
        $"p-{DateTime.UtcNow:yyyyMMddHHmmssfff}-{Random.Shared.Next(1000, 9999)}";

    private sealed record PolicySnapshot(
        string Name,
        Guid? DepartmentId,
        int SensitivityThreshold,
        bool EnableEmailDetection,
        bool EnablePhoneDetection,
        bool EnableCccdDetection,
        bool EnableApiKeyDetection,
        bool EnablePasswordDetection,
        bool EnableTokenDetection,
        bool EnableDbUrlDetection,
        bool EnablePrivateKeyDetection,
        bool EnableSourceCodeDetection,
        bool EnableFinancialDetection,
        bool EnableHrDetection,
        string LowAction,
        string MediumAction,
        string HighAction,
        string CriticalAction,
        bool IsActive,
        bool ScanOnPaste,
        bool ScanOnSubmit,
        bool ScanFileUpload,
        bool ClipboardWarning,
        bool OfflineCriticalBlock)
    {
        public static PolicySnapshot From(SecurityPolicy policy) => new(
            policy.Name,
            policy.DepartmentId,
            policy.SensitivityThreshold,
            policy.EnableEmailDetection,
            policy.EnablePhoneDetection,
            policy.EnableCccdDetection,
            policy.EnableApiKeyDetection,
            policy.EnablePasswordDetection,
            policy.EnableTokenDetection,
            policy.EnableDbUrlDetection,
            policy.EnablePrivateKeyDetection,
            policy.EnableSourceCodeDetection,
            policy.EnableFinancialDetection,
            policy.EnableHrDetection,
            policy.LowAction,
            policy.MediumAction,
            policy.HighAction,
            policy.CriticalAction,
            policy.IsActive,
            policy.ScanOnPaste,
            policy.ScanOnSubmit,
            policy.ScanFileUpload,
            policy.ClipboardWarning,
            policy.OfflineCriticalBlock);
    }

    private static SecurityPolicyResponse MapToResponse(SecurityPolicy p) => new()
    {
        Id = p.Id,
        Name = p.Name,
        DepartmentName = p.Department?.Name,
        DepartmentId = p.DepartmentId,
        SensitivityThreshold = p.SensitivityThreshold,
        EnableEmailDetection = p.EnableEmailDetection,
        EnablePhoneDetection = p.EnablePhoneDetection,
        EnableCccdDetection = p.EnableCccdDetection,
        EnableApiKeyDetection = p.EnableApiKeyDetection,
        EnablePasswordDetection = p.EnablePasswordDetection,
        EnableTokenDetection = p.EnableTokenDetection,
        EnableDbUrlDetection = p.EnableDbUrlDetection,
        EnablePrivateKeyDetection = p.EnablePrivateKeyDetection,
        EnableSourceCodeDetection = p.EnableSourceCodeDetection,
        EnableFinancialDetection = p.EnableFinancialDetection,
        EnableHrDetection = p.EnableHrDetection,
        LowAction = p.LowAction,
        MediumAction = p.MediumAction,
        HighAction = p.HighAction,
        CriticalAction = p.CriticalAction,
        IsActive = p.IsActive,
        ScanOnPaste = p.ScanOnPaste,
        ScanOnSubmit = p.ScanOnSubmit,
        ScanFileUpload = p.ScanFileUpload,
        ClipboardWarning = p.ClipboardWarning,
        OfflineCriticalBlock = p.OfflineCriticalBlock,
        Version = p.Version,
        UpdatedAt = p.UpdatedAt
    };
}
