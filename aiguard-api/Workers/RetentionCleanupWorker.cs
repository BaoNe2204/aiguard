using Microsoft.EntityFrameworkCore;
using aiguard_api.Data;

namespace aiguard_api.Workers;

public class RetentionCleanupWorker : BackgroundService
{
    private readonly IServiceProvider _services;
    private readonly ILogger<RetentionCleanupWorker> _logger;
    private readonly TimeSpan _interval;

    public RetentionCleanupWorker(
        IServiceProvider services,
        ILogger<RetentionCleanupWorker> logger,
        IConfiguration configuration)
    {
        _services = services;
        _logger = logger;
        _interval = TimeSpan.FromHours(Math.Max(
            1, configuration.GetValue("GovernanceWorkers:RetentionIntervalHours", 24)));
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await CleanAsync(stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Retention cleanup failed");
            }

            await Task.Delay(_interval, stoppingToken);
        }
    }

    private async Task CleanAsync(CancellationToken cancellationToken)
    {
        using var scope = _services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AiguardDbContext>();
        var now = DateTime.UtcNow;
        var policies = await db.RetentionPolicies.IgnoreQueryFilters()
            .AsNoTracking().ToListAsync(cancellationToken);

        foreach (var policy in policies)
        {
            var tenant = policy.TenantCode;
            var endpointCutoff = now.AddDays(-policy.EndpointEventDays);
            var auditCutoff = now.AddDays(-policy.AuditLogDays);
            var notificationCutoff = now.AddDays(-policy.NotificationDays);
            var incidentCutoff = now.AddDays(-policy.IncidentDays);

            var deletedNotifications = await db.UserNotifications.IgnoreQueryFilters()
                .Where(x => x.TenantCode == tenant && x.CreatedAt < notificationCutoff)
                .ExecuteDeleteAsync(cancellationToken);

            var deletedIncidents = await db.IncidentCases.IgnoreQueryFilters()
                .Where(x => x.TenantCode == tenant && x.CreatedAt < incidentCutoff)
                .ExecuteDeleteAsync(cancellationToken);

            await db.IncidentCases.IgnoreQueryFilters()
                .Where(x => x.TenantCode == tenant && x.EndpointEvent != null &&
                    x.EndpointEvent.CreatedAt < endpointCutoff)
                .ExecuteUpdateAsync(setters => setters.SetProperty(x => x.EndpointEventId, (Guid?)null), cancellationToken);

            var deletedEvents = await db.EndpointEvents.IgnoreQueryFilters()
                .Where(x => x.TenantCode == tenant && x.CreatedAt < endpointCutoff)
                .ExecuteDeleteAsync(cancellationToken);

            var deletedAudit = await db.AuditLogs.IgnoreQueryFilters()
                .Where(x => x.TenantCode == tenant && x.CreatedAt < auditCutoff &&
                    x.BlockchainBatch != null &&
                    (x.BlockchainBatch.Status == "Anchored" ||
                     x.BlockchainBatch.Status == "LocalAnchored"))
                .ExecuteDeleteAsync(cancellationToken);

            _logger.LogInformation(
                "Retention tenant {Tenant}: {Events} events, {Audit} audit logs, {Notifications} notifications, {Incidents} incidents deleted",
                tenant, deletedEvents, deletedAudit, deletedNotifications, deletedIncidents);
        }

        await db.ScanReceipts.IgnoreQueryFilters()
            .Where(x => x.ExpiresAt < now)
            .ExecuteDeleteAsync(cancellationToken);
        await db.EnrollmentTokens.IgnoreQueryFilters()
            .Where(x => x.ExpiresAt < now || x.IsRevoked)
            .ExecuteDeleteAsync(cancellationToken);
        await db.PasswordResetTokens.IgnoreQueryFilters()
            .Where(x => x.ExpiresAt < now || x.UsedAt != null)
            .ExecuteDeleteAsync(cancellationToken);
        await db.TenantSignupVerificationTokens.IgnoreQueryFilters()
            .Where(x => x.ExpiresAt < now || x.UsedAt != null)
            .ExecuteDeleteAsync(cancellationToken);
        await db.PolicyListEntries.IgnoreQueryFilters()
            .Where(x => x.ExpiresAt != null && x.ExpiresAt < now)
            .ExecuteDeleteAsync(cancellationToken);
        await db.ExactDataMatchRecords.IgnoreQueryFilters()
            .Where(x => x.ExpiresAt != null && x.ExpiresAt < now)
            .ExecuteDeleteAsync(cancellationToken);
    }
}
