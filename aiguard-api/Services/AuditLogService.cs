using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using aiguard_api.Data;
using aiguard_api.DTOs.Audit;
using aiguard_api.DTOs.Common;
using aiguard_api.Models;

namespace aiguard_api.Services;

public interface IAuditLogService
{
    Task<PagedResult<AuditLogResponse>> GetLogsAsync(PagedQuery query, string? eventType, string? riskLevel, string? actorType);
    Task<AuditLog> CreateLogAsync(string eventType, string actorType, Guid? actorId, string? actorEmail, Guid? departmentId, string? riskLevel, string? decision, object eventData);
}

public class AuditLogService : IAuditLogService
{
    private readonly AiguardDbContext _db;
    private readonly IDataScopeContext _scope;

    public AuditLogService(AiguardDbContext db, IDataScopeContext scope)
    {
        _db = db;
        _scope = scope;
    }

    public async Task<PagedResult<AuditLogResponse>> GetLogsAsync(PagedQuery query, string? eventType, string? riskLevel, string? actorType)
    {
        var q = _db.AuditLogs
            .Include(a => a.Department)
            .Include(a => a.BlockchainBatch)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(eventType))
            q = q.Where(a => a.EventType == eventType);
        if (!string.IsNullOrWhiteSpace(riskLevel))
            q = q.Where(a => a.RiskLevel == riskLevel);
        if (!string.IsNullOrWhiteSpace(actorType))
            q = q.Where(a => a.ActorType == actorType);
        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var s = query.Search.ToLower();
            q = q.Where(a => (a.ActorEmail != null && a.ActorEmail.ToLower().Contains(s))
                || a.EventType.ToLower().Contains(s));
        }

        q = q.OrderByDescending(a => a.CreatedAt);

        var total = await q.CountAsync();
        var items = await q
            .Skip((query.Page - 1) * query.PageSize)
            .Take(query.PageSize)
            .Select(a => new AuditLogResponse
            {
                Id = a.Id,
                EventType = a.EventType,
                ActorType = a.ActorType,
                ActorEmail = a.ActorEmail,
                DepartmentName = a.Department != null ? a.Department.Name : null,
                RiskLevel = a.RiskLevel,
                Decision = a.Decision,
                EventHash = a.EventHash,
                PreviousHash = a.PreviousHash,
                BlockchainBatchId = a.BlockchainBatchId,
                BlockchainStatus = a.BlockchainBatch != null ? a.BlockchainBatch.Status : null,
                CreatedAt = a.CreatedAt
            })
            .ToListAsync();

        return new PagedResult<AuditLogResponse> { Items = items, TotalCount = total, Page = query.Page, PageSize = query.PageSize };
    }

    public async Task<AuditLog> CreateLogAsync(string eventType, string actorType, Guid? actorId, string? actorEmail, Guid? departmentId, string? riskLevel, string? decision, object eventData)
    {
        var eventJson = JsonSerializer.Serialize(eventData);

        // Get the previous hash for chain linking
        var prevLog = await _db.AuditLogs.OrderByDescending(a => a.CreatedAt).FirstOrDefaultAsync();
        var previousHash = prevLog?.EventHash ?? "GENESIS";

        // Compute EventHash = SHA256(EventJson + PreviousHash)
        var hashInput = eventJson + previousHash;
        var eventHash = ComputeSha256(hashInput);

        var log = new AuditLog
        {
            EventType = eventType,
            ActorType = actorType,
            ActorId = actorId,
            ActorEmail = actorEmail,
            DepartmentId = departmentId,
            RiskLevel = riskLevel,
            Decision = decision,
            EventJson = eventJson,
            EventHash = eventHash,
            PreviousHash = previousHash == "GENESIS" ? null : previousHash
            ,TenantCode = _scope.TenantCode
        };

        _db.AuditLogs.Add(log);
        await _db.SaveChangesAsync();
        return log;
    }

    public static string ComputeSha256(string input)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(input));
        return Convert.ToHexStringLower(bytes);
    }
}
