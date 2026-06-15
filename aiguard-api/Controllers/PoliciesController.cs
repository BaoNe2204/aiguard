using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using aiguard_api.DTOs.Common;
using aiguard_api.DTOs.Policies;
using aiguard_api.Services;
using System.Security.Claims;

namespace aiguard_api.Controllers;

[ApiController]
[Route("api/policies")]
[Authorize(Roles = "SecurityAdmin,TenantOwner,PlatformAdmin")]
public class PoliciesController : ControllerBase
{
    private readonly IPolicyService _policyService;

    public PoliciesController(IPolicyService policyService) => _policyService = policyService;

    /// <summary>Get all department security policies</summary>
    [HttpGet("departments")]
    public async Task<IActionResult> GetDepartmentPolicies()
    {
        var result = await _policyService.GetDepartmentPoliciesAsync();
        return Ok(ApiResponse<List<SecurityPolicyResponse>>.Ok(result));
    }

    /// <summary>Update a department security policy</summary>
    [HttpPut("departments/{id:guid}")]
    public async Task<IActionResult> UpdatePolicy(Guid id, [FromBody] UpdatePolicyRequest request)
    {
        var result = await _policyService.UpdatePolicyAsync(
            id,
            request,
            User.FindFirstValue(ClaimTypes.Email) ?? User.FindFirstValue("email"));
        if (result == null) return NotFound(ApiResponse<object>.Fail("Policy not found"));
        return Ok(ApiResponse<SecurityPolicyResponse>.Ok(result));
    }

    /// <summary>Get policy version history</summary>
    [HttpGet("versions")]
    public async Task<IActionResult> GetVersions([FromQuery] Guid? policyId)
    {
        var result = await _policyService.GetVersionsAsync(policyId);
        return Ok(ApiResponse<List<PolicyVersionResponse>>.Ok(result));
    }

    /// <summary>Rollback policy to an immutable version snapshot</summary>
    [HttpPost("versions/{id:guid}/rollback")]
    public async Task<IActionResult> Rollback(Guid id)
    {
        var ok = await _policyService.RollbackAsync(
            id,
            User.FindFirstValue(ClaimTypes.Email) ?? User.FindFirstValue("email"));
        if (!ok) return NotFound(ApiResponse<object>.Fail("Policy version not found"));
        return Ok(ApiResponse<object>.Ok(new { }, "Policy rolled back to selected version"));
    }

    /// <summary>Get whitelist and blacklist keywords</summary>
    [HttpGet("whitelist-blacklist")]
    public async Task<IActionResult> GetWhitelistBlacklist()
    {
        var result = await _policyService.GetWhitelistBlacklistAsync();
        return Ok(ApiResponse<WhitelistBlacklistResponse>.Ok(result));
    }

    /// <summary>Update whitelist and blacklist keywords</summary>
    [HttpPost("whitelist-blacklist")]
    public async Task<IActionResult> UpdateWhitelistBlacklist([FromBody] UpdateWhitelistBlacklistRequest request)
    {
        var result = await _policyService.UpdateWhitelistBlacklistAsync(request);
        return Ok(ApiResponse<WhitelistBlacklistResponse>.Ok(result));
    }

    [HttpGet("current")]
    [AllowAnonymous]
    public async Task<IActionResult> GetCurrentPolicy(
        [FromQuery] string hostname,
        [FromHeader(Name = "X-Endpoint-Key")] string? endpointKey,
        [FromServices] IEndpointSecurityService endpointSecurity)
    {
        if (!await endpointSecurity.ValidateEndpointKeyAsync(hostname, endpointKey))
            return Unauthorized(ApiResponse<object>.Fail("Invalid endpoint credentials"));

        var result = await _policyService.GetCurrentForDeviceAsync(hostname);
        if (result == null) return NotFound(ApiResponse<object>.Fail("No active policy found"));
        return Ok(ApiResponse<SecurityPolicyResponse>.Ok(result));
    }
}
