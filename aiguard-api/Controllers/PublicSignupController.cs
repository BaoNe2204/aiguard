using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using aiguard_api.DTOs.Common;
using aiguard_api.DTOs.Saas;
using aiguard_api.Services;

namespace aiguard_api.Controllers;

[ApiController]
[Route("api/signup")]
[AllowAnonymous]
public class PublicSignupController : ControllerBase
{
    private readonly ISaasBusinessService _business;
    private readonly IWebHostEnvironment _environment;

    public PublicSignupController(ISaasBusinessService business, IWebHostEnvironment environment)
    {
        _business = business;
        _environment = environment;
    }

    [HttpPost("trial")]
    public async Task<IActionResult> RegisterTrial([FromBody] PublicTrialSignupRequest request)
    {
        var result = await _business.RegisterTrialSignupAsync(request);
        if (!_environment.IsDevelopment() && !_environment.IsEnvironment("Testing"))
            result.VerificationToken = null;
        return StatusCode(StatusCodes.Status201Created,
            ApiResponse<PublicTrialSignupResponse>.Ok(
                result,
                "Trial tenant created. Please verify the owner email to activate the Tenant Owner account."));
    }

    [HttpPost("verify")]
    public async Task<IActionResult> Verify([FromBody] VerifyTrialSignupRequest request) =>
        await _business.VerifyTrialSignupAsync(request) is { } result
            ? Ok(ApiResponse<VerifyTrialSignupResponse>.Ok(result, "Owner email verified. Login and complete MFA setup."))
            : BadRequest(ApiResponse<object>.Fail("Invalid or expired verification token."));
}
