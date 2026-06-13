using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using aiguard_api.Services;

namespace aiguard_api.Controllers;

[ApiController]
[Route("api/reports")]
[Authorize(Roles = "DepartmentManager,SecurityAdmin,SystemAdmin,Auditor")]
public class ReportsController : ControllerBase
{
    private readonly IReportExportService _reports;

    public ReportsController(IReportExportService reports) => _reports = reports;

    [HttpGet("endpoint-events")]
    public async Task<IActionResult> ExportEndpointEvents(
        [FromQuery] string format = "xlsx",
        [FromQuery] DateTime? from = null,
        [FromQuery] DateTime? to = null,
        [FromQuery] Guid? departmentId = null,
        [FromQuery] string? riskLevel = null,
        CancellationToken cancellationToken = default)
    {
        var report = await _reports.ExportEndpointEventsAsync(
            format, from, to, departmentId, riskLevel, cancellationToken);
        return File(report.Content, report.ContentType, report.FileName);
    }
}
