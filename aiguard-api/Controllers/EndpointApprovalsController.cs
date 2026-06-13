using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using aiguard_api.DTOs.Approvals;
using aiguard_api.DTOs.Common;
using aiguard_api.Services;

namespace aiguard_api.Controllers;

[ApiController]
[Route("api/endpoints/approvals")]
[AllowAnonymous]
public class EndpointApprovalsController : ControllerBase
{
    private readonly IApprovalService _approvals;
    private readonly IEndpointSecurityService _endpointSecurity;
    public EndpointApprovalsController(IApprovalService approvals, IEndpointSecurityService endpointSecurity)
    {
        _approvals = approvals;
        _endpointSecurity = endpointSecurity;
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetStatus(Guid id, [FromQuery] string hostname)
    {
        var endpointKey = Request.Headers["X-Endpoint-Key"].FirstOrDefault();
        var device = await _endpointSecurity.GetAuthenticatedDeviceAsync(hostname, endpointKey);
        if (device == null) return Unauthorized(ApiResponse<object>.Fail("Invalid endpoint credentials"));
        var approval = await _approvals.GetByIdAsync(id);
        if (approval == null || !string.Equals(approval.RequestedByUserEmail, device.UserEmail, StringComparison.OrdinalIgnoreCase))
            return NotFound(ApiResponse<object>.Fail("Approval not found"));
        return Ok(ApiResponse<ApprovalResponse>.Ok(approval));
    }
}
