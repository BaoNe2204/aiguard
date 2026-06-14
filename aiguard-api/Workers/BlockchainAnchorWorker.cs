using System.Data;
using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using aiguard_api.Data;
using aiguard_api.Models;
using aiguard_api.Services;

namespace aiguard_api.Workers;

public class BlockchainAnchorWorker : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<BlockchainAnchorWorker> _logger;
    private readonly TimeSpan _interval;
    private readonly int _maxRetries;
    private readonly int _retryBaseSeconds;
    private readonly int _batchSize;

    public BlockchainAnchorWorker(
        IServiceProvider serviceProvider,
        ILogger<BlockchainAnchorWorker> logger,
        IConfiguration config)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
        var intervalSeconds = config.GetValue<int?>("BlockchainSettings:AnchorIntervalSeconds");
        _interval = intervalSeconds is > 0
            ? TimeSpan.FromSeconds(intervalSeconds.Value)
            : TimeSpan.FromMinutes(Math.Max(1, config.GetValue("BlockchainSettings:AnchorIntervalMinutes", 5)));
        _maxRetries = Math.Clamp(config.GetValue("BlockchainSettings:MaxRetries", 8), 1, 50);
        _retryBaseSeconds = Math.Clamp(config.GetValue("BlockchainSettings:RetryBaseSeconds", 30), 1, 3600);
        _batchSize = Math.Clamp(config.GetValue("BlockchainSettings:BatchSize", 1000), 1, 10000);
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("BlockchainAnchorWorker started. Interval: {Interval}", _interval);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await ProcessAsync(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in BlockchainAnchorWorker");
            }

            await Task.Delay(_interval, stoppingToken);
        }
    }

    private async Task ProcessAsync(CancellationToken cancellationToken)
    {
        using var scope = _serviceProvider.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AiguardDbContext>();
        var chain = scope.ServiceProvider.GetRequiredService<IEvmBlockchainAnchorClient>();

        await RetryFailedBatchesAsync(db, chain, cancellationToken);
        await ClaimAndAnchorPendingLogsAsync(db, chain, cancellationToken);
    }

    private async Task RetryFailedBatchesAsync(
        AiguardDbContext db,
        IEvmBlockchainAnchorClient chain,
        CancellationToken cancellationToken)
    {
        if (!chain.IsEnabled) return;

        var now = DateTime.UtcNow;
        var retryIds = await db.BlockchainBatches.IgnoreQueryFilters()
            .Where(x => x.Status == "Failed" &&
                x.RetryCount < _maxRetries &&
                (x.NextRetryAt == null || x.NextRetryAt <= now))
            .OrderBy(x => x.NextRetryAt)
            .Select(x => x.Id)
            .Take(20)
            .ToListAsync(cancellationToken);

        foreach (var batchId in retryIds)
        {
            var batch = await db.BlockchainBatches.IgnoreQueryFilters()
                .FirstOrDefaultAsync(x => x.Id == batchId, cancellationToken);
            if (batch != null)
                await AnchorBatchAsync(db, chain, batch, cancellationToken);
        }
    }

    private async Task ClaimAndAnchorPendingLogsAsync(
        AiguardDbContext db,
        IEvmBlockchainAnchorClient chain,
        CancellationToken cancellationToken)
    {
        List<Guid> batchIds = [];

        await using (var transaction = await db.Database.BeginTransactionAsync(
            IsolationLevel.Serializable, cancellationToken))
        {
            var pendingLogs = await db.AuditLogs.IgnoreQueryFilters()
                .Where(x => x.BlockchainBatchId == null)
                .OrderBy(x => x.CreatedAt)
                .Take(_batchSize)
                .ToListAsync(cancellationToken);

            foreach (var tenantLogs in pendingLogs.GroupBy(x => x.TenantCode))
            {
                var logs = tenantLogs.ToList();
                var batch = new BlockchainBatch
                {
                    LogCount = logs.Count,
                    BatchHash = ComputeSha256(string.Concat(logs.Select(x => x.EventHash))),
                    Status = chain.IsEnabled ? "Pending" : "LocalAnchored",
                    AnchoredAt = chain.IsEnabled ? null : DateTime.UtcNow,
                    TenantCode = tenantLogs.Key
                };

                db.BlockchainBatches.Add(batch);
                foreach (var log in logs)
                    log.BlockchainBatchId = batch.Id;
                batchIds.Add(batch.Id);
            }

            await db.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);
        }

        foreach (var batchId in batchIds)
        {
            var batch = await db.BlockchainBatches.IgnoreQueryFilters()
                .FirstAsync(x => x.Id == batchId, cancellationToken);
            if (chain.IsEnabled)
                await AnchorBatchAsync(db, chain, batch, cancellationToken);
            else
                LogBatch(batch);
        }
    }

    private async Task AnchorBatchAsync(
        AiguardDbContext db,
        IEvmBlockchainAnchorClient chain,
        BlockchainBatch batch,
        CancellationToken cancellationToken)
    {
        batch.LastAttemptAt = DateTime.UtcNow;
        batch.NextRetryAt = null;

        try
        {
            var transaction = await chain.AnchorAsync(
                batch.BatchHash,
                $"aiguard:{batch.TenantCode}:{batch.Id:N}:{batch.LogCount}");
            batch.Status = "Anchored";
            batch.TransactionHash = transaction.TransactionHash;
            batch.BlockNumber = transaction.BlockNumber;
            batch.AnchoredAt = DateTime.UtcNow;
            batch.LastError = null;
        }
        catch (Exception ex)
        {
            batch.Status = "Failed";
            batch.RetryCount++;
            batch.LastError = ex.Message.Length > 2000 ? ex.Message[..2000] : ex.Message;
            if (batch.RetryCount < _maxRetries)
            {
                var delay = Math.Min(
                    3600,
                    _retryBaseSeconds * Math.Pow(2, Math.Min(batch.RetryCount - 1, 10)));
                batch.NextRetryAt = DateTime.UtcNow.AddSeconds(delay);
            }

            _logger.LogError(
                ex,
                "Failed blockchain batch {BatchId}; retry {RetryCount}/{MaxRetries} at {NextRetryAt}",
                batch.Id,
                batch.RetryCount,
                _maxRetries,
                batch.NextRetryAt);
        }

        await db.SaveChangesAsync(cancellationToken);
        LogBatch(batch);
    }

    private void LogBatch(BlockchainBatch batch) =>
        _logger.LogInformation(
            "Blockchain batch {BatchId}: {Status}, {LogCount} logs, hash {BatchHash}",
            batch.Id,
            batch.Status,
            batch.LogCount,
            batch.BatchHash);

    private static string ComputeSha256(string input) =>
        Convert.ToHexStringLower(SHA256.HashData(Encoding.UTF8.GetBytes(input)));
}
