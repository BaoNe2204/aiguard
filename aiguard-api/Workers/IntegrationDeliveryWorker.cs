using System.Net;
using System.Net.Mail;
using System.Net.Sockets;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.EntityFrameworkCore;
using aiguard_api.Data;
using aiguard_api.Models;

namespace aiguard_api.Workers;

public class IntegrationDeliveryWorker : BackgroundService
{
    private readonly IServiceProvider _services;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IDataProtector _protector;
    private readonly ILogger<IntegrationDeliveryWorker> _logger;
    private readonly TimeSpan _interval;

    public IntegrationDeliveryWorker(
        IServiceProvider services,
        IHttpClientFactory httpClientFactory,
        IDataProtectionProvider dataProtection,
        ILogger<IntegrationDeliveryWorker> logger,
        IConfiguration configuration)
    {
        _services = services;
        _httpClientFactory = httpClientFactory;
        _protector = dataProtection.CreateProtector("AIGuard.IntegrationSecrets.v1");
        _logger = logger;
        _interval = TimeSpan.FromSeconds(Math.Max(
            10, configuration.GetValue("GovernanceWorkers:IntegrationIntervalSeconds", 30)));
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await QueueAndDeliverAsync(stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Integration delivery cycle failed");
            }

            await Task.Delay(_interval, stoppingToken);
        }
    }

    private async Task QueueAndDeliverAsync(CancellationToken cancellationToken)
    {
        using var scope = _services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AiguardDbContext>();
        var integrations = await db.IntegrationEndpoints.IgnoreQueryFilters()
            .Where(x => x.IsEnabled).AsNoTracking().ToListAsync(cancellationToken);

        foreach (var integration in integrations)
        {
            var auditIds = await db.AuditLogs.IgnoreQueryFilters()
                .Where(x => x.TenantCode == integration.TenantCode &&
                    x.CreatedAt >= integration.CreatedAt &&
                    !db.IntegrationDeliveries.IgnoreQueryFilters().Any(d =>
                        d.IntegrationEndpointId == integration.Id && d.AuditLogId == x.Id))
                .OrderBy(x => x.CreatedAt)
                .Select(x => x.Id)
                .Take(500)
                .ToListAsync(cancellationToken);

            if (auditIds.Count > 0)
            {
                db.IntegrationDeliveries.AddRange(auditIds.Select(auditId => new IntegrationDelivery
                {
                    IntegrationEndpointId = integration.Id,
                    AuditLogId = auditId,
                    TenantCode = integration.TenantCode
                }));
                await db.SaveChangesAsync(cancellationToken);
            }
        }

        var now = DateTime.UtcNow;
        var pending = await db.IntegrationDeliveries.IgnoreQueryFilters()
            .Include(x => x.IntegrationEndpoint)
            .Include(x => x.AuditLog)
            .Where(x => x.Status != "Delivered" && x.AttemptCount < 8 && x.NextAttemptAt <= now &&
                x.IntegrationEndpoint.IsEnabled)
            .OrderBy(x => x.CreatedAt)
            .Take(100)
            .ToListAsync(cancellationToken);

        foreach (var delivery in pending)
        {
            try
            {
                await DeliverAsync(delivery.IntegrationEndpoint, delivery.AuditLog, cancellationToken);
                delivery.Status = "Delivered";
                delivery.DeliveredAt = DateTime.UtcNow;
                delivery.LastError = null;
                delivery.IntegrationEndpoint.LastSuccessAt = DateTime.UtcNow;
            }
            catch (Exception ex)
            {
                delivery.Status = "Retrying";
                delivery.LastError = ex.Message[..Math.Min(ex.Message.Length, 2000)];
                delivery.NextAttemptAt = DateTime.UtcNow.AddMinutes(Math.Min(60, Math.Pow(2, delivery.AttemptCount)));
                delivery.IntegrationEndpoint.LastFailureAt = DateTime.UtcNow;
                delivery.IntegrationEndpoint.LastError = delivery.LastError;
                _logger.LogWarning(ex, "Delivery {DeliveryId} to {Integration} failed", delivery.Id, delivery.IntegrationEndpoint.Name);
            }

            delivery.AttemptCount++;
            delivery.LastAttemptAt = DateTime.UtcNow;
            await db.SaveChangesAsync(cancellationToken);
        }
    }

    private async Task DeliverAsync(
        IntegrationEndpoint integration,
        AuditLog auditLog,
        CancellationToken cancellationToken)
    {
        var secret = string.IsNullOrWhiteSpace(integration.ProtectedSecret)
            ? null
            : _protector.Unprotect(integration.ProtectedSecret);
        var payload = new
        {
            source = "AIGuard Control Tower",
            tenant = auditLog.TenantCode,
            id = auditLog.Id,
            auditLog.EventType,
            auditLog.ActorType,
            auditLog.ActorEmail,
            auditLog.RiskLevel,
            auditLog.Decision,
            auditLog.EventJson,
            auditLog.EventHash,
            auditLog.CreatedAt
        };
        var json = JsonSerializer.Serialize(payload, new JsonSerializerOptions(JsonSerializerDefaults.Web));

        if (integration.Type == "Syslog")
        {
            await SendSyslogAsync(integration.Endpoint, json, cancellationToken);
            return;
        }

        if (integration.Type == "Email")
        {
            await SendEmailAsync(integration, secret, json);
            return;
        }

        var body = integration.Type switch
        {
            "Slack" => JsonSerializer.Serialize(new { text = FormatSummary(auditLog) }),
            "Teams" => JsonSerializer.Serialize(new { text = FormatSummary(auditLog) }),
            "Splunk" => JsonSerializer.Serialize(new { @event = payload, sourcetype = "aiguard:audit" }),
            _ => json
        };
        using var request = new HttpRequestMessage(HttpMethod.Post, integration.Endpoint)
        {
            Content = new StringContent(body, Encoding.UTF8, "application/json")
        };
        if (!string.IsNullOrWhiteSpace(secret))
        {
            if (integration.Type == "Splunk")
                request.Headers.TryAddWithoutValidation("Authorization", $"Splunk {secret}");
            else
                request.Headers.TryAddWithoutValidation(
                    "X-AIGuard-Signature",
                    Convert.ToHexStringLower(HMACSHA256.HashData(
                        Encoding.UTF8.GetBytes(secret), Encoding.UTF8.GetBytes(body))));
        }

        var response = await _httpClientFactory.CreateClient("IntegrationDelivery")
            .SendAsync(request, cancellationToken);
        response.EnsureSuccessStatusCode();
    }

    private static async Task SendSyslogAsync(string endpoint, string message, CancellationToken cancellationToken)
    {
        var uri = new Uri(endpoint);
        var bytes = Encoding.UTF8.GetBytes($"<134>1 {DateTime.UtcNow:O} aiguard control-tower - - - {message}");
        if (uri.Scheme.Equals("tcp", StringComparison.OrdinalIgnoreCase))
        {
            using var client = new TcpClient();
            await client.ConnectAsync(uri.Host, uri.Port, cancellationToken);
            await client.GetStream().WriteAsync(bytes, cancellationToken);
            return;
        }

        using var udp = new UdpClient();
        await udp.SendAsync(bytes, new IPEndPoint(
            (await Dns.GetHostAddressesAsync(uri.Host, cancellationToken))[0], uri.Port), cancellationToken);
    }

    private static async Task SendEmailAsync(IntegrationEndpoint integration, string? password, string body)
    {
        var uri = new Uri(integration.Endpoint);
        var config = ParseConfiguration(integration.ConfigurationJson);
        var from = config.GetValueOrDefault("from") ?? "aiguard@localhost";
        var to = config.GetValueOrDefault("to")
            ?? throw new InvalidOperationException("Email integration requires configurationJson.to");
        using var message = new MailMessage(from, to, $"AIGuard event {DateTime.UtcNow:O}", body);
        using var client = new SmtpClient(uri.Host, uri.IsDefaultPort ? 25 : uri.Port)
        {
            EnableSsl = bool.TryParse(config.GetValueOrDefault("enableSsl"), out var ssl) && ssl
        };
        if (config.TryGetValue("username", out var username))
            client.Credentials = new NetworkCredential(username, password);
        await client.SendMailAsync(message);
    }

    private static Dictionary<string, string> ParseConfiguration(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return new(StringComparer.OrdinalIgnoreCase);
        return JsonSerializer.Deserialize<Dictionary<string, string>>(json)
            ?? new(StringComparer.OrdinalIgnoreCase);
    }

    private static string FormatSummary(AuditLog log) =>
        $"AIGuard {log.RiskLevel ?? "Info"}: {log.EventType} / {log.Decision ?? "Recorded"} / {log.ActorEmail ?? log.ActorType}";
}
