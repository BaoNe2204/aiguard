using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using aiguard_api.DTOs.Common;
using aiguard_api.DTOs.Saas;
using aiguard_api.Services;

namespace aiguard_api.Controllers;

[ApiController]
[Route("api/licenses")]
public class LicenseValidationController : ControllerBase
{
    private readonly ISaasBusinessService _business;
    public LicenseValidationController(ISaasBusinessService business) => _business = business;

    [AllowAnonymous]
    [HttpPost("validate")]
    public async Task<IActionResult> Validate([FromBody] LicenseValidationRequest request)
    {
        var result = await _business.ValidateLicenseAsync(request);
        return result.IsEntitled
            ? Ok(ApiResponse<EntitlementResponse>.Ok(result))
            : Unauthorized(ApiResponse<EntitlementResponse>.Fail("License is invalid, inactive, or expired."));
    }
}
