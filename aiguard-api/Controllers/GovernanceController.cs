using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using aiguard_api.DTOs.Common;
using aiguard_api.DTOs.Governance;
using aiguard_api.Hubs;
using aiguard_api.Models;
using aiguard_api.Services;

namespace aiguard_api.Controllers;

[ApiController]
[Route("api/governance")]
[Authorize]
public class GovernanceController : ControllerBase
{
    private readonly IGovernanceService _governance;
    private readonly IHubContext<NotificationHub> _hub;
    public GovernanceController(IGovernanceService governance, IHubContext<NotificationHub> hub)
    {
        _governance = governance;
        _hub = hub;
    }

    [HttpPost("false-positives")]
    public async Task<IActionResult> CreateFalsePositive([FromBody] FalsePositiveCreateRequest request)
    {
        var email = User.FindFirstValue(ClaimTypes.Email) ?? User.FindFirstValue("email");
        if (string.IsNullOrWhiteSpace(email)) return Unauthorized(ApiResponse<object>.Fail("Email claim is missing."));
        var result = await _governance.CreateFalsePositiveAsync(request, email);
        if (result == null) return NotFound(ApiResponse<object>.Fail("Endpoint event not found for this user."));
        await _governance.CreateNotificationAsync(
            "FalsePositive", "New false-positive report",
            $"{email} reported detector {result.DetectorName}.",
            "/app/governance/false-positives", recipientRole: "SecurityAdmin");
        await _hub.Clients.All.SendAsync("FalsePositiveSubmitted", result);
        return StatusCode(StatusCodes.Status201Created, ApiResponse<FalsePositiveResponse>.Ok(result));
    }

    [HttpGet("false-positives")]
    [Authorize(Roles = "SecurityAdmin,SystemAdmin")]
    public async Task<IActionResult> GetFalsePositives([FromQuery] PagedQuery query, [FromQuery] string? status) =>
        Ok(ApiResponse<PagedResult<FalsePositiveResponse>>.Ok(
            await _governance.GetFalsePositivesAsync(query, status)));

    [HttpPost("false-positives/{id:guid}/review")]
    [Authorize(Roles = "SecurityAdmin,SystemAdmin")]
    public async Task<IActionResult> ReviewFalsePositive(Guid id, [FromBody] FalsePositiveReviewRequest request)
    {
        var reviewerId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier) ??
            User.FindFirstValue("sub") ?? Guid.Empty.ToString());
        var result = await _governance.ReviewFalsePositiveAsync(id, request, reviewerId);
        if (result == null) return NotFound(ApiResponse<object>.Fail("Report not found or already reviewed."));
        await _governance.CreateNotificationAsync(
            "FalsePositiveDecision", "False-positive report reviewed",
            $"Your report was {result.Status.ToLowerInvariant()}.",
            "/app/my-usage/logs", recipientEmail: result.ReportedByEmail);
        await _hub.Clients.All.SendAsync("FalsePositiveReviewed", result);
        return Ok(ApiResponse<FalsePositiveResponse>.Ok(result));
    }

    [HttpGet("incidents")]
    [Authorize(Roles = "DepartmentManager,SecurityAdmin,SystemAdmin,Auditor")]
    public async Task<IActionResult> GetIncidents(
        [FromQuery] PagedQuery query, [FromQuery] string? status, [FromQuery] string? severity) =>
        Ok(ApiResponse<PagedResult<IncidentResponse>>.Ok(
            await _governance.GetIncidentsAsync(query, status, severity)));

    [HttpPost("incidents")]
    [Authorize(Roles = "SecurityAdmin,SystemAdmin")]
    public async Task<IActionResult> CreateIncident([FromBody] CreateIncidentRequest request)
    {
        var result = await _governance.CreateIncidentAsync(request);
        await _hub.Clients.All.SendAsync("IncidentCreated", result);
        return StatusCode(StatusCodes.Status201Created, ApiResponse<IncidentResponse>.Ok(result));
    }

    [HttpPut("incidents/{id:guid}")]
    [Authorize(Roles = "SecurityAdmin,SystemAdmin")]
    public async Task<IActionResult> UpdateIncident(Guid id, [FromBody] UpdateIncidentRequest request)
    {
        var result = await _governance.UpdateIncidentAsync(id, request);
        if (result == null) return NotFound(ApiResponse<object>.Fail("Incident not found."));
        await _hub.Clients.All.SendAsync("IncidentUpdated", result);
        return Ok(ApiResponse<IncidentResponse>.Ok(result));
    }

    [HttpGet("notifications")]
    public async Task<IActionResult> GetNotifications([FromQuery] bool unreadOnly = false)
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier) ??
            User.FindFirstValue("sub") ?? Guid.Empty.ToString());
        var email = User.FindFirstValue(ClaimTypes.Email) ?? User.FindFirstValue("email") ?? string.Empty;
        var role = User.FindFirstValue(ClaimTypes.Role) ?? User.FindFirstValue("role") ?? string.Empty;
        return Ok(ApiResponse<List<NotificationResponse>>.Ok(
            await _governance.GetNotificationsAsync(userId, email, role, unreadOnly)));
    }

    [HttpPost("notifications/{id:guid}/read")]
    public async Task<IActionResult> MarkNotificationRead(Guid id)
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier) ??
            User.FindFirstValue("sub") ?? Guid.Empty.ToString());
        var email = User.FindFirstValue(ClaimTypes.Email) ?? User.FindFirstValue("email") ?? string.Empty;
        return await _governance.MarkNotificationReadAsync(id, userId, email)
            ? Ok(ApiResponse<object>.Ok(new { }))
            : NotFound(ApiResponse<object>.Fail("Notification not found."));
    }

    [HttpGet("policy-rules")]
    [Authorize(Roles = "SecurityAdmin,SystemAdmin")]
    public async Task<IActionResult> GetPolicyRules() =>
        Ok(ApiResponse<List<PolicyRuleResponse>>.Ok(await _governance.GetPolicyRulesAsync()));

    [HttpPost("policy-rules")]
    [Authorize(Roles = "SecurityAdmin,SystemAdmin")]
    public async Task<IActionResult> CreatePolicyRule([FromBody] PolicyRuleRequest request) =>
        StatusCode(StatusCodes.Status201Created,
            ApiResponse<PolicyRuleResponse>.Ok(await _governance.CreatePolicyRuleAsync(request)));

    [HttpPut("policy-rules/{id:guid}")]
    [Authorize(Roles = "SecurityAdmin,SystemAdmin")]
    public async Task<IActionResult> UpdatePolicyRule(Guid id, [FromBody] PolicyRuleRequest request)
    {
        var result = await _governance.UpdatePolicyRuleAsync(id, request);
        return result == null ? NotFound(ApiResponse<object>.Fail("Policy rule not found.")) :
            Ok(ApiResponse<PolicyRuleResponse>.Ok(result));
    }

    [HttpPost("policy-rules/{id:guid}/publish")]
    [Authorize(Roles = "SecurityAdmin,SystemAdmin")]
    public async Task<IActionResult> PublishPolicyRule(Guid id)
    {
        var email = User.FindFirstValue(ClaimTypes.Email) ?? User.FindFirstValue("email");
        var result = await _governance.PublishPolicyRuleAsync(id, email);
        if (result == null) return NotFound(ApiResponse<object>.Fail("Policy rule not found."));
        await _hub.Clients.All.SendAsync("PolicyUpdated", result);
        return Ok(ApiResponse<PolicyRuleResponse>.Ok(result));
    }

    [HttpPost("policy-rules/simulate")]
    [Authorize(Roles = "SecurityAdmin,SystemAdmin")]
    public async Task<IActionResult> SimulatePolicy([FromBody] PolicySimulationRequest request) =>
        Ok(ApiResponse<object>.Ok(await _governance.SimulatePolicyAsync(request)));

    [HttpGet("retention")]
    [Authorize(Roles = "SecurityAdmin,SystemAdmin")]
    public async Task<IActionResult> GetRetention() =>
        Ok(ApiResponse<RetentionPolicy>.Ok(await _governance.GetRetentionPolicyAsync()));

    [HttpPut("retention")]
    [Authorize(Roles = "SystemAdmin")]
    public async Task<IActionResult> UpdateRetention([FromBody] RetentionPolicyRequest request)
    {
        var email = User.FindFirstValue(ClaimTypes.Email) ?? User.FindFirstValue("email");
        return Ok(ApiResponse<RetentionPolicy>.Ok(await _governance.UpdateRetentionPolicyAsync(request, email)));
    }

    [HttpGet("integrations")]
    [Authorize(Roles = "SecurityAdmin,SystemAdmin")]
    public async Task<IActionResult> GetIntegrations() =>
        Ok(ApiResponse<List<IntegrationResponse>>.Ok(await _governance.GetIntegrationsAsync()));

    [HttpPost("integrations")]
    [Authorize(Roles = "SystemAdmin")]
    public async Task<IActionResult> CreateIntegration([FromBody] IntegrationRequest request) =>
        StatusCode(StatusCodes.Status201Created,
            ApiResponse<IntegrationResponse>.Ok(await _governance.CreateIntegrationAsync(request)));

    [HttpDelete("integrations/{id:guid}")]
    [Authorize(Roles = "SystemAdmin")]
    public async Task<IActionResult> DeleteIntegration(Guid id) =>
        await _governance.DeleteIntegrationAsync(id)
            ? Ok(ApiResponse<object>.Ok(new { }))
            : NotFound(ApiResponse<object>.Fail("Integration not found."));

    [HttpGet("health")]
    [Authorize(Roles = "SecurityAdmin,SystemAdmin,Auditor")]
    public async Task<IActionResult> GetGovernanceHealth() =>
        Ok(ApiResponse<GovernanceHealthResponse>.Ok(await _governance.GetHealthAsync()));

    [HttpGet("exact-data-match")]
    [Authorize(Roles = "SecurityAdmin,SystemAdmin")]
    public async Task<IActionResult> GetExactDataMatches() =>
        Ok(ApiResponse<List<ExactDataMatchResponse>>.Ok(await _governance.GetExactDataMatchesAsync()));

    [HttpPost("exact-data-match/import")]
    [Authorize(Roles = "SecurityAdmin,SystemAdmin")]
    public async Task<IActionResult> ImportExactDataMatches([FromBody] ExactDataMatchImportRequest request) =>
        Ok(ApiResponse<object>.Ok(new
        {
            imported = await _governance.ImportExactDataMatchesAsync(request)
        }));

    [HttpDelete("exact-data-match/{id:guid}")]
    [Authorize(Roles = "SecurityAdmin,SystemAdmin")]
    public async Task<IActionResult> DeleteExactDataMatch(Guid id) =>
        await _governance.DeleteExactDataMatchAsync(id)
            ? Ok(ApiResponse<object>.Ok(new { }))
            : NotFound(ApiResponse<object>.Fail("EDM record not found."));
}
