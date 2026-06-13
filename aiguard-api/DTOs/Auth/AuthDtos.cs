using System.ComponentModel.DataAnnotations;

namespace aiguard_api.DTOs.Auth;

public class LoginRequest
{
    public string TenantCode { get; set; } = "DEFAULT";
    [Required, EmailAddress]
    public string Email { get; set; } = string.Empty;

    [Required, MinLength(8)]
    public string Password { get; set; } = string.Empty;
}

public class LoginResponse
{
    public bool RequiresMfa { get; set; }
    public string? MfaChallengeToken { get; set; }
    public bool MfaSetupRequired { get; set; }
    public string? MfaSetupSecret { get; set; }
    public string? MfaProvisioningUri { get; set; }
    public string? AccessToken { get; set; }
    public string? RefreshToken { get; set; }
    public DateTime? ExpiresAt { get; set; }
    public UserProfileResponse? User { get; set; }
}

public class MfaVerifyRequest
{
    public string TenantCode { get; set; } = "DEFAULT";

    [Required]
    public string ChallengeToken { get; set; } = string.Empty;

    [Required, MinLength(6), MaxLength(12)]
    public string Code { get; set; } = string.Empty;
}

public class RefreshTokenRequest
{
    [Required]
    public string RefreshToken { get; set; } = string.Empty;
}

public class UserProfileResponse
{
    public Guid Id { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public string? DepartmentName { get; set; }
    public Guid? DepartmentId { get; set; }
    public bool IsActive { get; set; }
    public bool MfaRequired { get; set; }
    public bool MfaEnabled { get; set; }
    public string AuthProvider { get; set; } = "Local";
}

public class ForgotPasswordRequest
{
    public string TenantCode { get; set; } = "DEFAULT";
    [Required, EmailAddress]
    public string Email { get; set; } = string.Empty;
}

public class ResetPasswordRequest
{
    [Required, EmailAddress]
    public string Email { get; set; } = string.Empty;

    [Required]
    public string Token { get; set; } = string.Empty;

    [Required, MinLength(8)]
    public string NewPassword { get; set; } = string.Empty;
}
