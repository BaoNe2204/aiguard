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
    private readonly IDataScopeContext _scope;

    public EndpointApprovalsController(IApprovalService approvals, IEndpointSecurityService endpointSecurity, IDataScopeContext scope)
    {
        _approvals = approvals;
        _endpointSecurity = endpointSecurity;
        _scope = scope;
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetStatus(Guid id, [FromQuery] string hostname)
    {
        var endpointKey = Request.Headers["X-Endpoint-Key"].FirstOrDefault();
        var device = await _endpointSecurity.GetAuthenticatedDeviceAsync(hostname, endpointKey);
        if (device == null) return Unauthorized(ApiResponse<object>.Fail("Invalid endpoint credentials"));
        
        _scope.SetEndpointScope(device.TenantCode, device.DepartmentId);
        
        var approval = await _approvals.GetByIdAsync(id);
        if (approval == null || !string.Equals(approval.RequestedByUserEmail, device.UserEmail, StringComparison.OrdinalIgnoreCase))
            return NotFound(ApiResponse<object>.Fail("Approval not found"));
        return Ok(ApiResponse<ApprovalResponse>.Ok(approval));
    }

    [HttpPost("request")]
    public async Task<IActionResult> RequestApproval([FromQuery] string hostname, [FromBody] DesktopAppApprovalRequest request)
    {
        var endpointKey = Request.Headers["X-Endpoint-Key"].FirstOrDefault();
        var device = await _endpointSecurity.GetAuthenticatedDeviceAsync(hostname, endpointKey);
        if (device == null) return Unauthorized(ApiResponse<object>.Fail("Invalid endpoint credentials"));

        _scope.SetEndpointScope(device.TenantCode, device.DepartmentId);

        // We use AgentAction as the request type so it shows up in "Duyệt Agent" tab.
        // We pack the AppName into business justification or a dummy AgentActionLog if needed,
        // but simplest is just passing it. To allow whitelisting, we need to store AppName.
        // We'll pack the AppName into Reason and BusinessJustification.
        string justification = $"[DesktopApp:{request.AppName}] {request.Reason}";

        var approval = await _approvals.CreateApprovalAsync(
            "AgentAction", 
            null, 
            null, 
            device.UserEmail, 
            justification);

        return Ok(ApiResponse<ApprovalResponse>.Ok(approval));
    }
}
