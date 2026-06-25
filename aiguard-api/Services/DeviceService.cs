using Microsoft.EntityFrameworkCore;
using aiguard_api.Data;
using aiguard_api.DTOs.Common;
using aiguard_api.DTOs.Endpoints;
using aiguard_api.Models;

namespace aiguard_api.Services;

public interface IDeviceService
{
    Task<PagedResult<DeviceResponse>> GetDevicesAsync(PagedQuery query);
    Task<DeviceResponse?> GetDeviceByIdAsync(Guid id);
    Task<bool> SyncPolicyAsync(Guid id);
    Task<DeviceResponse> HeartbeatAsync(HeartbeatRequest request);
    Task<RotateEndpointKeyResponse?> RotateEndpointKeyAsync(Guid id);
    Task<bool> RevokeEndpointKeyAsync(Guid id);
    Task<DeviceResponse?> QuarantineAsync(Guid id, string reason);
    Task<DeviceResponse?> ReleaseQuarantineAsync(Guid id);
    Task<DeviceResponse?> SetRemoteDisabledAsync(Guid id, bool disabled, string reason);
    Task<bool> DeleteDeviceAsync(Guid id);
    Task<DeviceCustomSettingsResponse?> GetCustomSettingsAsync(Guid id);
    Task<DeviceCustomSettingsResponse?> UpdateCustomSettingsAsync(Guid id, DeviceCustomSettingsRequest request);
}

public class DeviceService : IDeviceService
{
    private readonly AiguardDbContext _db;

    private readonly IEndpointSecurityService _security;
    public DeviceService(AiguardDbContext db, IEndpointSecurityService security)
    {
        _db = db;
        _security = security;
    }

    public async Task<RotateEndpointKeyResponse?> RotateEndpointKeyAsync(Guid id)
    {
        var device = await _db.Devices.FindAsync(id);
        if (device == null) return null;
        var rawKey = _security.GenerateSecret();
        device.EndpointKeyHash = _security.HashSecret(rawKey);
        device.EndpointKeyRevoked = false;
        device.EndpointKeyVersion++;
        device.EndpointKeyRotatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return new RotateEndpointKeyResponse
        {
            DeviceId = device.Id, EndpointKey = rawKey,
            KeyVersion = device.EndpointKeyVersion, RotatedAt = device.EndpointKeyRotatedAt.Value
        };
    }

    public async Task<bool> RevokeEndpointKeyAsync(Guid id)
    {
        var device = await _db.Devices.FindAsync(id);
        if (device == null) return false;
        device.EndpointKeyRevoked = true;
        device.EndpointKeyHash = null;
        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<DeviceResponse?> QuarantineAsync(Guid id, string reason)
    {
        var device = await _db.Devices.FindAsync(id);
        if (device == null) return null;
        device.IsQuarantined = true;
        device.QuarantineReason = reason;
        device.QuarantinedAt = DateTime.UtcNow;
        device.RiskStatus = "Critical";
        await _db.SaveChangesAsync();
        return MapToResponse(device);
    }

    public async Task<DeviceResponse?> ReleaseQuarantineAsync(Guid id)
    {
        var device = await _db.Devices.FindAsync(id);
        if (device == null) return null;
        device.IsQuarantined = false;
        device.QuarantineReason = null;
        device.QuarantinedAt = null;
        device.RiskStatus = "Safe";
        await _db.SaveChangesAsync();
        return MapToResponse(device);
    }

    public async Task<DeviceResponse?> SetRemoteDisabledAsync(Guid id, bool disabled, string reason)
    {
        var device = await _db.Devices.FindAsync(id);
        if (device == null) return null;
        device.IsRemoteDisabled = disabled;
        if (disabled)
        {
            device.QuarantineReason = reason;
            device.RiskStatus = "Critical";
        }
        await _db.SaveChangesAsync();
        return MapToResponse(device);
    }

    public async Task<PagedResult<DeviceResponse>> GetDevicesAsync(PagedQuery query)
    {
        var q = _db.Devices.AsQueryable();

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var s = query.Search.ToLower();
            q = q.Where(d => d.Hostname.ToLower().Contains(s)
                || d.UserEmail.ToLower().Contains(s)
                || d.DepartmentName.ToLower().Contains(s));
        }

        q = query.SortBy?.ToLower() switch
        {
            "hostname" => query.SortDesc ? q.OrderByDescending(d => d.Hostname) : q.OrderBy(d => d.Hostname),
            "lastseen" => query.SortDesc ? q.OrderByDescending(d => d.LastSeen) : q.OrderBy(d => d.LastSeen),
            "riskstatus" => query.SortDesc ? q.OrderByDescending(d => d.RiskStatus) : q.OrderBy(d => d.RiskStatus),
            _ => q.OrderByDescending(d => d.LastSeen)
        };

        var total = await q.CountAsync();
        var items = await q
            .Skip((query.Page - 1) * query.PageSize)
            .Take(query.PageSize)
            .Select(d => MapToResponse(d))
            .ToListAsync();

        return new PagedResult<DeviceResponse> { Items = items, TotalCount = total, Page = query.Page, PageSize = query.PageSize };
    }

    public async Task<DeviceResponse?> GetDeviceByIdAsync(Guid id)
    {
        var d = await _db.Devices.FindAsync(id);
        return d == null ? null : MapToResponse(d);
    }

    public async Task<bool> SyncPolicyAsync(Guid id)
    {
        var device = await _db.Devices.FindAsync(id);
        if (device == null) return false;
        // In production: send SignalR message to device agent to sync policy
        // For now, just update the policy version timestamp
        device.PolicyVersion = $"p-{DateTime.UtcNow:yyyyMMdd}";
        device.LastPolicySyncAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<DeviceResponse> HeartbeatAsync(HeartbeatRequest request)
    {
        var device = await _db.Devices.FirstOrDefaultAsync(d => d.Hostname == request.Hostname);

        if (device == null)
        {
            device = new Device
            {
                Hostname = request.Hostname,
                UserEmail = "unknown",
                DepartmentName = "Unknown",
                AgentVersion = request.AgentVersion,
                ExtensionVersion = request.ExtensionVersion,
                ExtensionActive = request.ExtensionActive ?? false,
                PolicyVersion = request.PolicyVersion ?? "p-default",
                LastSeen = DateTime.UtcNow,
                RiskStatus = "Safe"
            };
            _db.Devices.Add(device);
        }
        else
        {
            device.LastSeen = DateTime.UtcNow;
            device.AgentVersion = request.AgentVersion ?? device.AgentVersion;
            device.ExtensionVersion = request.ExtensionVersion ?? device.ExtensionVersion;
            if (request.ExtensionActive.HasValue)
                device.ExtensionActive = request.ExtensionActive.Value;
            device.PolicyVersion = request.PolicyVersion ?? device.PolicyVersion;
            device.AgentStatus = request.AgentStatus ?? device.AgentStatus;
            if (request.ExtensionActive == true) device.ExtensionLastSeenAt = DateTime.UtcNow;
        }

        await _db.SaveChangesAsync();
        return MapToResponse(device);
    }

    private static DeviceResponse MapToResponse(Device d) => new()
    {
        Id = d.Id,
        Hostname = d.Hostname,
        UserEmail = d.UserEmail,
        DepartmentName = d.DepartmentName,
        AgentVersion = d.AgentVersion,
        ExtensionVersion = d.ExtensionVersion,
        ExtensionActive = d.ExtensionActive,
        PolicyVersion = d.PolicyVersion,
        LastSeen = d.LastSeen,
        RiskStatus = d.RiskStatus
        ,IsOnline = d.LastSeen >= DateTime.UtcNow.AddMinutes(-5)
        ,IsQuarantined = d.IsQuarantined
        ,IsRemoteDisabled = d.IsRemoteDisabled
        ,EndpointKeyRevoked = d.EndpointKeyRevoked
        ,QuarantineReason = d.QuarantineReason
        ,LastPolicySyncAt = d.LastPolicySyncAt
        ,AgentStatus = d.AgentStatus
    };

    public async Task<bool> DeleteDeviceAsync(Guid id)
    {
        var device = await _db.Devices.FindAsync(id);
        if (device == null) return false;

        _db.Devices.Remove(device);
        await _db.SaveChangesAsync();
        return true;
    }

    public Task<DeviceCustomSettingsResponse?> GetCustomSettingsAsync(Guid id)
    {
        return Task.FromResult<DeviceCustomSettingsResponse?>(new DeviceCustomSettingsResponse { DeviceId = id });
    }

    public Task<DeviceCustomSettingsResponse?> UpdateCustomSettingsAsync(Guid id, DeviceCustomSettingsRequest request)
    {
        return Task.FromResult<DeviceCustomSettingsResponse?>(new DeviceCustomSettingsResponse { DeviceId = id });
    }
}
