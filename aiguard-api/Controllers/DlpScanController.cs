using Microsoft.AspNetCore.Mvc;
using aiguard_api.DTOs.Common;
using aiguard_api.DTOs.Dashboard;
using aiguard_api.Services;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;

namespace aiguard_api.Controllers;

[ApiController]
[Route("api/dlp")]
public class DlpScanController : ControllerBase
{
    private readonly IDlpScannerService _scannerService;

    public DlpScanController(IDlpScannerService scannerService) => _scannerService = scannerService;

    [HttpGet("ai-health")]
    [Authorize(Roles = "SecurityAdmin,TenantOwner,PlatformAdmin")]
    public async Task<IActionResult> GetAiHealth([FromServices] IAiSecurityEngineClient aiSecurityEngine)
    {
        var result = await aiSecurityEngine.GetHealthAsync(HttpContext.RequestAborted);
        return Ok(ApiResponse<AiSecurityHealthResult>.Ok(result));
    }

    [HttpPost("admin-scan")]
    [Authorize(Roles = "SecurityAdmin,TenantOwner,PlatformAdmin")]
    public async Task<IActionResult> AdminScan([FromBody] DlpScanRequest request)
    {
        request.UserEmail = string.IsNullOrWhiteSpace(request.UserEmail)
            ? User.FindFirstValue(ClaimTypes.Email) ?? User.FindFirstValue("email")
            : request.UserEmail;
        request.DepartmentCode = string.IsNullOrWhiteSpace(request.DepartmentCode)
            ? User.FindFirstValue("department") ?? request.DepartmentCode
            : request.DepartmentCode;

        var result = await _scannerService.ScanContentAsync(request);
        return Ok(ApiResponse<DlpScanResponse>.Ok(result));
    }

    /// <summary>Scan content for sensitive data (called by Browser Extension / Desktop Agent)</summary>
    [HttpPost("scan")]
    [AllowAnonymous]
    public async Task<IActionResult> Scan(
        [FromBody] DlpScanRequest request,
        [FromHeader(Name = "X-Endpoint-Key")] string? endpointKey,
        [FromServices] IEndpointSecurityService endpointSecurity)
    {
        var device = await endpointSecurity.GetAuthenticatedDeviceAsync(request.Hostname ?? string.Empty, endpointKey);
        if (device == null)
            return Unauthorized(ApiResponse<object>.Fail("Invalid endpoint credentials"));
        if (device.IsRemoteDisabled)
            return StatusCode(StatusCodes.Status403Forbidden, ApiResponse<object>.Fail("Endpoint protection is remotely disabled"));
        if (device.IsQuarantined)
            return StatusCode(StatusCodes.Status423Locked, ApiResponse<object>.Fail($"Device is quarantined: {device.QuarantineReason}"));

        request.Hostname = device.Hostname;
        request.UserEmail = device.UserEmail;
        request.DepartmentCode = device.DepartmentName;
        var result = await _scannerService.ScanContentAsync(request);
        var receipts = HttpContext.RequestServices.GetRequiredService<IScanReceiptService>();
        await receipts.AttachReceiptAsync(result, device, request.Content);
        return Ok(ApiResponse<DlpScanResponse>.Ok(result));
    }
}
