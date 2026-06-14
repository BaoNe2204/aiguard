using System.IdentityModel.Tokens.Jwt;
using Microsoft.IdentityModel.Protocols;
using Microsoft.IdentityModel.Protocols.OpenIdConnect;
using Microsoft.IdentityModel.Tokens;

namespace aiguard_api.Services;

public sealed record OidcIdentity(string Subject, string Email, string? DisplayName);

public interface IOidcTokenValidatorService
{
    Task<OidcIdentity?> ValidateAsync(string provider, string idToken, CancellationToken cancellationToken = default);
}

public class OidcTokenValidatorService : IOidcTokenValidatorService
{
    private readonly IConfiguration _configuration;
    private readonly Dictionary<string, ConfigurationManager<OpenIdConnectConfiguration>> _managers =
        new(StringComparer.OrdinalIgnoreCase);
    private readonly object _lock = new();

    public OidcTokenValidatorService(IConfiguration configuration) => _configuration = configuration;

    public async Task<OidcIdentity?> ValidateAsync(
        string provider,
        string idToken,
        CancellationToken cancellationToken = default)
    {
        var normalized = NormalizeProvider(provider);
        var section = _configuration.GetSection($"SsoProviders:{normalized}");
        if (!section.GetValue("Enabled", false)) return null;

        var clientId = section["ClientId"];
        var authority = section["Authority"]?.TrimEnd('/');
        if (string.IsNullOrWhiteSpace(clientId) || string.IsNullOrWhiteSpace(authority))
            return null;

        var manager = GetManager(normalized, authority);
        var oidc = await manager.GetConfigurationAsync(cancellationToken);
        var parameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKeys = oidc.SigningKeys,
            ValidateAudience = true,
            ValidAudience = clientId,
            ValidateIssuer = true,
            IssuerValidator = (issuer, _, _) => ValidateIssuer(normalized, issuer, oidc.Issuer),
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromMinutes(2)
        };

        try
        {
            var principal = new JwtSecurityTokenHandler().ValidateToken(idToken, parameters, out _);
            var subject = principal.FindFirst("sub")?.Value;
            var email = principal.FindFirst("email")?.Value ??
                principal.FindFirst("preferred_username")?.Value ??
                principal.FindFirst("upn")?.Value;
            if (string.IsNullOrWhiteSpace(subject) || string.IsNullOrWhiteSpace(email))
                return null;

            return new OidcIdentity(
                subject,
                email.Trim().ToLowerInvariant(),
                principal.FindFirst("name")?.Value);
        }
        catch (SecurityTokenException)
        {
            return null;
        }
        catch (ArgumentException)
        {
            return null;
        }
    }

    private ConfigurationManager<OpenIdConnectConfiguration> GetManager(string provider, string authority)
    {
        lock (_lock)
        {
            if (_managers.TryGetValue(provider, out var manager)) return manager;
            manager = new ConfigurationManager<OpenIdConnectConfiguration>(
                $"{authority}/.well-known/openid-configuration",
                new OpenIdConnectConfigurationRetriever());
            _managers[provider] = manager;
            return manager;
        }
    }

    private static string ValidateIssuer(string provider, string issuer, string configuredIssuer)
    {
        if (provider == "Google" &&
            issuer is "https://accounts.google.com" or "accounts.google.com")
            return issuer;
        if (provider == "Microsoft" &&
            issuer.StartsWith("https://login.microsoftonline.com/", StringComparison.OrdinalIgnoreCase) &&
            issuer.EndsWith("/v2.0", StringComparison.OrdinalIgnoreCase))
            return issuer;
        if (string.Equals(issuer, configuredIssuer, StringComparison.OrdinalIgnoreCase))
            return issuer;
        throw new SecurityTokenInvalidIssuerException("OIDC issuer is not trusted.");
    }

    public static string NormalizeProvider(string provider) =>
        provider.Trim().ToLowerInvariant() switch
        {
            "microsoft" or "entra" or "azuread" or "microsoftentra" => "Microsoft",
            "google" or "googleworkspace" => "Google",
            _ => provider.Trim()
        };
}
