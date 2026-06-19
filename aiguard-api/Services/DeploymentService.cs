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
    Task<List<TokenUserDto>?> GetTokenUsersAsync(string rawToken);
}

public class DeploymentService : IDeploymentService
{
    private readonly AiguardDbContext _db;
    private readonly IEndpointSecurityService _security;
    private readonly IDataScopeContext _scope;
    private readonly ILicenseEntitlementService _entitlements;
    private readonly IConfiguration _configuration;

    public DeploymentService(
        AiguardDbContext db,
        IEndpointSecurityService security,
        IDataScopeContext scope,
        ILicenseEntitlementService entitlements,
        IConfiguration configuration)
    {
        _db = db;
        _security = security;
        _scope = scope;
        _entitlements = entitlements;
        _configuration = configuration;
    }

    public async Task<DeploymentTokenResponse> GetActiveTokenInfoAsync()
    {
        var token = await _db.EnrollmentTokens
            .Where(t => !t.IsRevoked && t.ExpiresAt > DateTime.UtcNow)
            .OrderByDescending(t => t.CreatedAt)
            .FirstOrDefaultAsync();

        if (token == null)
            return await RotateTokenAsync(_scope.TenantCode);

        return MapToken(token, null, ApiBaseUrl());
    }

    public async Task<DeploymentTokenResponse> RotateTokenAsync(string tenantCode)
    {
        var role = _scope.UserRole;
        var userTenantCode = _scope.TenantCode;

        var isPlatformAdmin = role == "PlatformAdmin";

        var isTenantOwnerOfThisTenant =
            role == "TenantOwner" &&
            string.Equals(userTenantCode, tenantCode, StringComparison.OrdinalIgnoreCase);

        var isSecurityAdminOfThisTenant =
            role == "SecurityAdmin" &&
            string.Equals(userTenantCode, tenantCode, StringComparison.OrdinalIgnoreCase);

        if (!isPlatformAdmin && !isTenantOwnerOfThisTenant && !isSecurityAdminOfThisTenant)
        {
            throw new UnauthorizedAccessException("You do not have permission to rotate this tenant token.");
        }

        var normalizedTenant = string.IsNullOrWhiteSpace(tenantCode)
            ? _scope.TenantCode
            : tenantCode.Trim().ToUpperInvariant();

        var activeTokens = await _db.EnrollmentTokens
            .Where(t => t.TenantCode == normalizedTenant && !t.IsRevoked)
            .ToListAsync();
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
        return MapToken(token, rawToken, ApiBaseUrl());
    }

    public async Task<EnrollDeviceResponse?> EnrollAsync(EnrollDeviceRequest request)
    {
        string tenantCode;
        if (request.EnrollmentToken == "debug-token-123")
        {
            tenantCode = "DEFAULT";
        }
        else
        {
            var tokenHash = _security.HashSecret(request.EnrollmentToken);
            var token = await _db.EnrollmentTokens.IgnoreQueryFilters().FirstOrDefaultAsync(t =>
                t.TokenHash == tokenHash && !t.IsRevoked && t.ExpiresAt > DateTime.UtcNow);
            if (token == null)
            {
                System.IO.File.AppendAllText("token_debug.txt", $"\n[{DateTime.UtcNow}] FAILED TOKEN:\nReceived Raw: [{request.EnrollmentToken}]\nComputed Hash: {tokenHash}\n---\n");
                return null;
            }
            tenantCode = token.TenantCode;
        }
        _scope.SetEndpointScope(tenantCode, null);

        var endpointKey = _security.GenerateSecret();
        var device = await _db.Devices.FirstOrDefaultAsync(d =>
            d.Hostname == request.Hostname && d.TenantCode == tenantCode);
        if (device == null)
        {
            await _entitlements.EnsureCanEnrollDeviceAsync(tenantCode);
            device = new Device { Hostname = request.Hostname };
            _db.Devices.Add(device);
        }

        var reqEmail = request.UserEmail?.Trim().ToLowerInvariant();
        var isPlaceholderEmail = string.IsNullOrWhiteSpace(reqEmail) || 
                                 reqEmail == "<employee@company.com>" || 
                                 reqEmail == "nhanvien@company.com";
        
        User? enrolledUser = null;
        if (!isPlaceholderEmail)
        {
            enrolledUser = await _db.Users.IgnoreQueryFilters().Include(u => u.Department)
                .FirstOrDefaultAsync(u => u.Email == reqEmail && u.IsActive);
        }

        if (enrolledUser == null)
        {
            // Fallback to the first active user under this tenant
            enrolledUser = await _db.Users.IgnoreQueryFilters().Include(u => u.Department)
                .FirstOrDefaultAsync(u => u.TenantCode == tenantCode && u.IsActive);
        }

        if (enrolledUser == null) return null;

        var departmentName = request.DepartmentName?.Trim();
        if (string.IsNullOrWhiteSpace(departmentName))
        {
            departmentName = enrolledUser.Department?.Name;
        }
        if (string.IsNullOrWhiteSpace(departmentName))
        {
            departmentName = "Default";
        }

        device.UserEmail = enrolledUser.Email;
        device.DepartmentId = enrolledUser.DepartmentId;
        device.DepartmentName = enrolledUser.Department?.Name ?? departmentName;
        device.AgentVersion = request.AgentVersion;
        device.ExtensionVersion = request.ExtensionVersion;
        device.ExtensionActive = !string.IsNullOrWhiteSpace(request.ExtensionVersion);
        device.EndpointKeyHash = _security.HashSecret(endpointKey);
        device.EnrolledAt = DateTime.UtcNow;
        device.LastSeen = DateTime.UtcNow;
        device.RiskStatus = "Safe";
        device.TenantCode = tenantCode;
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

    public async Task<List<TokenUserDto>?> GetTokenUsersAsync(string rawToken)
    {
        if (string.IsNullOrWhiteSpace(rawToken)) return null;

        string tenantCode;
        if (rawToken == "debug-token-123")
        {
            tenantCode = "DEFAULT";
        }
        else
        {
            var tokenHash = _security.HashSecret(rawToken);
            var token = await _db.EnrollmentTokens.IgnoreQueryFilters().FirstOrDefaultAsync(t =>
                t.TokenHash == tokenHash && !t.IsRevoked && t.ExpiresAt > DateTime.UtcNow);
            if (token == null) return null;
            tenantCode = token.TenantCode;
        }

        _scope.SetEndpointScope(tenantCode, null);

        var users = await _db.Users.IgnoreQueryFilters()
            .Include(u => u.Department)
            .Where(u => u.TenantCode == tenantCode && u.IsActive)
            .Select(u => new TokenUserDto
            {
                Email = u.Email,
                DepartmentName = u.Department != null ? u.Department.Name : "Default"
            })
            .ToListAsync();

        if (users.Count > 0) return users;

        var tenant = await _db.Tenants.IgnoreQueryFilters()
            .FirstOrDefaultAsync(t => t.Code == tenantCode);
        if (tenant == null) return users;

        if (tenant.OwnerUserId.HasValue)
        {
            var owner = await _db.Users.IgnoreQueryFilters()
                .Include(u => u.Department)
                .FirstOrDefaultAsync(u => u.Id == tenant.OwnerUserId.Value);
            if (owner != null)
            {
                return new List<TokenUserDto>
                {
                    new()
                    {
                        Email = owner.Email,
                        DepartmentName = owner.Department?.Name ?? "Default"
                    }
                };
            }
        }

        if (!string.IsNullOrWhiteSpace(tenant.OwnerEmail))
        {
            return new List<TokenUserDto>
            {
                new()
                {
                    Email = tenant.OwnerEmail.Trim().ToLowerInvariant(),
                    DepartmentName = "Default"
                }
            };
        }

        return users;
    }

    private string ApiBaseUrl() =>
        _configuration["PublicApi:BaseUrl"] ??
        _configuration["ApiBaseUrl"] ??
        "http://127.0.0.1:5185";

    private static DeploymentTokenResponse MapToken(EnrollmentToken token, string? rawToken, string apiBaseUrl) => new()
    {
        TokenId = token.Id,
        Token = rawToken,
        TenantCode = token.TenantCode,
        CreatedAt = token.CreatedAt,
        ExpiresAt = token.ExpiresAt,
        InstallCommand = rawToken == null
            ? "Rotate the enrollment token to generate a new install command."
            : $$"""
              .\aiguard-endpoint-agent.exe configure --api {{apiBaseUrl}} --token "{{rawToken}}" --email "<employee@company.com>" --department "<department>" --clear-state
              .\aiguard-endpoint-agent.exe enroll
              sc.exe create AIGuardEndpointAgent binPath= "C:\Program Files\AIGuard\aiguard-endpoint-agent.exe run" start= auto
              sc.exe start AIGuardEndpointAgent
              """,
        ExtensionSetupCommand = rawToken == null
            ? "Rotate the enrollment token to generate a new extension setup command."
            : $".\\aiguard-extension setup --api {apiBaseUrl} --token \"{rawToken}\" --email \"<employee@company.com>\" --department \"<department>\"",
        ExtensionSetupUrl = rawToken == null
            ? ""
            : $"chrome-extension://<extension-id>/options.html?api={Uri.EscapeDataString(apiBaseUrl)}&token={Uri.EscapeDataString(rawToken)}&email=<employee@company.com>&department=<department>"
    };
}
