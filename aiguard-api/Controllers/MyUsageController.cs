using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using aiguard_api.DTOs.Approvals;
using aiguard_api.DTOs.Common;
using aiguard_api.DTOs.Endpoints;
using aiguard_api.Services;

namespace aiguard_api.Controllers;

[ApiController]
[Route("api/my-usage")]
[Authorize]
public class MyUsageController : ControllerBase
{
    private readonly IEndpointEventService _events;
    private readonly IApprovalService _approvals;

    public MyUsageController(IEndpointEventService events, IApprovalService approvals)
    {
        _events = events;
        _approvals = approvals;
    }

    [HttpGet("events")]
    public async Task<IActionResult> GetEvents([FromQuery] PagedQuery query)
    {
        var email = User.FindFirstValue(ClaimTypes.Email) ?? User.FindFirstValue("email");
        if (string.IsNullOrWhiteSpace(email)) return Unauthorized(ApiResponse<object>.Fail("Email claim is missing"));
        var result = await _events.GetEventsAsync(query, null, null, email);
        return Ok(ApiResponse<PagedResult<EndpointEventResponse>>.Ok(result));
    }

    [HttpGet("approvals")]
    public async Task<IActionResult> GetApprovals([FromQuery] PagedQuery query)
    {
        var email = User.FindFirstValue(ClaimTypes.Email) ?? User.FindFirstValue("email");
        if (string.IsNullOrWhiteSpace(email)) return Unauthorized(ApiResponse<object>.Fail("Email claim is missing"));
        var result = await _approvals.GetForUserAsync(query, email);
        return Ok(ApiResponse<PagedResult<ApprovalResponse>>.Ok(result));
    }
}
