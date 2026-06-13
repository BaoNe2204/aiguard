using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using aiguard_api.DTOs.Common;
using aiguard_api.DTOs.Endpoints;
using aiguard_api.Services;

namespace aiguard_api.Controllers;

[ApiController]
[Route("api/endpoints/telemetry")]
[Authorize(Roles = "DepartmentManager,SecurityAdmin,SystemAdmin,Auditor")]
public class EndpointTelemetryController : ControllerBase
{
    private readonly IEndpointTelemetryService _telemetry;
    private readonly IEndpointSecurityService _security;

    public EndpointTelemetryController(
        IEndpointTelemetryService telemetry,
        IEndpointSecurityService security)
    {
        _telemetry = telemetry;
        _security = security;
    }

    [HttpGet]
    public async Task<IActionResult> Get([FromQuery] PagedQuery query, [FromQuery] string? category) =>
        Ok(ApiResponse<PagedResult<EndpointTelemetryResponse>>.Ok(
            await _telemetry.GetAsync(query, category)));

    [HttpPost]
    [AllowAnonymous]
    public async Task<IActionResult> Add(
        [FromBody] EndpointTelemetryBatchRequest request,
        [FromHeader(Name = "X-Endpoint-Key")] string? endpointKey)
    {
        var device = await _security.GetAuthenticatedDeviceAsync(request.Hostname, endpointKey);
        if (device == null) return Unauthorized(ApiResponse<object>.Fail("Invalid endpoint credentials"));
        var count = await _telemetry.AddAsync(device, request);
        return Ok(ApiResponse<object>.Ok(new { accepted = count }));
    }
}
