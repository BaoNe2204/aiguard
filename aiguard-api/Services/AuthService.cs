using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using aiguard_api.Data;
using aiguard_api.DTOs.Auth;
using aiguard_api.Models;
using Microsoft.AspNetCore.DataProtection;

namespace aiguard_api.Services;

public interface IAuthService
{
    Task<LoginResponse?> LoginAsync(LoginRequest request);
    Task<LoginResponse?> VerifyMfaAsync(MfaVerifyRequest request);
    Task<LoginResponse?> RefreshTokenAsync(string refreshToken);
    Task<UserProfileResponse?> GetProfileAsync(Guid userId);
    Task<string?> ForgotPasswordAsync(string email);
    Task<bool> ResetPasswordAsync(ResetPasswordRequest request);
}

public class AuthService : IAuthService
{
    private readonly AiguardDbContext _db;
    private readonly IConfiguration _config;
    private readonly IDataScopeContext _scope;
    private readonly IDataProtector _mfaProtector;

    public AuthService(
        AiguardDbContext db,
        IConfiguration config,
        IDataScopeContext scope,
        IDataProtectionProvider dataProtectionProvider)
    {
        _db = db;
        _config = config;
        _scope = scope;
        _mfaProtector = dataProtectionProvider.CreateProtector("AIGuard.MfaSecrets.v1");
    }

    public async Task<LoginResponse?> LoginAsync(LoginRequest request)
    {
        _scope.SetEndpointScope(request.TenantCode.Trim().ToUpperInvariant(), null);
        var user = await _db.Users
            .Include(u => u.Department)
            .FirstOrDefaultAsync(u => u.Email == request.Email && u.IsActive);

        if (user == null || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
            return null;

        if (user.MfaRequired || user.MfaEnabled)
            return await CreateMfaChallengeAsync(user);

        var response = IssueTokens(user);
        user.LastLoginAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return response;
    }

    public async Task<LoginResponse?> VerifyMfaAsync(MfaVerifyRequest request)
    {
        _scope.SetEndpointScope(request.TenantCode.Trim().ToUpperInvariant(), null);
        var challengeHash = HashToken(request.ChallengeToken);
        var challenge = await _db.MfaLoginChallenges
            .Include(c => c.User)
            .ThenInclude(u => u.Department)
            .FirstOrDefaultAsync(c =>
                c.ChallengeTokenHash == challengeHash &&
                c.ConsumedAt == null &&
                c.ExpiresAt > DateTime.UtcNow &&
                c.User.IsActive);

        if (challenge == null) return null;

        var user = challenge.User;
        var protectedSecret = challenge.IsSetup ? challenge.SetupSecretProtected : user.MfaSecretProtected;
        if (string.IsNullOrWhiteSpace(protectedSecret)) return null;

        string secret;
        try
        {
            secret = _mfaProtector.Unprotect(protectedSecret);
        }
        catch
        {
            return null;
        }

        if (!TotpMfaService.VerifyCode(secret, request.Code)) return null;

        if (challenge.IsSetup)
        {
            user.MfaSecretProtected = challenge.SetupSecretProtected;
            user.MfaEnabled = true;
            user.MfaRequired = true;
            user.MfaEnabledAt = DateTime.UtcNow;
        }

        challenge.ConsumedAt = DateTime.UtcNow;
        var response = IssueTokens(user);
        user.LastLoginAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return response;
    }

    private async Task<LoginResponse> CreateMfaChallengeAsync(User user)
    {
        var setupRequired = string.IsNullOrWhiteSpace(user.MfaSecretProtected);
        var setupSecret = setupRequired ? TotpMfaService.GenerateSecret() : null;
        var challengeToken = GenerateUrlSafeToken(32);
        var expiryMinutes = _config.GetValue<int>("MfaSettings:ChallengeExpiryMinutes", 5);

        _db.MfaLoginChallenges.Add(new MfaLoginChallenge
        {
            UserId = user.Id,
            ChallengeTokenHash = HashToken(challengeToken),
            IsSetup = setupRequired,
            SetupSecretProtected = setupSecret == null ? null : _mfaProtector.Protect(setupSecret),
            ExpiresAt = DateTime.UtcNow.AddMinutes(Math.Clamp(expiryMinutes, 1, 30))
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

    public async Task<LoginResponse?> RefreshTokenAsync(string refreshToken)
    {
        var refreshTokenHash = HashToken(refreshToken);
        var user = await _db.Users.IgnoreQueryFilters()
            .Include(u => u.Department)
            .FirstOrDefaultAsync(u => u.RefreshToken == refreshTokenHash && u.RefreshTokenExpiry > DateTime.UtcNow && u.IsActive);

        if (user == null) return null;

        var response = IssueTokens(user);
        await _db.SaveChangesAsync();

        return response;
    }

    public async Task<UserProfileResponse?> GetProfileAsync(Guid userId)
    {
        var user = await _db.Users
            .Include(u => u.Department)
            .FirstOrDefaultAsync(u => u.Id == userId);

        return user == null ? null : MapToProfile(user);
    }

    public async Task<string?> ForgotPasswordAsync(string email)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == email && u.IsActive);
        if (user == null) return null;

        var rawToken = GenerateRefreshToken();
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
        var tokenHash = HashToken(request.Token);
        var resetToken = await _db.PasswordResetTokens
            .Include(t => t.User)
            .FirstOrDefaultAsync(t => t.TokenHash == tokenHash
                && t.UsedAt == null
                && t.ExpiresAt > DateTime.UtcNow
                && t.User.Email == request.Email
                && t.User.IsActive);
        if (resetToken == null) return false;

        resetToken.User.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
        resetToken.User.RefreshToken = null;
        resetToken.User.RefreshTokenExpiry = null;
        resetToken.UsedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return true;
    }

    private string GenerateJwtToken(User user)
    {
        var secret = _config["JwtSettings:Secret"]!;
        var issuer = _config["JwtSettings:Issuer"]!;
        var audience = _config["JwtSettings:Audience"]!;
        var expiryMinutes = _config.GetValue<int>("JwtSettings:ExpiryMinutes", 60);

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new Claim(JwtRegisteredClaimNames.Email, user.Email),
            new Claim(ClaimTypes.Name, user.FullName),
            new Claim(ClaimTypes.Role, user.Role),
            new Claim("departmentId", user.DepartmentId?.ToString() ?? ""),
            new Claim("tenantCode", user.TenantCode),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };

        var token = new JwtSecurityToken(
            issuer: issuer,
            audience: audience,
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(expiryMinutes),
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private static string GenerateRefreshToken()
    {
        var bytes = new byte[64];
        using var rng = RandomNumberGenerator.Create();
        rng.GetBytes(bytes);
        return Convert.ToBase64String(bytes);
    }

    private static string GenerateUrlSafeToken(int byteCount)
    {
        var bytes = new byte[byteCount];
        RandomNumberGenerator.Fill(bytes);
        return Convert.ToBase64String(bytes)
            .TrimEnd('=')
            .Replace('+', '-')
            .Replace('/', '_');
    }

    private static string HashToken(string token)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(token));
        return Convert.ToHexStringLower(bytes);
    }

    private LoginResponse IssueTokens(User user)
    {
        var accessToken = GenerateJwtToken(user);
        var refreshToken = GenerateRefreshToken();
        var expiryMinutes = _config.GetValue<int>("JwtSettings:ExpiryMinutes", 60);

        user.RefreshToken = HashToken(refreshToken);
        user.RefreshTokenExpiry = DateTime.UtcNow.AddDays(_config.GetValue<int>("JwtSettings:RefreshExpiryDays", 7));

        return new LoginResponse
        {
            RequiresMfa = false,
            AccessToken = accessToken,
            RefreshToken = refreshToken,
            ExpiresAt = DateTime.UtcNow.AddMinutes(expiryMinutes),
            User = MapToProfile(user)
        };
    }

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
