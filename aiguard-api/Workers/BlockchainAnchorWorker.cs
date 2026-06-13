using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using aiguard_api.Data;
using aiguard_api.Models;
using aiguard_api.Services;

namespace aiguard_api.Workers;

/// <summary>
/// Background worker that runs every 5 minutes to:
/// 1. Collect un-anchored audit logs
/// 2. Compute BatchHash = SHA256(EventHash_1 + EventHash_2 + ... + EventHash_M)
/// 3. Create a BlockchainBatch record
/// 4. In production: send transaction to Smart Contract anchorBatch(bytes32 batchHash, string metadata)
/// </summary>
public class BlockchainAnchorWorker : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<BlockchainAnchorWorker> _logger;
    private readonly TimeSpan _interval;
    private readonly bool _onChainEnabled;

    public BlockchainAnchorWorker(IServiceProvider serviceProvider, ILogger<BlockchainAnchorWorker> logger, IConfiguration config)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
        var intervalSeconds = config.GetValue<int?>("BlockchainSettings:AnchorIntervalSeconds");
        _interval = intervalSeconds is > 0
            ? TimeSpan.FromSeconds(intervalSeconds.Value)
            : TimeSpan.FromMinutes(Math.Max(1, config.GetValue<int>("BlockchainSettings:AnchorIntervalMinutes", 5)));
        _onChainEnabled = config.GetValue<bool>("BlockchainSettings:Enabled", false);
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("BlockchainAnchorWorker started. Interval: {Interval}", _interval);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await AnchorPendingLogsAsync();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in BlockchainAnchorWorker");
            }

            await Task.Delay(_interval, stoppingToken);
        }
    }

    private async Task AnchorPendingLogsAsync()
    {
        using var scope = _serviceProvider.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AiguardDbContext>();
        var chain = scope.ServiceProvider.GetRequiredService<IEvmBlockchainAnchorClient>();

        // Get un-anchored audit logs
        var pendingLogs = await db.AuditLogs.IgnoreQueryFilters()
            .Where(l => l.BlockchainBatchId == null)
            .OrderBy(l => l.CreatedAt)
            .ToListAsync();

        if (pendingLogs.Count == 0)
        {
            _logger.LogDebug("No pending logs to anchor");
            return;
        }

        foreach (var tenantLogs in pendingLogs.GroupBy(l => l.TenantCode))
            await AnchorTenantLogsAsync(db, chain, tenantLogs.Key, tenantLogs.ToList());
    }

    private async Task AnchorTenantLogsAsync(
        AiguardDbContext db,
        IEvmBlockchainAnchorClient chain,
        string tenantCode,
        List<AuditLog> pendingLogs)
    {
        var concatenatedHashes = string.Join("", pendingLogs.Select(l => l.EventHash));
        var batchHash = ComputeSha256(concatenatedHashes);

        // Create batch record
        var batch = new BlockchainBatch
        {
            LogCount = pendingLogs.Count,
            BatchHash = batchHash,
            Status = _onChainEnabled ? "Pending" : "LocalAnchored",
            AnchoredAt = DateTime.UtcNow,
            TransactionHash = null,
            BlockNumber = null,
            TenantCode = tenantCode
        };

        db.BlockchainBatches.Add(batch);
        await db.SaveChangesAsync();

        if (chain.IsEnabled)
        {
            try
            {
                var transaction = await chain.AnchorAsync(batchHash, $"aiguard:{tenantCode}:{batch.Id:N}:{pendingLogs.Count}");
                batch.Status = "Anchored";
                batch.TransactionHash = transaction.TransactionHash;
                batch.BlockNumber = transaction.BlockNumber;
                batch.AnchoredAt = DateTime.UtcNow;
            }
            catch (Exception ex)
            {
                batch.Status = "Failed";
                _logger.LogError(ex, "Failed to anchor blockchain batch {BatchId}", batch.Id);
            }
        }

        // Link logs to batch
        foreach (var log in pendingLogs)
        {
            log.BlockchainBatchId = batch.Id;
        }
        await db.SaveChangesAsync();

        _logger.LogInformation(
            "Created {Status} batch {BatchId} with {LogCount} logs. BatchHash: {BatchHash}",
            batch.Status, batch.Id, batch.LogCount, batch.BatchHash);
    }

    private static string ComputeSha256(string input)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(input));
        return Convert.ToHexStringLower(bytes);
    }
}
