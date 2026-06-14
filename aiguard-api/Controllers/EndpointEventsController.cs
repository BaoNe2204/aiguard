using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using aiguard_api.DTOs.Common;
using aiguard_api.DTOs.Endpoints;
using aiguard_api.Services;

namespace aiguard_api.Controllers;

[ApiController]
[Route("api/endpoints/events")]
[Authorize(Roles = "DepartmentManager,SecurityAdmin,TenantOwner")]
public class EndpointEventsController : ControllerBase
{
    private readonly IEndpointEventService _eventService;

    public EndpointEventsController(IEndpointEventService eventService) => _eventService = eventService;

    /// <summary>Get paginated endpoint DLP events</summary>
    [HttpGet]
    public async Task<IActionResult> GetEvents([FromQuery] PagedQuery query, [FromQuery] string? riskLevel, [FromQuery] string? decision, [FromQuery] string? userEmail)
    {
        var result = await _eventService.GetEventsAsync(query, riskLevel, decision, userEmail);
        return Ok(ApiResponse<PagedResult<EndpointEventResponse>>.Ok(result));
    }

    /// <summary>Create a new endpoint event (called by Browser Extension)</summary>
    [HttpPost]
    [AllowAnonymous]
    public async Task<IActionResult> CreateEvent(
        [FromBody] CreateEndpointEventRequest request,
        [FromHeader(Name = "X-Endpoint-Key")] string? endpointKey,
        [FromServices] IEndpointSecurityService endpointSecurity)
    {
        var device = await endpointSecurity.GetAuthenticatedDeviceAsync(request.Hostname, endpointKey);
        if (device == null)
            return Unauthorized(ApiResponse<object>.Fail("Invalid endpoint credentials"));

        var result = await _eventService.CreateEventAsync(request, device);
        if (result == null) return BadRequest(ApiResponse<object>.Fail("Invalid, expired, reused, or mismatched scan receipt"));
        return Created($"/api/endpoints/events/{result.Id}", ApiResponse<EndpointEventResponse>.Ok(result, "Event created"));
    }
}
