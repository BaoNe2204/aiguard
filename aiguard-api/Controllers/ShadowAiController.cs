using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using aiguard_api.DTOs.Common;
using aiguard_api.DTOs.Endpoints;
using aiguard_api.Services;
using aiguard_api.Hubs;
using Microsoft.AspNetCore.SignalR;

namespace aiguard_api.Controllers;

[ApiController]
[Route("api/endpoints/shadow-ai")]
[Authorize(Roles = "DepartmentManager,SecurityAdmin,TenantOwner")]
public class ShadowAiController : ControllerBase
{
    private readonly IShadowAiService _shadowAi;
    private readonly IEndpointSecurityService _security;
    private readonly IHubContext<NotificationHub> _hub;

    public ShadowAiController(
        IShadowAiService shadowAi,
        IEndpointSecurityService security,
        IHubContext<NotificationHub> hub)
    {
        _shadowAi = shadowAi;
        _security = security;
        _hub = hub;
    }

    [HttpGet]
    public async Task<IActionResult> GetDiscoveries([FromQuery] PagedQuery query, [FromQuery] bool? approved) =>
        Ok(ApiResponse<PagedResult<ShadowAiDiscoveryResponse>>.Ok(
            await _shadowAi.GetDiscoveriesAsync(query, approved)));

    [HttpGet("policy")]
    [AllowAnonymous]
    public async Task<IActionResult> GetPolicy(
        [FromQuery] string hostname,
        [FromHeader(Name = "X-Endpoint-Key")] string? endpointKey)
    {
        var device = await _security.GetAuthenticatedDeviceAsync(hostname, endpointKey);
        if (device == null) return Unauthorized(ApiResponse<object>.Fail("Invalid endpoint credentials"));
        return Ok(ApiResponse<EndpointAiPolicyResponse>.Ok(await _shadowAi.GetPolicyAsync()));
    }

    [HttpPost("discover")]
    [AllowAnonymous]
    public async Task<IActionResult> Discover(
        [FromBody] ShadowAiDiscoverRequest request,
        [FromHeader(Name = "X-Endpoint-Key")] string? endpointKey)
    {
        var device = await _security.GetAuthenticatedDeviceAsync(request.Hostname, endpointKey);
        if (device == null) return Unauthorized(ApiResponse<object>.Fail("Invalid endpoint credentials"));
        if (device.IsQuarantined || device.IsRemoteDisabled)
            return StatusCode(StatusCodes.Status423Locked, ApiResponse<object>.Fail("Device protection is locked"));
        var result = await _shadowAi.DiscoverAsync(device, request);
        if (!result.IsApproved)
        {
            await _hub.Clients.Group(NotificationGroups.Role(device.TenantCode, "SecurityAdmin")).SendAsync("EmergencyAlert", new
            {
                type = "ShadowAI",
                result.Domain,
                result.Hostname,
                result.UserEmail,
                result.Decision
            });
            await _hub.Clients.Group(NotificationGroups.Role(device.TenantCode, "TenantOwner")).SendAsync("EmergencyAlert", new
            {
                type = "ShadowAI",
                result.Domain,
                result.Hostname,
                result.UserEmail,
                result.Decision
            });
        }
        return Ok(ApiResponse<ShadowAiDiscoveryResponse>.Ok(result));
    }
}
