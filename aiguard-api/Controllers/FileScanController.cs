using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using aiguard_api.DTOs.Common;
using aiguard_api.DTOs.Dashboard;
using aiguard_api.Services;

namespace aiguard_api.Controllers;

[ApiController]
[Route("api/dlp/files")]
public class FileScanController : ControllerBase
{
    [HttpPost("scan")]
    [AllowAnonymous]
    [RequestSizeLimit(25 * 1024 * 1024)]
    public async Task<IActionResult> Scan(
        [FromForm] string hostname,
        [FromForm] IFormFile file,
        [FromHeader(Name = "X-Endpoint-Key")] string? endpointKey,
        [FromServices] IEndpointSecurityService endpointSecurity,
        [FromServices] IFileContentScannerService scanner)
    {
        var device = await endpointSecurity.GetAuthenticatedDeviceAsync(hostname, endpointKey);
        if (device == null) return Unauthorized(ApiResponse<object>.Fail("Invalid endpoint credentials"));
        if (device.IsRemoteDisabled)
            return StatusCode(StatusCodes.Status403Forbidden, ApiResponse<object>.Fail("Endpoint protection is remotely disabled"));
        if (device.IsQuarantined)
            return StatusCode(StatusCodes.Status423Locked, ApiResponse<object>.Fail($"Device is quarantined: {device.QuarantineReason}"));
        var result = await scanner.ScanAsync(file, device);
        return Ok(ApiResponse<DlpScanResponse>.Ok(result));
    }
}
