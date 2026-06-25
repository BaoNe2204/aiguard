using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using aiguard_api.DTOs.Agents;
using aiguard_api.DTOs.Common;
using aiguard_api.Services;

namespace aiguard_api.Controllers;

[ApiController]
[Route("api/agents")]
[Authorize(Roles = "SecurityAdmin,TenantOwner,PlatformAdmin")]
public class AgentsController : ControllerBase
{
    private readonly IAgentService _agentService;

    public AgentsController(IAgentService agentService) => _agentService = agentService;

    /// <summary>Get all registered AI agents</summary>
    [HttpGet]
    public async Task<IActionResult> GetAgents()
    {
        var result = await _agentService.GetAgentsAsync();
        return Ok(ApiResponse<List<AgentResponse>>.Ok(result));
    }

    /// <summary>Register a new AI agent</summary>
    [HttpPost]
    public async Task<IActionResult> CreateAgent([FromBody] CreateAgentRequest request)
    {
        var result = await _agentService.CreateAgentAsync(request);
        return Created($"/api/agents/{result.Id}", ApiResponse<AgentResponse>.Ok(result, "Agent registered"));
    }

    /// <summary>Update an AI agent</summary>
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> UpdateAgent(Guid id, [FromBody] UpdateAgentRequest request)
    {
        var result = await _agentService.UpdateAgentAsync(id, request);
        if (result == null) return NotFound(ApiResponse<object>.Fail("Agent not found"));
        return Ok(ApiResponse<AgentResponse>.Ok(result));
    }

    /// <summary>Get tool permissions for an agent</summary>
    [HttpGet("{id:guid}/tool-permissions")]
    public async Task<IActionResult> GetToolPermissions(Guid id)
    {
        var result = await _agentService.GetToolPermissionsAsync(id);
        return Ok(ApiResponse<List<ToolPermissionResponse>>.Ok(result));
    }

    [HttpPut("{id:guid}/tool-permissions")]
    public async Task<IActionResult> UpsertToolPermission(Guid id, [FromBody] UpdateToolPermissionRequest request)
    {
        var result = await _agentService.UpsertToolPermissionAsync(id, request);
        if (result == null) return NotFound(ApiResponse<object>.Fail("Agent not found"));
        return Ok(ApiResponse<ToolPermissionResponse>.Ok(result));
    }

    /// <summary>Get tool-call monitor logs</summary>
    [HttpGet("tool-calls")]
    public async Task<IActionResult> GetToolCalls([FromQuery] PagedQuery query, [FromQuery] Guid? agentId)
    {
        var result = await _agentService.GetToolCallLogsAsync(query, agentId);
        return Ok(ApiResponse<PagedResult<ToolCallLogResponse>>.Ok(result));
    }

    /// <summary>Simulate agent policy check</summary>
    [HttpPost("simulate")]
    public async Task<IActionResult> Simulate([FromBody] SimulateRequest request)
    {
        var result = await _agentService.SimulateAsync(request);
        return Ok(ApiResponse<SimulateResponse>.Ok(result));
    }

    [HttpPost("tool-call/check")]
    public async Task<IActionResult> CheckToolCall([FromBody] ToolCallCheckRequest request)
    {
        var result = await _agentService.CheckToolCallAsync(request);
        return Ok(ApiResponse<ToolCallCheckResponse>.Ok(result));
    }

    [HttpPost("{id:guid}/credentials/rotate")]
    public async Task<IActionResult> RotateCredential(Guid id)
    {
        var result = await _agentService.RotateCredentialAsync(id);
        if (result == null) return NotFound(ApiResponse<object>.Fail("Agent not found"));
        return Ok(ApiResponse<AgentCredentialResponse>.Ok(
            result,
            "Store this agent key now. It will not be shown again."));
    }
}
