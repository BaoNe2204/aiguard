using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using aiguard_api.DTOs.Audit;
using aiguard_api.DTOs.Common;
using aiguard_api.Services;

namespace aiguard_api.Controllers;

[ApiController]
[Route("api/audit")]
[Authorize(Roles = "SecurityAdmin,TenantOwner")]
public class AuditController : ControllerBase
{
    private readonly IAuditLogService _auditService;

    public AuditController(IAuditLogService auditService) => _auditService = auditService;

    /// <summary>Get paginated audit logs</summary>
    [HttpGet("logs")]
    public async Task<IActionResult> GetLogs([FromQuery] PagedQuery query, [FromQuery] string? eventType, [FromQuery] string? riskLevel, [FromQuery] string? actorType)
    {
        var result = await _auditService.GetLogsAsync(query, eventType, riskLevel, actorType);
        return Ok(ApiResponse<PagedResult<AuditLogResponse>>.Ok(result));
    }
}
