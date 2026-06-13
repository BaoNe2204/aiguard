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
                AnchoredAt = b.AnchoredAt
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
        var onChainMatch = batch.Status == "Anchored" && _chain.IsEnabled
            ? await _chain.VerifyOnChainAsync(batch.BatchHash)
            : batch.Status != "Anchored";
        isMatch = isMatch && onChainMatch;

        return new VerifyBatchResponse
        {
            BatchId = batchId,
            BatchHash = batch.BatchHash,
            ComputedHash = computedHash,
            IsMatch = isMatch,
            VerificationStatus = isMatch
                ? batch.Status == "Anchored" ? "VerifiedOnChain" : "VerifiedLocal"
                : "Mismatch",
            VerifiedAt = DateTime.UtcNow
        };
    }

    private static string ComputeSha256(string input)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(input));
        return Convert.ToHexStringLower(bytes);
    }
}
