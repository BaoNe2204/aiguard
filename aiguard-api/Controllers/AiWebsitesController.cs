using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using aiguard_api.DTOs.Common;
using aiguard_api.DTOs.Endpoints;
using aiguard_api.Services;

namespace aiguard_api.Controllers;

[ApiController]
[Route("api/endpoints/ai-websites")]
[Authorize(Roles = "SecurityAdmin,TenantOwner")]
public class AiWebsitesController : ControllerBase
{
    private readonly IAiWebsiteService _websiteService;

    public AiWebsitesController(IAiWebsiteService websiteService) => _websiteService = websiteService;

    /// <summary>Get all AI website rules</summary>
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var result = await _websiteService.GetAllAsync();
        return Ok(ApiResponse<List<AiWebsiteResponse>>.Ok(result));
    }

    /// <summary>Create a new AI website monitoring rule</summary>
    [HttpPost("rules")]
    public async Task<IActionResult> CreateRule([FromBody] CreateAiWebsiteRuleRequest request)
    {
        var result = await _websiteService.CreateRuleAsync(request);
        return Created($"/api/endpoints/ai-websites/{result.Id}", ApiResponse<AiWebsiteResponse>.Ok(result, "Rule created"));
    }

    /// <summary>Update an AI website rule</summary>
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateAiWebsiteRequest request)
    {
        var result = await _websiteService.UpdateAsync(id, request);
        if (result == null) return NotFound(ApiResponse<object>.Fail("Website rule not found"));
        return Ok(ApiResponse<AiWebsiteResponse>.Ok(result));
    }

    /// <summary>Delete an AI website rule</summary>
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var ok = await _websiteService.DeleteAsync(id);
        if (!ok) return NotFound(ApiResponse<object>.Fail("Website rule not found"));
        return Ok(ApiResponse<object>.Ok(new { }, "Rule deleted"));
    }
}
