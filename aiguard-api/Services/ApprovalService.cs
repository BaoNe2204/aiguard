using Microsoft.EntityFrameworkCore;
using aiguard_api.Data;
using aiguard_api.DTOs.Approvals;
using aiguard_api.DTOs.Common;
using aiguard_api.Models;

namespace aiguard_api.Services;

public interface IApprovalService
{
    Task<PagedResult<ApprovalResponse>> GetPendingAsync(PagedQuery query, string? requestType);
    Task<ApprovalResponse?> ProcessApprovalAsync(Guid id, ApprovalActionRequest request, Guid approverId);
    Task<PagedResult<ApprovalResponse>> GetHistoryAsync(PagedQuery query);
    Task<PagedResult<ApprovalResponse>> GetForUserAsync(PagedQuery query, string email);
    Task<ApprovalResponse?> GetByIdAsync(Guid id);
    Task<ApprovalResponse?> RevokeAsync(Guid id, string requestedByEmail);
    Task<ApprovalResponse> CreateApprovalAsync(
        string requestType, Guid? endpointEventId, Guid? agentActionLogId,
        string requestedByEmail, string? businessJustification = null);
}

public class ApprovalService : IApprovalService
{
    private readonly AiguardDbContext _db;
    private readonly IDataScopeContext _scope;

    public ApprovalService(AiguardDbContext db, IDataScopeContext scope)
    {
        _db = db;
        _scope = scope;
    }

    public async Task<PagedResult<ApprovalResponse>> GetPendingAsync(PagedQuery query, string? requestType)
    {
        var q = _db.Approvals
            .Include(a => a.EndpointEvent)
            .Include(a => a.AgentActionLog)
            .Include(a => a.AssignedApprover)
            .Where(a => a.Status == "Pending" && a.ExpiresAt > DateTime.UtcNow)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(requestType))
            q = q.Where(a => a.RequestType == requestType);

        q = q.OrderByDescending(a => a.CreatedAt);
        var total = await q.CountAsync();
        var items = await q
            .Skip((query.Page - 1) * query.PageSize)
            .Take(query.PageSize)
            .ToListAsync();

        return new PagedResult<ApprovalResponse>
        {
            Items = items.Select(MapToResponse).ToList(),
            TotalCount = total,
            Page = query.Page,
            PageSize = query.PageSize
        };
    }

    public async Task<ApprovalResponse?> ProcessApprovalAsync(Guid id, ApprovalActionRequest request, Guid approverId)
    {
        var approval = await _db.Approvals
            .AsNoTracking()
            .Include(a => a.EndpointEvent)
            .Include(a => a.AgentActionLog)
            .Include(a => a.AssignedApprover)
            .FirstOrDefaultAsync(a => a.Id == id);

        if (approval == null || approval.Status != "Pending") return null;
        if (approval.ExpiresAt <= DateTime.UtcNow)
        {
            await _db.Approvals.Where(a => a.Id == id && a.Status == "Pending")
                .ExecuteUpdateAsync(x => x
                    .SetProperty(a => a.Status, "Expired")
                    .SetProperty(a => a.ConcurrencyToken, Guid.NewGuid()));
            return null;
        }

        if (request.Action is not ("Approve" or "Reject" or "ApproveWithMasking"))
            throw new ArgumentException("Action must be Approve, Reject, or ApproveWithMasking");

        var approver = await _db.Users.AsNoTracking().FirstOrDefaultAsync(x => x.Id == approverId)
            ?? throw new UnauthorizedAccessException();
        if (string.Equals(approval.RequestedByUserEmail, approver.Email, StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException("The requester cannot approve their own request.");
        if (approval.AssignedApproverId.HasValue && approval.AssignedApproverId != approverId)
            throw new InvalidOperationException("This request is assigned to another approver.");

        var status = request.Action switch
        {
            "Approve" => "Approved",
            "Reject" => "Rejected",
            "ApproveWithMasking" => "ApprovedWithMasking",
            _ => approval.Status
        };
        var affected = await _db.Approvals
            .Where(a => a.Id == id && a.Status == "Pending" && a.ConcurrencyToken == approval.ConcurrencyToken)
            .ExecuteUpdateAsync(x => x
                .SetProperty(a => a.Status, status)
                .SetProperty(a => a.ApproverNote, request.Note)
                .SetProperty(a => a.AssignedApproverId, approverId)
                .SetProperty(a => a.DecidedAt, DateTime.UtcNow)
                .SetProperty(a => a.ConcurrencyToken, Guid.NewGuid()));
        if (affected == 0)
            throw new InvalidOperationException("Approval was already processed by another approver.");

        var updated = await _db.Approvals
            .Include(a => a.EndpointEvent)
            .Include(a => a.AgentActionLog)
            .Include(a => a.AssignedApprover)
            .FirstAsync(a => a.Id == id);
        return MapToResponse(updated);
    }

    public async Task<PagedResult<ApprovalResponse>> GetHistoryAsync(PagedQuery query)
    {
        var q = _db.Approvals
            .Include(a => a.EndpointEvent)
            .Include(a => a.AgentActionLog)
            .Include(a => a.AssignedApprover)
            .Where(a => a.Status != "Pending")
            .OrderByDescending(a => a.DecidedAt);

        var total = await q.CountAsync();
        var items = await q
            .Skip((query.Page - 1) * query.PageSize)
            .Take(query.PageSize)
            .ToListAsync();

        return new PagedResult<ApprovalResponse>
        {
            Items = items.Select(MapToResponse).ToList(),
            TotalCount = total,
            Page = query.Page,
            PageSize = query.PageSize
        };
    }

    public async Task<PagedResult<ApprovalResponse>> GetForUserAsync(PagedQuery query, string email)
    {
        var q = _db.Approvals
            .Include(a => a.EndpointEvent)
            .Include(a => a.AgentActionLog)
            .Include(a => a.AssignedApprover)
            .Where(a => a.RequestedByUserEmail == email)
            .OrderByDescending(a => a.CreatedAt);
        var total = await q.CountAsync();
        var items = await q.Skip((query.Page - 1) * query.PageSize).Take(query.PageSize).ToListAsync();
        return new PagedResult<ApprovalResponse>
        {
            Items = items.Select(MapToResponse).ToList(),
            TotalCount = total,
            Page = query.Page,
            PageSize = query.PageSize
        };
    }

    public async Task<ApprovalResponse?> GetByIdAsync(Guid id)
    {
        var approval = await _db.Approvals
            .Include(a => a.EndpointEvent)
            .Include(a => a.AgentActionLog)
            .Include(a => a.AssignedApprover)
            .FirstOrDefaultAsync(a => a.Id == id);
        if (approval == null) return null;
        if (approval.Status == "Pending" && approval.ExpiresAt <= DateTime.UtcNow)
        {
            approval.Status = "Expired";
            await _db.SaveChangesAsync();
        }
        return MapToResponse(approval);
    }

    public async Task<ApprovalResponse?> RevokeAsync(Guid id, string requestedByEmail)
    {
        var approval = await _db.Approvals
            .Include(a => a.EndpointEvent)
            .Include(a => a.AgentActionLog)
            .Include(a => a.AssignedApprover)
            .FirstOrDefaultAsync(a => a.Id == id && a.RequestedByUserEmail == requestedByEmail);
        if (approval == null || approval.Status != "Pending") return null;
        approval.Status = "Revoked";
        approval.RevokedAt = DateTime.UtcNow;
        approval.ConcurrencyToken = Guid.NewGuid();
        await _db.SaveChangesAsync();
        return MapToResponse(approval);
    }

    public async Task<ApprovalResponse> CreateApprovalAsync(
        string requestType, Guid? endpointEventId, Guid? agentActionLogId,
        string requestedByEmail, string? businessJustification = null)
    {
        Guid? departmentId = null;
        if (endpointEventId.HasValue)
            departmentId = await _db.EndpointEvents.Where(e => e.Id == endpointEventId).Select(e => e.DepartmentId).FirstOrDefaultAsync();
        else if (agentActionLogId.HasValue)
            departmentId = await _db.AgentActionLogs.Where(e => e.Id == agentActionLogId).Select(e => e.DepartmentId).FirstOrDefaultAsync();

        var approval = new Approval
        {
            RequestType = requestType,
            EndpointEventId = endpointEventId,
            AgentActionLogId = agentActionLogId,
            RequestedByUserEmail = requestedByEmail,
            BusinessJustification = businessJustification,
            Reason = businessJustification,
            ExpiresAt = DateTime.UtcNow.AddMinutes(30),
            TenantCode = _scope.TenantCode,
            DepartmentId = departmentId
        };

        _db.Approvals.Add(approval);
        await _db.SaveChangesAsync();
        return MapToResponse(approval);
    }

    private static ApprovalResponse MapToResponse(Approval a)
    {
        var resp = new ApprovalResponse
        {
            Id = a.Id,
            RequestType = a.RequestType,
            EndpointEventId = a.EndpointEventId,
            AgentActionLogId = a.AgentActionLogId,
            RequestedByUserEmail = a.RequestedByUserEmail,
            AssignedApproverId = a.AssignedApproverId,
            AssignedApproverName = a.AssignedApprover?.FullName,
            Status = a.Status,
            Reason = a.Reason,
            BusinessJustification = a.BusinessJustification,
            ApproverNote = a.ApproverNote,
            CreatedAt = a.CreatedAt,
            ExpiresAt = a.ExpiresAt,
            DecidedAt = a.DecidedAt,
            RevokedAt = a.RevokedAt,
            ConcurrencyToken = a.ConcurrencyToken
        };

        if (a.EndpointEvent != null)
        {
            resp.EventSummary = $"{a.EndpointEvent.EventType} on {a.EndpointEvent.WebsiteAi}";
            resp.RiskScore = a.EndpointEvent.RiskScore;
            resp.RiskLevel = a.EndpointEvent.RiskLevel;
            resp.DataTypeMatched = a.EndpointEvent.DataTypeMatched;
            resp.MaskedPreview = a.EndpointEvent.MaskedContentPreview;
        }
        else if (a.AgentActionLog != null)
        {
            resp.EventSummary = $"Agent tool-call: {a.AgentActionLog.ToolName} → {a.AgentActionLog.ActionType}";
            resp.RiskScore = a.AgentActionLog.RiskScore;
            resp.RiskLevel = a.AgentActionLog.RiskLevel;
            resp.DataTypeMatched = a.AgentActionLog.TargetResource;
        }

        return resp;
    }
}
