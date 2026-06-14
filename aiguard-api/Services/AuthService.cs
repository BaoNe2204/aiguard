using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using aiguard_api.Data;
using aiguard_api.DTOs.Auth;
using aiguard_api.Models;

namespace aiguard_api.Services;

public interface IAuthService
{
    Task<LoginResponse?> LoginAsync(LoginRequest request);
    Task<LoginResponse?> VerifyMfaAsync(MfaVerifyRequest request);
    Task<LoginResponse?> RefreshTokenAsync(string refreshToken);
    Task<LoginResponse?> SsoExchangeAsync(SsoExchangeRequest request);
    Task<bool> LogoutAsync(Guid userId, string? refreshToken, bool allSessions);
    Task<List<string>?> RegenerateRecoveryCodesAsync(Guid userId, string currentPassword);
    Task<UserProfileResponse?> GetProfileAsync(Guid userId);
    Task<string?> ForgotPasswordAsync(string tenantCode, string email);
    Task<bool> ResetPasswordAsync(ResetPasswordRequest request);
}

public class AuthService : IAuthService
{
    private readonly AiguardDbContext _db;
    private readonly IConfiguration _config;
    private readonly IDataScopeContext _scope;
    private readonly IDataProtector _mfaProtector;
    private readonly IHttpContextAccessor _http;
    private readonly IOidcTokenValidatorService _oidc;

    public AuthService(
        AiguardDbContext db,
        IConfiguration config,
        IDataScopeContext scope,
        IDataProtectionProvider dataProtectionProvider,
        IHttpContextAccessor http,
        IOidcTokenValidatorService oidc)
    {
        _db = db;
        _config = config;
        _scope = scope;
        _http = http;
        _oidc = oidc;
        _mfaProtector = dataProtectionProvider.CreateProtector("AIGuard.MfaSecrets.v1");
    }

    public async Task<LoginResponse?> LoginAsync(LoginRequest request)
    {
        var tenantCode = NormalizeTenant(request.TenantCode);
        _scope.SetEndpointScope(tenantCode, null);
        var email = request.Email.Trim().ToLowerInvariant();
        var user = await _db.Users
            .Include(x => x.Department)
            .FirstOrDefaultAsync(x => x.Email == email);
        if (user == null || !user.IsActive) return null;

        var now = DateTime.UtcNow;
        if (user.LockoutEnd > now) return null;
        if (!BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
        {
            await RegisterFailedLoginAsync(user, now);
            return null;
        }

        if (!await TenantAllowsLoginAsync(user)) return null;
        ResetFailedLogin(user);

        // if (user.MfaRequired || user.MfaEnabled)
        // {
        //     await _db.SaveChangesAsync();
        //     return await CreateMfaChallengeAsync(user);
        // }

        var response = IssueTokens(user);
        user.LastLoginAt = now;
        await _db.SaveChangesAsync();
        return response;
    }

    public async Task<LoginResponse?> VerifyMfaAsync(MfaVerifyRequest request)
    {
        _scope.SetEndpointScope(NormalizeTenant(request.TenantCode), null);
        var challenge = await _db.MfaLoginChallenges
            .Include(x => x.User)
            .ThenInclude(x => x.Department)
            .FirstOrDefaultAsync(x =>
                x.ChallengeTokenHash == HashToken(request.ChallengeToken) &&
                x.ConsumedAt == null &&
                x.ExpiresAt > DateTime.UtcNow &&
                x.User.IsActive);
        if (challenge == null || challenge.AttemptCount >= MaxMfaAttempts()) return null;

        var user = challenge.User;
        var valid = await VerifyMfaCodeAsync(challenge, request.Code);
        if (!valid)
        {
            challenge.AttemptCount++;
            if (challenge.AttemptCount >= MaxMfaAttempts())
                challenge.ConsumedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
            return null;
        }

        List<string>? recoveryCodes = null;
        if (challenge.IsSetup)
        {
            user.MfaSecretProtected = challenge.SetupSecretProtected;
            user.MfaEnabled = true;
            user.MfaRequired = true;
            user.MfaEnabledAt = DateTime.UtcNow;
            recoveryCodes = await ReplaceRecoveryCodesAsync(user);
        }

        challenge.ConsumedAt = DateTime.UtcNow;
        user.LastLoginAt = DateTime.UtcNow;
        ResetFailedLogin(user);
        var response = IssueTokens(user);
        response.MfaRecoveryCodes = recoveryCodes;
        await _db.SaveChangesAsync();
        return response;
    }

    public async Task<LoginResponse?> RefreshTokenAsync(string refreshToken)
    {
        var tokenHash = HashToken(refreshToken);
        var session = await _db.RefreshSessions.IgnoreQueryFilters()
            .Include(x => x.User)
            .ThenInclude(x => x.Department)
            .FirstOrDefaultAsync(x => x.TokenHash == tokenHash);
        if (session == null || !session.User.IsActive) return null;
        if (session.RevokedAt != null)
        {
            if (!string.IsNullOrWhiteSpace(session.ReplacedByTokenHash))
            {
                await _db.RefreshSessions.IgnoreQueryFilters()
                    .Where(x => x.UserId == session.UserId && x.RevokedAt == null)
                    .ExecuteUpdateAsync(setters => setters
                        .SetProperty(x => x.RevokedAt, DateTime.UtcNow)
                        .SetProperty(x => x.RevokeReason, "Refresh token reuse detected"));
            }
            return null;
        }
        if (session.ExpiresAt <= DateTime.UtcNow ||
            !await TenantAllowsLoginAsync(session.User))
            return null;

        _scope.SetEndpointScope(session.TenantCode, session.User.DepartmentId);
        session.RevokedAt = DateTime.UtcNow;
        session.RevokeReason = "Rotated";
        session.LastUsedAt = DateTime.UtcNow;
        var response = IssueTokens(session.User);
        session.ReplacedByTokenHash = HashToken(response.RefreshToken!);
        await _db.SaveChangesAsync();
        return response;
    }

    public async Task<LoginResponse?> SsoExchangeAsync(SsoExchangeRequest request)
    {
        var provider = OidcTokenValidatorService.NormalizeProvider(request.Provider);
        var identity = await _oidc.ValidateAsync(provider, request.IdToken);
        if (identity == null) return null;

        var tenantCode = NormalizeTenant(request.TenantCode);
        _scope.SetEndpointScope(tenantCode, null);
        var user = await _db.Users
            .Include(x => x.Department)
            .FirstOrDefaultAsync(x => x.Email == identity.Email && x.IsActive);
        if (user == null || !ProviderMatches(user.AuthProvider, provider)) return null;
        if (!string.IsNullOrWhiteSpace(user.ExternalSubjectId) &&
            user.ExternalSubjectId != identity.Subject)
            return null;
        if (!await TenantAllowsLoginAsync(user)) return null;

        user.ExternalSubjectId = identity.Subject;
        user.AuthProvider = provider;
        user.LastLoginAt = DateTime.UtcNow;
        ResetFailedLogin(user);
        var response = IssueTokens(user);
        await _db.SaveChangesAsync();
        return response;
    }

    public async Task<bool> LogoutAsync(Guid userId, string? refreshToken, bool allSessions)
    {
        var now = DateTime.UtcNow;
        if (allSessions)
        {
            await _db.RefreshSessions
                .Where(x => x.UserId == userId && x.RevokedAt == null)
                .ExecuteUpdateAsync(setters => setters
                    .SetProperty(x => x.RevokedAt, now)
                    .SetProperty(x => x.RevokeReason, "User logout from all sessions"));
            return true;
        }

        if (string.IsNullOrWhiteSpace(refreshToken)) return false;
        var hash = HashToken(refreshToken);
        var session = await _db.RefreshSessions
            .FirstOrDefaultAsync(x => x.UserId == userId && x.TokenHash == hash && x.RevokedAt == null);
        if (session == null) return false;
        session.RevokedAt = now;
        session.RevokeReason = "User logout";
        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<List<string>?> RegenerateRecoveryCodesAsync(Guid userId, string currentPassword)
    {
        var user = await _db.Users.FirstOrDefaultAsync(x => x.Id == userId && x.IsActive);
        if (user == null || !user.MfaEnabled ||
            !BCrypt.Net.BCrypt.Verify(currentPassword, user.PasswordHash))
            return null;
        var codes = await ReplaceRecoveryCodesAsync(user);
        await _db.SaveChangesAsync();
        return codes;
    }

    public async Task<UserProfileResponse?> GetProfileAsync(Guid userId)
    {
        var user = await _db.Users.Include(x => x.Department).FirstOrDefaultAsync(x => x.Id == userId);
        return user == null ? null : MapToProfile(user);
    }

    public async Task<string?> ForgotPasswordAsync(string tenantCode, string email)
    {
        _scope.SetEndpointScope(NormalizeTenant(tenantCode), null);
        var normalizedEmail = email.Trim().ToLowerInvariant();
        var user = await _db.Users.FirstOrDefaultAsync(x => x.Email == normalizedEmail && x.IsActive);
        if (user == null) return null;

        var rawToken = GenerateUrlSafeToken(48);
        _db.PasswordResetTokens.Add(new PasswordResetToken
        {
            UserId = user.Id,
            TokenHash = HashToken(rawToken),
            ExpiresAt = DateTime.UtcNow.AddMinutes(30)
        });
        await _db.SaveChangesAsync();
        return rawToken;
    }

    public async Task<bool> ResetPasswordAsync(ResetPasswordRequest request)
    {
        var resetToken = await _db.PasswordResetTokens.IgnoreQueryFilters()
            .Include(x => x.User)
            .FirstOrDefaultAsync(x =>
                x.TokenHash == HashToken(request.Token) &&
                x.UsedAt == null &&
                x.ExpiresAt > DateTime.UtcNow &&
                x.User.Email == request.Email.Trim().ToLowerInvariant() &&
                x.User.IsActive);
        if (resetToken == null) return false;

        _scope.SetEndpointScope(resetToken.User.TenantCode, resetToken.User.DepartmentId);
        resetToken.User.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
        resetToken.User.RefreshToken = null;
        resetToken.User.RefreshTokenExpiry = null;
        ResetFailedLogin(resetToken.User);
        resetToken.UsedAt = DateTime.UtcNow;
        await _db.RefreshSessions.IgnoreQueryFilters()
            .Where(x => x.UserId == resetToken.UserId && x.RevokedAt == null)
            .ExecuteUpdateAsync(setters => setters
                .SetProperty(x => x.RevokedAt, DateTime.UtcNow)
                .SetProperty(x => x.RevokeReason, "Password reset"));
        await _db.SaveChangesAsync();
        return true;
    }

    private async Task<bool> VerifyMfaCodeAsync(MfaLoginChallenge challenge, string code)
    {
        var protectedSecret = challenge.IsSetup
            ? challenge.SetupSecretProtected
            : challenge.User.MfaSecretProtected;
        if (!string.IsNullOrWhiteSpace(protectedSecret))
        {
            try
            {
                if (TotpMfaService.VerifyCode(_mfaProtector.Unprotect(protectedSecret), code))
                    return true;
            }
            catch
            {
                return false;
            }
        }

        if (challenge.IsSetup) return false;
        var recovery = await _db.MfaRecoveryCodes
            .FirstOrDefaultAsync(x =>
                x.UserId == challenge.UserId &&
                x.CodeHash == HashToken(NormalizeRecoveryCode(code)) &&
                x.UsedAt == null);
        if (recovery == null) return false;
        recovery.UsedAt = DateTime.UtcNow;
        return true;
    }

    private async Task<LoginResponse> CreateMfaChallengeAsync(User user)
    {
        var setupRequired = string.IsNullOrWhiteSpace(user.MfaSecretProtected);
        var setupSecret = setupRequired ? TotpMfaService.GenerateSecret() : null;
        var challengeToken = GenerateUrlSafeToken(32);
        var expiryMinutes = Math.Clamp(_config.GetValue("MfaSettings:ChallengeExpiryMinutes", 5), 1, 30);
        _db.MfaLoginChallenges.Add(new MfaLoginChallenge
        {
            UserId = user.Id,
            ChallengeTokenHash = HashToken(challengeToken),
            IsSetup = setupRequired,
            SetupSecretProtected = setupSecret == null ? null : _mfaProtector.Protect(setupSecret),
            ExpiresAt = DateTime.UtcNow.AddMinutes(expiryMinutes)
        });
        await _db.SaveChangesAsync();

        return new LoginResponse
        {
            RequiresMfa = true,
            MfaChallengeToken = challengeToken,
            MfaSetupRequired = setupRequired,
            MfaSetupSecret = setupSecret,
            MfaProvisioningUri = setupSecret == null
                ? null
                : TotpMfaService.GenerateProvisioningUri("AIGuard", user.Email, setupSecret)
        };
    }

    private LoginResponse IssueTokens(User user)
    {
        var refreshToken = GenerateUrlSafeToken(64);
        var expiresAt = DateTime.UtcNow.AddDays(_config.GetValue("JwtSettings:RefreshExpiryDays", 7));
        _db.RefreshSessions.Add(new RefreshSession
        {
            UserId = user.Id,
            TokenHash = HashToken(refreshToken),
            IpAddress = _http.HttpContext?.Connection.RemoteIpAddress?.ToString(),
            UserAgent = Truncate(_http.HttpContext?.Request.Headers.UserAgent.ToString(), 500),
            ExpiresAt = expiresAt,
            TenantCode = user.TenantCode
        });

        user.RefreshToken = null;
        user.RefreshTokenExpiry = null;
        return new LoginResponse
        {
            RequiresMfa = false,
            AccessToken = GenerateJwtToken(user),
            RefreshToken = refreshToken,
            ExpiresAt = DateTime.UtcNow.AddMinutes(_config.GetValue("JwtSettings:ExpiryMinutes", 60)),
            User = MapToProfile(user)
        };
    }

    private async Task<List<string>> ReplaceRecoveryCodesAsync(User user)
    {
        await _db.MfaRecoveryCodes.Where(x => x.UserId == user.Id).ExecuteDeleteAsync();
        var rawCodes = Enumerable.Range(0, 8)
            .Select(_ => $"{GenerateReadableCode(5)}-{GenerateReadableCode(5)}")
            .ToList();
        _db.MfaRecoveryCodes.AddRange(rawCodes.Select(code => new MfaRecoveryCode
        {
            UserId = user.Id,
            CodeHash = HashToken(NormalizeRecoveryCode(code)),
            TenantCode = user.TenantCode
        }));
        return rawCodes;
    }

    private async Task RegisterFailedLoginAsync(User user, DateTime now)
    {
        user.FailedLoginAttempts++;
        user.LastFailedLoginAt = now;
        var maximum = Math.Clamp(_config.GetValue("Authentication:MaxFailedLoginAttempts", 5), 3, 20);
        if (user.FailedLoginAttempts >= maximum)
            user.LockoutEnd = now.AddMinutes(
                Math.Clamp(_config.GetValue("Authentication:LockoutMinutes", 15), 1, 1440));
        await _db.SaveChangesAsync();
    }

    private async Task<bool> TenantAllowsLoginAsync(User user)
    {
        if (user.Role == "PlatformAdmin") return true;
        var status = await _db.Tenants.IgnoreQueryFilters()
            .Where(x => x.Code == user.TenantCode)
            .Select(x => x.Status)
            .FirstOrDefaultAsync();
        return status is not ("Suspended" or "Expired" or "Cancelled");
    }

    private string GenerateJwtToken(User user)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_config["JwtSettings:Secret"]!));
        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new Claim(JwtRegisteredClaimNames.Email, user.Email),
            new Claim(ClaimTypes.Name, user.FullName),
            new Claim(ClaimTypes.Role, user.Role),
            new Claim("departmentId", user.DepartmentId?.ToString() ?? string.Empty),
            new Claim("tenantCode", user.TenantCode),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };
        var token = new JwtSecurityToken(
            _config["JwtSettings:Issuer"],
            _config["JwtSettings:Audience"],
            claims,
            expires: DateTime.UtcNow.AddMinutes(_config.GetValue("JwtSettings:ExpiryMinutes", 60)),
            signingCredentials: new SigningCredentials(key, SecurityAlgorithms.HmacSha256));
        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private int MaxMfaAttempts() =>
        Math.Clamp(_config.GetValue("MfaSettings:MaxAttempts", 5), 3, 10);

    private static bool ProviderMatches(string configured, string provider) =>
        OidcTokenValidatorService.NormalizeProvider(configured)
            .Equals(provider, StringComparison.OrdinalIgnoreCase) ||
        configured.Equals("OIDC", StringComparison.OrdinalIgnoreCase);

    private static void ResetFailedLogin(User user)
    {
        user.FailedLoginAttempts = 0;
        user.LastFailedLoginAt = null;
        user.LockoutEnd = null;
    }

    private static string NormalizeTenant(string value) =>
        string.IsNullOrWhiteSpace(value) ? "DEFAULT" : value.Trim().ToUpperInvariant();

    private static string NormalizeRecoveryCode(string value) =>
        value.Replace("-", string.Empty).Replace(" ", string.Empty).ToUpperInvariant();

    private static string GenerateReadableCode(int length)
    {
        const string alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        return new string(RandomNumberGenerator.GetBytes(length)
            .Select(x => alphabet[x % alphabet.Length]).ToArray());
    }

    private static string GenerateUrlSafeToken(int byteCount) =>
        Convert.ToBase64String(RandomNumberGenerator.GetBytes(byteCount))
            .TrimEnd('=').Replace('+', '-').Replace('/', '_');

    private static string HashToken(string token) =>
        Convert.ToHexStringLower(SHA256.HashData(Encoding.UTF8.GetBytes(token)));

    private static string? Truncate(string? value, int length) =>
        string.IsNullOrWhiteSpace(value) ? null :
        value.Length <= length ? value : value[..length];

    private static UserProfileResponse MapToProfile(User user) => new()
    {
        Id = user.Id,
        FullName = user.FullName,
        Email = user.Email,
        Role = user.Role,
        DepartmentName = user.Department?.Name,
        DepartmentId = user.DepartmentId,
        IsActive = user.IsActive,
        MfaRequired = user.MfaRequired,
        MfaEnabled = user.MfaEnabled,
        AuthProvider = user.AuthProvider
    };
}
