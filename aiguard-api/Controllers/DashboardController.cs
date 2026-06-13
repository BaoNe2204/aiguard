using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using aiguard_api.DTOs.Common;
using aiguard_api.DTOs.Dashboard;
using aiguard_api.Services;

namespace aiguard_api.Controllers;

[ApiController]
[Route("api/dashboard")]
[Authorize(Roles = "DepartmentManager,SecurityAdmin,SystemAdmin,Auditor")]
public class DashboardController : ControllerBase
{
    private readonly IDashboardService _dashboardService;

    public DashboardController(IDashboardService dashboardService) => _dashboardService = dashboardService;

    /// <summary>Get dashboard KPI statistics</summary>
    [HttpGet("stats")]
    public async Task<IActionResult> GetStats()
    {
        var result = await _dashboardService.GetStatsAsync();
        return Ok(ApiResponse<DashboardStatsResponse>.Ok(result));
    }

    /// <summary>Get department risk analysis</summary>
    [HttpGet("department-risk")]
    public async Task<IActionResult> GetDepartmentRisk()
    {
        var result = await _dashboardService.GetDepartmentRiskAsync();
        return Ok(ApiResponse<List<DepartmentRiskResponse>>.Ok(result));
    }

    /// <summary>Get trend data for charts</summary>
    [HttpGet("trends")]
    public async Task<IActionResult> GetTrends([FromQuery] int days = 7)
    {
        var result = await _dashboardService.GetTrendsAsync(days);
        return Ok(ApiResponse<List<TrendDataPoint>>.Ok(result));
    }

    /// <summary>Get AI agent risk summary</summary>
    [HttpGet("agent-risk")]
    public async Task<IActionResult> GetAgentRisk()
    {
        var result = await _dashboardService.GetAgentRiskAsync();
        return Ok(ApiResponse<AgentRiskResponse>.Ok(result));
    }
}
