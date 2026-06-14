using Microsoft.EntityFrameworkCore;
using aiguard_api.Data;
using aiguard_api.DTOs.Saas;

namespace aiguard_api.Services;

public interface ILicenseEntitlementService
{
    Task<EntitlementResponse> GetCurrentAsync(string? tenantCode = null);
    Task EnsureCanAddUserAsync(string? tenantCode = null);
    Task EnsureCanEnrollDeviceAsync(string tenantCode);
    Task EnsureCanAddAgentAsync(string? tenantCode = null);
}

public class LicenseEntitlementService : ILicenseEntitlementService
{
    private readonly AiguardDbContext _db;
    private readonly IDataScopeContext _scope;

    public LicenseEntitlementService(AiguardDbContext db, IDataScopeContext scope)
    {
        _db = db;
        _scope = scope;
    }

    public async Task<EntitlementResponse> GetCurrentAsync(string? tenantCode = null)
    {
        var code = string.IsNullOrWhiteSpace(tenantCode) ? _scope.TenantCode : tenantCode.Trim().ToUpperInvariant();
        var now = DateTime.UtcNow;
        var license = await _db.TenantLicenses.IgnoreQueryFilters()
            .Where(x => x.TenantCode == code && x.Status == "Active" &&
                x.StartsAt <= now && x.ExpiresAt > now)
            .OrderByDescending(x => x.ExpiresAt)
            .FirstOrDefaultAsync();

        var subscription = await _db.Subscriptions.IgnoreQueryFilters()
            .Include(x => x.ProductPlan)
            .Where(x => x.TenantCode == code &&
                (x.Status == "Active" || x.Status == "Trial") &&
                x.CurrentPeriodEndsAt > now)
            .OrderByDescending(x => x.CurrentPeriodEndsAt)
            .FirstOrDefaultAsync();

        var usedUsers = await _db.Users.IgnoreQueryFilters().CountAsync(x => x.TenantCode == code && x.IsActive);
        var usedDevices = await _db.Devices.IgnoreQueryFilters().CountAsync(x =>
            x.TenantCode == code && !x.IsRemoteDisabled && !x.EndpointKeyRevoked);
        var usedAgents = await _db.Agents.IgnoreQueryFilters().CountAsync(x => x.TenantCode == code && x.IsEnabled);

        var userLimit = license?.UserLimit ?? subscription?.UserLimit ?? 0;
        var deviceLimit = license?.DeviceLimit ?? subscription?.DeviceLimit ?? 0;
        var agentLimit = license?.AgentLimit ?? subscription?.AgentLimit ?? 0;
        return new EntitlementResponse
        {
            IsEntitled = license != null || subscription != null,
            Status = license?.Status ?? subscription?.Status ?? "Unlicensed",
            PlanName = subscription?.ProductPlan.Name,
            UserLimit = userLimit,
            DeviceLimit = deviceLimit,
            AgentLimit = agentLimit,
            UsedUsers = usedUsers,
            UsedDevices = usedDevices,
            UsedAgents = usedAgents,
            ExpiresAt = license?.ExpiresAt ?? subscription?.CurrentPeriodEndsAt
        };
    }

    public async Task EnsureCanAddUserAsync(string? tenantCode = null)
    {
        var entitlement = await GetCurrentAsync(tenantCode);
        EnsureAvailable(entitlement, entitlement.UsedUsers, entitlement.UserLimit, "user");
    }

    public async Task EnsureCanEnrollDeviceAsync(string tenantCode)
    {
        var entitlement = await GetCurrentAsync(tenantCode);
        EnsureAvailable(entitlement, entitlement.UsedDevices, entitlement.DeviceLimit, "device");
    }

    public async Task EnsureCanAddAgentAsync(string? tenantCode = null)
    {
        var entitlement = await GetCurrentAsync(tenantCode);
        EnsureAvailable(entitlement, entitlement.UsedAgents, entitlement.AgentLimit, "AI agent");
    }

    private static void EnsureAvailable(EntitlementResponse entitlement, int used, int limit, string resource)
    {
        if (!entitlement.IsEntitled)
            throw new InvalidOperationException("Tenant does not have an active subscription or license.");
        if (limit <= 0 || used >= limit)
            throw new InvalidOperationException($"The licensed {resource} limit has been reached ({used}/{limit}).");
    }
}
