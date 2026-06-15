using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using aiguard_api.DTOs.Common;
using aiguard_api.Hubs;
using aiguard_api.Services;

namespace aiguard_api.Controllers;

[ApiController]
[Route("api/endpoints/commands")]
[Authorize(Roles = "SecurityAdmin,TenantOwner,PlatformAdmin")]
public class EndpointCommandsController : ControllerBase
{
    private readonly IHubContext<EndpointHub> _endpointHub;

    public EndpointCommandsController(IHubContext<EndpointHub> endpointHub)
    {
        _endpointHub = endpointHub;
    }

    /// <summary>Send a command to extensions (by device or all).</summary>
    [HttpPost("send")]
    public async Task<IActionResult> SendCommand([FromBody] ExtensionCommandRequest request)
    {
        var tenant = User.FindFirstValue("tenantCode") ?? "DEFAULT";
        var sentBy = User.FindFirstValue(ClaimTypes.Email) ?? User.FindFirstValue("email") ?? "admin";

        if (request.TargetType == "device" && request.DeviceId != Guid.Empty)
        {
            await _endpointHub.Clients
                .Group(NotificationGroups.Device(tenant, request.DeviceId))
                .SendAsync("ExtensionCommand", new
                {
                    commandId = Guid.NewGuid(),
                    command = request.Command,
                    payload = request.Payload,
                    sentBy,
                    sentAt = DateTime.UtcNow
                });
        }
        else
        {
            await _endpointHub.Clients
                .Group(NotificationGroups.Tenant(tenant))
                .SendAsync("ExtensionCommand", new
                {
                    commandId = Guid.NewGuid(),
                    command = request.Command,
                    payload = request.Payload,
                    sentBy,
                    sentAt = DateTime.UtcNow
                });
        }

        return Ok(ApiResponse<object>.Ok(new { message = "Command sent" }, "Command dispatched to extension"));
    }

    /// <summary>Broadcast a policy refresh command to extensions.</summary>
    [HttpPost("policy-refresh")]
    public async Task<IActionResult> RefreshPolicy([FromQuery] Guid? deviceId)
    {
        var tenant = User.FindFirstValue("tenantCode") ?? "DEFAULT";
        var triggeredBy = User.FindFirstValue(ClaimTypes.Email) ?? User.FindFirstValue("email") ?? "admin";

        if (deviceId.HasValue && deviceId.Value != Guid.Empty)
        {
            await _endpointHub.Clients
                .Group(NotificationGroups.Device(tenant, deviceId.Value))
                .SendAsync("PolicyRefresh", new
                {
                    commandId = Guid.NewGuid(),
                    triggeredBy,
                    triggeredAt = DateTime.UtcNow
                });
        }
        else
        {
            await _endpointHub.Clients
                .Group(NotificationGroups.Tenant(tenant))
                .SendAsync("PolicyRefresh", new
                {
                    commandId = Guid.NewGuid(),
                    triggeredBy,
                    triggeredAt = DateTime.UtcNow
                });
        }

        return Ok(ApiResponse<object>.Ok(new { message = "Policy refresh triggered" }));
    }

    /// <summary>Request immediate DLP scan from a specific extension.</summary>
    [HttpPost("request-scan")]
    public async Task<IActionResult> RequestScan([FromBody] ExtensionScanRequest request)
    {
        var tenant = User.FindFirstValue("tenantCode") ?? "DEFAULT";
        var requestedBy = User.FindFirstValue(ClaimTypes.Email) ?? User.FindFirstValue("email") ?? "admin";

        if (request.DeviceId == Guid.Empty)
            return BadRequest(ApiResponse<object>.Fail("DeviceId is required"));

        await _endpointHub.Clients
            .Group(NotificationGroups.Device(tenant, request.DeviceId))
            .SendAsync("RequestScan", new
            {
                scanId = Guid.NewGuid(),
                content = request.Content,
                websiteAi = request.WebsiteAi,
                requestedBy,
                requestedAt = DateTime.UtcNow
            });

        return Ok(ApiResponse<object>.Ok(new { message = "Scan request sent" }));
    }
}

public class ExtensionCommandRequest
{
    public string TargetType { get; set; } = "all"; // "all" or "device"
    public Guid DeviceId { get; set; }
    public string Command { get; set; } = string.Empty;
    public object? Payload { get; set; }
}

public class ExtensionScanRequest
{
    public Guid DeviceId { get; set; }
    public string? Content { get; set; }
    public string? WebsiteAi { get; set; }
}
