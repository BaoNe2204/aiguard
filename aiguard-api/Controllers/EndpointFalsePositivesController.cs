using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using aiguard_api.DTOs.Common;
using aiguard_api.DTOs.Governance;
using aiguard_api.Hubs;
using aiguard_api.Services;

namespace aiguard_api.Controllers;

[ApiController]
[Route("api/endpoints/false-positives")]
[AllowAnonymous]
public class EndpointFalsePositivesController : ControllerBase
{
    private readonly IGovernanceService _governance;
    private readonly IEndpointSecurityService _endpointSecurity;
    private readonly IHubContext<NotificationHub> _hub;

    public EndpointFalsePositivesController(
        IGovernanceService governance,
        IEndpointSecurityService endpointSecurity,
        IHubContext<NotificationHub> hub)
    {
        _governance = governance;
        _endpointSecurity = endpointSecurity;
        _hub = hub;
    }

    [HttpPost]
    public async Task<IActionResult> Create(
        [FromQuery] string hostname,
        [FromBody] FalsePositiveCreateRequest request)
    {
        var endpointKey = Request.Headers["X-Endpoint-Key"].FirstOrDefault();
        var device = await _endpointSecurity.GetAuthenticatedDeviceAsync(hostname, endpointKey);
        if (device == null) return Unauthorized(ApiResponse<object>.Fail("Invalid endpoint credentials"));
        var result = await _governance.CreateFalsePositiveAsync(request, device.UserEmail);
        if (result == null) return NotFound(ApiResponse<object>.Fail("Endpoint event not found for this device user"));
        await _governance.CreateNotificationAsync(
            "FalsePositive", "New false-positive report",
            $"{device.UserEmail} reported detector {result.DetectorName}.",
            "/app/governance/false-positives", recipientRole: "SecurityAdmin",
            departmentId: device.DepartmentId);
        await _hub.Clients.All.SendAsync("FalsePositiveSubmitted", result);
        return StatusCode(StatusCodes.Status201Created, ApiResponse<FalsePositiveResponse>.Ok(result));
    }
}
