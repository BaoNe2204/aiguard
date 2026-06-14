using System.Net;
using System.Net.Mail;

namespace aiguard_api.Services;

public interface IEmailSender
{
    Task SendSignupVerificationAsync(
        string recipientEmail,
        string tenantCode,
        string ownerName,
        string verificationUrl,
        DateTime expiresAt);
}

public class EmailSenderService : IEmailSender
{
    private readonly IConfiguration _configuration;
    private readonly IWebHostEnvironment _environment;
    private readonly ILogger<EmailSenderService> _logger;

    public EmailSenderService(
        IConfiguration configuration,
        IWebHostEnvironment environment,
        ILogger<EmailSenderService> logger)
    {
        _configuration = configuration;
        _environment = environment;
        _logger = logger;
    }

    public async Task SendSignupVerificationAsync(
        string recipientEmail,
        string tenantCode,
        string ownerName,
        string verificationUrl,
        DateTime expiresAt)
    {
        var host = _configuration["Email:SmtpHost"];
        if (string.IsNullOrWhiteSpace(host))
        {
            _logger.LogInformation(
                "SMTP is not configured. Signup verification link for {RecipientEmail}: {VerificationUrl}",
                recipientEmail,
                verificationUrl);
            return;
        }

        var fromAddress = _configuration["Email:FromAddress"];
        if (string.IsNullOrWhiteSpace(fromAddress))
            throw new InvalidOperationException("Email:FromAddress must be configured when SMTP is enabled.");

        var fromName = _configuration["Email:FromName"] ?? "AIGuard Control Tower";
        var port = Math.Clamp(_configuration.GetValue("Email:SmtpPort", 587), 1, 65535);
        var enableSsl = _configuration.GetValue("Email:EnableSsl", true);
        var username = _configuration["Email:SmtpUsername"];
        var password = _configuration["Email:SmtpPassword"];

        using var message = new MailMessage
        {
            From = new MailAddress(fromAddress, fromName),
            Subject = $"Verify AIGuard tenant {tenantCode}",
            IsBodyHtml = true,
            Body = BuildSignupBody(ownerName, tenantCode, verificationUrl, expiresAt)
        };
        message.To.Add(recipientEmail);

        using var smtp = new SmtpClient(host, port)
        {
            EnableSsl = enableSsl
        };
        if (!string.IsNullOrWhiteSpace(username))
            smtp.Credentials = new NetworkCredential(username, password);

        try
        {
            await smtp.SendMailAsync(message);
        }
        catch (Exception ex)
        {
            if (_environment.IsDevelopment() || _environment.IsEnvironment("Testing"))
            {
                _logger.LogWarning(
                    ex,
                    "Failed to send signup verification email to {RecipientEmail}. Verification link: {VerificationUrl}",
                    recipientEmail,
                    verificationUrl);
                return;
            }

            throw;
        }
    }

    private static string BuildSignupBody(string ownerName, string tenantCode, string verificationUrl, DateTime expiresAt)
    {
        var safeName = WebUtility.HtmlEncode(ownerName);
        var safeTenant = WebUtility.HtmlEncode(tenantCode);
        var safeUrl = WebUtility.HtmlEncode(verificationUrl);
        var safeExpiry = WebUtility.HtmlEncode(expiresAt.ToString("yyyy-MM-dd HH:mm 'UTC'"));

        return $$"""
        <div style="font-family:Arial,sans-serif;line-height:1.6;color:#172033">
          <h2>Verify your AIGuard tenant</h2>
          <p>Hello {{safeName}},</p>
          <p>Your company tenant <strong>{{safeTenant}}</strong> has been created in trial mode.</p>
          <p>Please verify your email and set the first Tenant Owner password:</p>
          <p><a href="{{safeUrl}}" style="display:inline-block;padding:10px 16px;background:#2563eb;color:#fff;text-decoration:none;border-radius:8px">Verify account</a></p>
          <p>This link expires at {{safeExpiry}}.</p>
          <p>If you did not request this signup, please ignore this email.</p>
        </div>
        """;
    }
}
