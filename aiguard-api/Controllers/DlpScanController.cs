using Microsoft.AspNetCore.Mvc;
using aiguard_api.DTOs.Common;
using aiguard_api.DTOs.Dashboard;
using aiguard_api.Services;
using Microsoft.AspNetCore.Authorization;

namespace aiguard_api.Controllers;

[ApiController]
[Route("api/dlp")]
public class DlpScanController : ControllerBase
{
    private readonly IDlpScannerService _scannerService;

    public DlpScanController(IDlpScannerService scannerService) => _scannerService = scannerService;

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
