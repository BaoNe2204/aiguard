using Microsoft.EntityFrameworkCore;
using aiguard_api.Data;
using aiguard_api.DTOs.Common;
using aiguard_api.DTOs.Policies;
using aiguard_api.Models;

namespace aiguard_api.Services;

public interface IPolicyService
{
    Task<List<SecurityPolicyResponse>> GetDepartmentPoliciesAsync();
    Task<SecurityPolicyResponse?> UpdatePolicyAsync(Guid id, UpdatePolicyRequest request);
    Task<List<PolicyVersionResponse>> GetVersionsAsync();
    Task<bool> RollbackAsync(Guid id);
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

        return policy == null ? null : MapToResponse(policy);
    }

    public async Task<SecurityPolicyResponse?> UpdatePolicyAsync(Guid id, UpdatePolicyRequest request)
    {
        var policy = await _db.SecurityPolicies.Include(p => p.Department).FirstOrDefaultAsync(p => p.Id == id);
        if (policy == null) return null;

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
        policy.Version = $"p-{policy.UpdatedAt:yyyyMMddHHmmss}";

        await _db.SaveChangesAsync();
        return MapToResponse(policy);
    }

    public async Task<List<PolicyVersionResponse>> GetVersionsAsync()
    {
        // Simulate versioning by returning policy update history
        var policies = await _db.SecurityPolicies
            .Include(p => p.Department)
            .OrderByDescending(p => p.UpdatedAt)
            .ToListAsync();

        return policies.Select(p => new PolicyVersionResponse
        {
            Id = p.Id,
            Version = $"p-{p.UpdatedAt:yyyyMMddHHmm}",
            UpdatedBy = "security.admin@company.com",
            UpdatedAt = p.UpdatedAt,
            Reason = $"Policy update for {p.Department?.Name ?? "Global"}"
        }).ToList();
    }

    public async Task<bool> RollbackAsync(Guid id)
    {
        var policy = await _db.SecurityPolicies.FindAsync(id);
        if (policy == null) return false;

        // Reset to defaults
        policy.SensitivityThreshold = 70;
        policy.LowAction = "Allow";
        policy.MediumAction = "Mask";
        policy.HighAction = "PendingApproval";
        policy.CriticalAction = "Block";
        policy.UpdatedAt = DateTime.UtcNow;

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
