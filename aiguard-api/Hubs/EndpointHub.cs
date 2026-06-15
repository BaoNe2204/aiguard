using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using aiguard_api.Data;
using aiguard_api.Models;
using aiguard_api.Services;

namespace aiguard_api.Hubs;

/// <summary>
/// Bidirectional SignalR Hub for browser extensions.
///
/// Extension connects with endpointKey auth (query string).
/// Flow:
///   Extension → Backend: SendDlpEvent(), SendHeartbeat()
///   Backend → Extension: ApprovalDecided, PolicyUpdated, EmergencyAlert, ExtensionCommand
///   Backend → Frontend: ExtensionDlpEvent, ExtensionOnline, ExtensionOffline
/// </summary>
[AllowAnonymous]
public class EndpointHub : Hub
{
    private readonly AiguardDbContext _db;
    private readonly IDataScopeContext _scope;
    private readonly IHubContext<NotificationHub> _notificationHub;

    public EndpointHub(
        AiguardDbContext db,
        IDataScopeContext scope,
        IHubContext<NotificationHub> notificationHub)
    {
        _db = db;
        _scope = scope;
        _notificationHub = notificationHub;
    }

    public override async Task OnConnectedAsync()
    {
        var device = await AuthenticateDeviceAsync();
        if (device == null)
        {
            Context.Abort();
            return;
        }

        _scope.SetEndpointScope(device.TenantCode, device.DepartmentId);
        Context.Items["Device"] = device;

        var groupName = NotificationGroups.Device(device.TenantCode, device.Id);
        await Groups.AddToGroupAsync(Context.ConnectionId, groupName);

        await Clients.Caller.SendAsync("Connected", new
        {
            connectionId = Context.ConnectionId,
            deviceId = device.Id,
            hostname = device.Hostname,
            tenantCode = device.TenantCode
        });

        // Notify frontend: extension is online
        await _notificationHub.Clients
            .Group(NotificationGroups.Tenant(device.TenantCode))
            .SendAsync("ExtensionOnline", new
            {
                deviceId = device.Id,
                hostname = device.Hostname,
                userEmail = device.UserEmail,
                extensionVersion = device.ExtensionVersion,
                connectedAt = DateTime.UtcNow
            });

        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        if (Context.Items.TryGetValue("Device", out var deviceObj) && deviceObj is Device device)
        {
            await _notificationHub.Clients
                .Group(NotificationGroups.Tenant(device.TenantCode))
                .SendAsync("ExtensionOffline", new
                {
                    deviceId = device.Id,
                    hostname = device.Hostname,
                    userEmail = device.UserEmail,
                    disconnectedAt = DateTime.UtcNow
                });
        }
        await base.OnDisconnectedAsync(exception);
    }

    /// <summary>Extension pushes a DLP event to backend in real-time.</summary>
    public async Task SendDlpEvent(object eventPayload)
    {
        var device = Context.Items.TryGetValue("Device", out var d) ? d as Device : null;
        if (device == null) return;

        if (eventPayload is System.Text.Json.JsonElement elem)
        {
            await _notificationHub.Clients
                .Group(NotificationGroups.Tenant(device.TenantCode))
                .SendAsync("ExtensionDlpEvent", new
                {
                    deviceId = device.Id,
                    hostname = device.Hostname,
                    userEmail = device.UserEmail,
                    websiteAi = elem.GetProperty("websiteAi").GetString(),
                    eventType = elem.GetProperty("eventType").GetString(),
                    riskScore = elem.TryGetProperty("riskScore", out var rs) ? rs.GetInt32() : 0,
                    riskLevel = elem.TryGetProperty("riskLevel", out var rl) ? rl.GetString() : "",
                    dataTypeMatched = elem.TryGetProperty("dataTypeMatched", out var dtm) ? dtm.GetString() : "",
                    decision = elem.TryGetProperty("decision", out var dec) ? dec.GetString() : "",
                    createdAt = DateTime.UtcNow
                });
        }
    }

    /// <summary>Extension sends heartbeat / telemetry.</summary>
    public async Task SendHeartbeat(object payload)
    {
        var device = Context.Items.TryGetValue("Device", out var d) ? d as Device : null;
        if (device == null) return;

        if (payload is System.Text.Json.JsonElement elem)
        {
            device.ExtensionLastSeenAt = DateTime.UtcNow;
            if (elem.TryGetProperty("extensionActive", out var ea))
                device.ExtensionActive = ea.GetBoolean();
            if (elem.TryGetProperty("policyVersion", out var pv) && pv.ValueKind == System.Text.Json.JsonValueKind.String)
                device.PolicyVersion = pv.GetString() ?? device.PolicyVersion;
            await _db.SaveChangesAsync();

            await _notificationHub.Clients
                .Group(NotificationGroups.Tenant(device.TenantCode))
                .SendAsync("ExtensionHeartbeat", new
                {
                    deviceId = device.Id,
                    hostname = device.Hostname,
                    heartbeatAt = DateTime.UtcNow
                });
        }
    }

    private async Task<Device?> AuthenticateDeviceAsync()
    {
        var endpointKey = Context.GetHttpContext()?.Request.Query["access_token"].FirstOrDefault();
        var hostname = Context.GetHttpContext()?.Request.Query["hostname"].FirstOrDefault();

        if (string.IsNullOrWhiteSpace(endpointKey) || string.IsNullOrWhiteSpace(hostname))
            return null;

        var hash = HashSecret(endpointKey);
        var device = await _db.Devices
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(d =>
                d.Hostname == hostname &&
                d.EndpointKeyHash == hash &&
                !d.EndpointKeyRevoked);

        return device;
    }

    private static string HashSecret(string secret)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(secret));
        return Convert.ToHexStringLower(bytes);
    }
}
