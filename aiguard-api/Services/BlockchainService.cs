using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using aiguard_api.Data;
using aiguard_api.DTOs.Audit;
using aiguard_api.DTOs.Common;
using aiguard_api.Models;

namespace aiguard_api.Services;

public interface IBlockchainService
{
    Task<PagedResult<BlockchainBatchResponse>> GetBatchesAsync(PagedQuery query);
    Task<VerifyBatchResponse> VerifyBatchAsync(Guid batchId);
}

public class BlockchainService : IBlockchainService
{
    private readonly AiguardDbContext _db;
    private readonly IEvmBlockchainAnchorClient _chain;

    public BlockchainService(AiguardDbContext db, IEvmBlockchainAnchorClient chain)
    {
        _db = db;
        _chain = chain;
    }

    public async Task<PagedResult<BlockchainBatchResponse>> GetBatchesAsync(PagedQuery query)
    {
        var q = _db.BlockchainBatches.OrderByDescending(b => b.CreatedAt).AsQueryable();

        var total = await q.CountAsync();
        var items = await q
            .Skip((query.Page - 1) * query.PageSize)
            .Take(query.PageSize)
            .Select(b => new BlockchainBatchResponse
            {
                Id = b.Id,
                LogCount = b.LogCount,
                BatchHash = b.BatchHash,
                TransactionHash = b.TransactionHash,
                BlockNumber = b.BlockNumber,
                Status = b.Status,
                CreatedAt = b.CreatedAt,
                AnchoredAt = b.AnchoredAt,
                LastAttemptAt = b.LastAttemptAt,
                NextRetryAt = b.NextRetryAt,
                RetryCount = b.RetryCount,
                LastError = b.LastError
            })
            .ToListAsync();

        return new PagedResult<BlockchainBatchResponse> { Items = items, TotalCount = total, Page = query.Page, PageSize = query.PageSize };
    }

    public async Task<VerifyBatchResponse> VerifyBatchAsync(Guid batchId)
    {
        var batch = await _db.BlockchainBatches.FindAsync(batchId);
        if (batch == null)
            return new VerifyBatchResponse { BatchId = batchId, VerificationStatus = "NotFound", VerifiedAt = DateTime.UtcNow };

        // Recompute BatchHash from current DB audit logs
        var logs = await _db.AuditLogs
            .Where(l => l.BlockchainBatchId == batchId)
            .OrderBy(l => l.CreatedAt)
            .Select(l => l.EventHash)
            .ToListAsync();

        var concatenated = string.Join("", logs);
        var computedHash = ComputeSha256(concatenated);

        var isMatch = computedHash == batch.BatchHash;
        var verificationStatus = batch.Status switch
        {
            "Anchored" when !_chain.IsEnabled => "BlockchainUnavailable",
            "Anchored" => await _chain.VerifyOnChainAsync(batch.BatchHash)
                ? "VerifiedOnChain"
                : "OnChainMismatch",
            "LocalAnchored" => "VerifiedLocal",
            "Failed" => "AnchorFailed",
            _ => "AnchorPending"
        };
        isMatch = isMatch && verificationStatus is "VerifiedOnChain" or "VerifiedLocal";

        return new VerifyBatchResponse
        {
            BatchId = batchId,
            BatchHash = batch.BatchHash,
            ComputedHash = computedHash,
            IsMatch = isMatch,
            VerificationStatus = computedHash != batch.BatchHash
                ? "DatabaseHashMismatch"
                : verificationStatus,
            VerifiedAt = DateTime.UtcNow
        };
    }

    private static string ComputeSha256(string input)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(input));
        return Convert.ToHexStringLower(bytes);
    }
}
