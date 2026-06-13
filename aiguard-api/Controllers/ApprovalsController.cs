using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using aiguard_api.DTOs.Approvals;
using aiguard_api.DTOs.Common;
using aiguard_api.Hubs;
using aiguard_api.Services;
using System.Security.Claims;

namespace aiguard_api.Controllers;

[ApiController]
[Route("api/approvals")]
[Authorize(Roles = "DepartmentManager,SecurityAdmin,SystemAdmin")]
public class ApprovalsController : ControllerBase
{
    private readonly IApprovalService _approvalService;
    private readonly IHubContext<NotificationHub> _hubContext;

    public ApprovalsController(IApprovalService approvalService, IHubContext<NotificationHub> hubContext)
    {
        _approvalService = approvalService;
        _hubContext = hubContext;
    }

    /// <summary>Get pending approvals</summary>
    [HttpGet("pending")]
    public async Task<IActionResult> GetPending([FromQuery] PagedQuery query, [FromQuery] string? requestType)
    {
        var result = await _approvalService.GetPendingAsync(query, requestType);
        return Ok(ApiResponse<PagedResult<ApprovalResponse>>.Ok(result));
    }

    /// <summary>Process an approval (Approve / Reject / ApproveWithMasking)</summary>
    [HttpPost("{id:guid}/action")]
    public async Task<IActionResult> ProcessApproval(Guid id, [FromBody] ApprovalActionRequest request)
    {
        var approverId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value ?? Guid.Empty.ToString());
        var result = await _approvalService.ProcessApprovalAsync(id, request, approverId);
        if (result == null) return NotFound(ApiResponse<object>.Fail("Approval not found or already processed"));

        // Send realtime notification to the requester
        await _hubContext.Clients.All.SendAsync("ApprovalDecided", new
        {
            approvalId = result.Id,
            status = result.Status,
            note = result.ApproverNote
        });

        return Ok(ApiResponse<ApprovalResponse>.Ok(result));
    }

    /// <summary>Get approval history</summary>
    [HttpGet("history")]
    public async Task<IActionResult> GetHistory([FromQuery] PagedQuery query)
    {
        var result = await _approvalService.GetHistoryAsync(query);
        return Ok(ApiResponse<PagedResult<ApprovalResponse>>.Ok(result));
    }

    [HttpPost("{id:guid}/revoke")]
    [Authorize]
    public async Task<IActionResult> Revoke(Guid id)
    {
        var email = User.FindFirstValue(ClaimTypes.Email) ?? User.FindFirstValue("email");
        if (string.IsNullOrWhiteSpace(email)) return Unauthorized(ApiResponse<object>.Fail("Email claim is missing"));
        var result = await _approvalService.RevokeAsync(id, email);
        if (result == null) return NotFound(ApiResponse<object>.Fail("Approval not found or cannot be revoked"));
        await _hubContext.Clients.All.SendAsync("ApprovalRevoked", new { approvalId = result.Id });
        return Ok(ApiResponse<ApprovalResponse>.Ok(result));
    }
}
