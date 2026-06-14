using Microsoft.EntityFrameworkCore;
using aiguard_api.Data;
using aiguard_api.DTOs.Endpoints;
using aiguard_api.Models;

namespace aiguard_api.Services;

public interface IDeploymentService
{
    Task<DeploymentTokenResponse> GetActiveTokenInfoAsync();
    Task<DeploymentTokenResponse> RotateTokenAsync(string tenantCode);
    Task<EnrollDeviceResponse?> EnrollAsync(EnrollDeviceRequest request);
}

public class DeploymentService : IDeploymentService
{
    private readonly AiguardDbContext _db;
    private readonly IEndpointSecurityService _security;
    private readonly IDataScopeContext _scope;
    private readonly ILicenseEntitlementService _entitlements;

    public DeploymentService(
        AiguardDbContext db,
        IEndpointSecurityService security,
        IDataScopeContext scope,
        ILicenseEntitlementService entitlements)
    {
        _db = db;
        _security = security;
        _scope = scope;
        _entitlements = entitlements;
    }

    public async Task<DeploymentTokenResponse> GetActiveTokenInfoAsync()
    {
        var token = await _db.EnrollmentTokens
            .Where(t => !t.IsRevoked && t.ExpiresAt > DateTime.UtcNow)
            .OrderByDescending(t => t.CreatedAt)
            .FirstOrDefaultAsync();

        if (token == null)
            return await RotateTokenAsync(_scope.TenantCode);

        return MapToken(token, null);
    }

    public async Task<DeploymentTokenResponse> RotateTokenAsync(string tenantCode)
    {
        var normalizedTenant = string.IsNullOrWhiteSpace(tenantCode)
            ? _scope.TenantCode
            : tenantCode.Trim().ToUpperInvariant();
        if (!_scope.IsPlatformAdmin && normalizedTenant != _scope.TenantCode)
            throw new UnauthorizedAccessException();
        var activeTokens = await _db.EnrollmentTokens.Where(t => !t.IsRevoked).ToListAsync();
        foreach (var active in activeTokens) active.IsRevoked = true;

        var rawToken = _security.GenerateSecret();
        var token = new EnrollmentToken
        {
            TenantCode = normalizedTenant,
            TokenHash = _security.HashSecret(rawToken),
            ExpiresAt = DateTime.UtcNow.AddHours(24)
        };
        _db.EnrollmentTokens.Add(token);
        await _db.SaveChangesAsync();
        return MapToken(token, rawToken);
    }

    public async Task<EnrollDeviceResponse?> EnrollAsync(EnrollDeviceRequest request)
    {
        var tokenHash = _security.HashSecret(request.EnrollmentToken);
        var token = await _db.EnrollmentTokens.FirstOrDefaultAsync(t =>
            t.TokenHash == tokenHash && !t.IsRevoked && t.ExpiresAt > DateTime.UtcNow);
        if (token == null) return null;
        _scope.SetEndpointScope(token.TenantCode, null);

        var endpointKey = _security.GenerateSecret();
        var device = await _db.Devices.FirstOrDefaultAsync(d =>
            d.Hostname == request.Hostname && d.TenantCode == token.TenantCode);
        if (device == null)
        {
            await _entitlements.EnsureCanEnrollDeviceAsync(token.TenantCode);
            device = new Device { Hostname = request.Hostname };
            _db.Devices.Add(device);
        }

        device.UserEmail = request.UserEmail.Trim().ToLowerInvariant();
        var enrolledUser = await _db.Users.Include(u => u.Department)
            .FirstOrDefaultAsync(u => u.Email == device.UserEmail && u.IsActive);
        if (enrolledUser == null) return null;
        device.DepartmentId = enrolledUser.DepartmentId;
        device.DepartmentName = enrolledUser.Department?.Name ?? request.DepartmentName.Trim();
        device.AgentVersion = request.AgentVersion;
        device.ExtensionVersion = request.ExtensionVersion;
        device.ExtensionActive = !string.IsNullOrWhiteSpace(request.ExtensionVersion);
        device.EndpointKeyHash = _security.HashSecret(endpointKey);
        device.EnrolledAt = DateTime.UtcNow;
        device.LastSeen = DateTime.UtcNow;
        device.RiskStatus = "Safe";
        device.TenantCode = token.TenantCode;
        device.EndpointKeyRevoked = false;
        device.EndpointKeyVersion++;
        device.EndpointKeyRotatedAt = DateTime.UtcNow;
        var policy = await _db.SecurityPolicies
            .Include(p => p.Department)
            .Where(p => p.IsActive && p.Department != null && p.Department.Name == device.DepartmentName)
            .FirstOrDefaultAsync();
        device.PolicyVersion = policy?.Version ?? "1.0.0";

        await _db.SaveChangesAsync();

        return new EnrollDeviceResponse
        {
            DeviceId = device.Id,
            EndpointKey = endpointKey,
            PolicyVersion = device.PolicyVersion,
            EnrolledAt = device.EnrolledAt.Value
        };
    }

    private static DeploymentTokenResponse MapToken(EnrollmentToken token, string? rawToken) => new()
    {
        TokenId = token.Id,
        Token = rawToken,
        TenantCode = token.TenantCode,
        CreatedAt = token.CreatedAt,
        ExpiresAt = token.ExpiresAt,
        InstallCommand = rawToken == null
            ? "Rotate the enrollment token to generate a new install command."
            : $"AIGuardAgentSetup.exe /tenant {token.TenantCode} /token \"{rawToken}\" /silent"
    };
}
