using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using aiguard_api.DTOs.Common;
using aiguard_api.DTOs.Endpoints;
using aiguard_api.Services;

namespace aiguard_api.Controllers;

[ApiController]
[Route("api/endpoints/deployment")]
[Authorize(Roles = "TenantOwner,PlatformAdmin,SecurityAdmin")]
public class DeploymentController : ControllerBase
{
    private readonly IDeploymentService _deploymentService;

    public DeploymentController(IDeploymentService deploymentService) => _deploymentService = deploymentService;

    /// <summary>Get current enrollment token and install command</summary>
    [HttpGet("token")]
    public async Task<IActionResult> GetToken()
    {
        var response = await _deploymentService.GetActiveTokenInfoAsync();
        return Ok(ApiResponse<DeploymentTokenResponse>.Ok(response));
    }

    /// <summary>Rotate enrollment token</summary>
    [HttpPost("rotate-token")]
    public async Task<IActionResult> RotateToken([FromQuery] string tenantCode = "DEFAULT")
    {
        var response = await _deploymentService.RotateTokenAsync(tenantCode);
        return Ok(ApiResponse<DeploymentTokenResponse>.Ok(response, "Token rotated"));
    }

    [HttpPost("enroll")]
    [AllowAnonymous]
    public async Task<IActionResult> Enroll([FromBody] EnrollDeviceRequest request)
    {
        var response = await _deploymentService.EnrollAsync(request);
        if (response == null) return Unauthorized(ApiResponse<object>.Fail("Invalid or expired enrollment token"));
        return Ok(ApiResponse<EnrollDeviceResponse>.Ok(response, "Device enrolled"));
    }
}
