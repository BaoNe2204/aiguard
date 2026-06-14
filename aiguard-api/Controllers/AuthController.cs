using Microsoft.AspNetCore.Mvc;
using aiguard_api.DTOs.Auth;
using aiguard_api.DTOs.Common;
using aiguard_api.Services;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.RateLimiting;

namespace aiguard_api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;
    private readonly IWebHostEnvironment _environment;

    public AuthController(IAuthService authService, IWebHostEnvironment environment)
    {
        _authService = authService;
        _environment = environment;
    }

    /// <summary>Login and receive JWT + Refresh Token</summary>
    [HttpPost("login")]
    [EnableRateLimiting("auth")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        var result = await _authService.LoginAsync(request);
        if (result == null)
            return Unauthorized(ApiResponse<object>.Fail("Invalid email or password"));
        return Ok(ApiResponse<LoginResponse>.Ok(result, "Login successful"));
    }

    /// <summary>Verify TOTP MFA challenge and receive JWT + Refresh Token</summary>
    [HttpPost("mfa/verify")]
    [EnableRateLimiting("auth")]
    public async Task<IActionResult> VerifyMfa([FromBody] MfaVerifyRequest request)
    {
        var result = await _authService.VerifyMfaAsync(request);
        if (result == null)
            return Unauthorized(ApiResponse<object>.Fail("Invalid or expired MFA challenge"));
        return Ok(ApiResponse<LoginResponse>.Ok(result, "MFA verified"));
    }

    /// <summary>Refresh access token using refresh token</summary>
    [HttpPost("refresh-token")]
    [EnableRateLimiting("auth")]
    public async Task<IActionResult> RefreshToken([FromBody] RefreshTokenRequest request)
    {
        var result = await _authService.RefreshTokenAsync(request.RefreshToken);
        if (result == null)
            return Unauthorized(ApiResponse<object>.Fail("Invalid or expired refresh token"));
        return Ok(ApiResponse<LoginResponse>.Ok(result));
    }

    [HttpPost("sso/exchange")]
    [EnableRateLimiting("auth")]
    public async Task<IActionResult> SsoExchange([FromBody] SsoExchangeRequest request)
    {
        var result = await _authService.SsoExchangeAsync(request);
        if (result == null)
            return Unauthorized(ApiResponse<object>.Fail("Invalid SSO token or account is not provisioned"));
        return Ok(ApiResponse<LoginResponse>.Ok(result, "SSO login successful"));
    }

    [HttpPost("logout")]
    [Authorize]
    public async Task<IActionResult> Logout([FromBody] LogoutRequest request)
    {
        var ok = await _authService.LogoutAsync(
            CurrentUserId(),
            request.RefreshToken,
            request.AllSessions);
        if (!ok) return BadRequest(ApiResponse<object>.Fail("Refresh session not found"));
        return Ok(ApiResponse<object>.Ok(new { }, "Logged out"));
    }

    [HttpPost("mfa/recovery-codes/regenerate")]
    [Authorize]
    [EnableRateLimiting("auth")]
    public async Task<IActionResult> RegenerateRecoveryCodes(
        [FromBody] RegenerateRecoveryCodesRequest request)
    {
        var codes = await _authService.RegenerateRecoveryCodesAsync(
            CurrentUserId(),
            request.CurrentPassword);
        if (codes == null)
            return BadRequest(ApiResponse<object>.Fail("Password is invalid or MFA is not enabled"));
        return Ok(ApiResponse<List<string>>.Ok(
            codes,
            "Store these recovery codes now. Each code can be used once."));
    }

    /// <summary>Get current user profile</summary>
    [HttpGet("profile")]
    [Authorize]
    public async Task<IActionResult> GetProfile()
    {
        var profile = await _authService.GetProfileAsync(CurrentUserId());
        if (profile == null) return NotFound(ApiResponse<object>.Fail("User not found"));
        return Ok(ApiResponse<UserProfileResponse>.Ok(profile));
    }

    /// <summary>Request password reset</summary>
    [HttpPost("forgot-password")]
    [EnableRateLimiting("auth")]
    public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest request)
    {
        var resetToken = await _authService.ForgotPasswordAsync(request.TenantCode, request.Email);
        object data = new
        {
            resetToken = _environment.IsDevelopment() || _environment.IsEnvironment("Testing") ? resetToken : null
        };
        return Ok(ApiResponse<object>.Ok(data, "If the email exists, a reset link has been sent"));
    }

    /// <summary>Reset password with token</summary>
    [HttpPost("reset-password")]
    [EnableRateLimiting("auth")]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest request)
    {
        var ok = await _authService.ResetPasswordAsync(request);
        if (!ok) return BadRequest(ApiResponse<object>.Fail("Invalid request"));
        return Ok(ApiResponse<object>.Ok(new { }, "Password reset successfully"));
    }

    private Guid CurrentUserId()
    {
        var value = User.FindFirstValue(ClaimTypes.NameIdentifier) ??
            User.FindFirstValue("sub");
        if (!Guid.TryParse(value, out var userId))
            throw new UnauthorizedAccessException();
        return userId;
    }
}
