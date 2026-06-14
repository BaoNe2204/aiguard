using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using aiguard_api.DTOs.Agents;
using aiguard_api.DTOs.Common;
using aiguard_api.Services;
using Microsoft.AspNetCore.RateLimiting;

namespace aiguard_api.Controllers;

[ApiController]
[Route("api/agent-runtime")]
[AllowAnonymous]
public class AgentRuntimeController : ControllerBase
{
    private readonly IAgentService _agents;

    public AgentRuntimeController(IAgentService agents) => _agents = agents;

    [HttpPost("tool-call/check")]
    [EnableRateLimiting("agent-runtime")]
    public async Task<IActionResult> CheckToolCall(
        [FromBody] ToolCallCheckRequest request,
        [FromHeader(Name = "X-Agent-Key")] string? agentKey)
    {
        if (!await _agents.ValidateCredentialAsync(request.AgentId, agentKey))
            return Unauthorized(ApiResponse<object>.Fail("Invalid or expired agent credential"));
        if (string.IsNullOrWhiteSpace(request.RequestId))
            return BadRequest(ApiResponse<object>.Fail("requestId is required for replay protection"));

        var result = await _agents.CheckToolCallAsync(request);
        return Ok(ApiResponse<ToolCallCheckResponse>.Ok(result));
    }
}
