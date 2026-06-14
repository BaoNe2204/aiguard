using Microsoft.EntityFrameworkCore;
using aiguard_api.Data;
using aiguard_api.DTOs.Common;
using aiguard_api.DTOs.Endpoints;
using aiguard_api.Models;
using Microsoft.AspNetCore.SignalR;
using aiguard_api.Hubs;

namespace aiguard_api.Services;

public interface IEndpointEventService
{
    Task<PagedResult<EndpointEventResponse>> GetEventsAsync(PagedQuery query, string? riskLevel, string? decision, string? userEmail);
    Task<EndpointEventResponse?> CreateEventAsync(CreateEndpointEventRequest request, Device device);
}

public class EndpointEventService : IEndpointEventService
{
    private readonly AiguardDbContext _db;
    private readonly IApprovalService _approvalService;
    private readonly IAuditLogService _auditLogService;
    private readonly IHubContext<NotificationHub> _hubContext;
    private readonly IScanReceiptService _receiptService;

    public EndpointEventService(
        AiguardDbContext db,
        IApprovalService approvalService,
        IAuditLogService auditLogService,
        IHubContext<NotificationHub> hubContext,
        IScanReceiptService receiptService)
    {
        _db = db;
        _approvalService = approvalService;
        _auditLogService = auditLogService;
        _hubContext = hubContext;
        _receiptService = receiptService;
    }

    public async Task<PagedResult<EndpointEventResponse>> GetEventsAsync(PagedQuery query, string? riskLevel, string? decision, string? userEmail)
    {
        var q = _db.EndpointEvents.AsQueryable();

        if (!string.IsNullOrWhiteSpace(riskLevel))
            q = q.Where(e => e.RiskLevel == riskLevel);
        if (!string.IsNullOrWhiteSpace(decision))
            q = q.Where(e => e.Decision == decision);
        if (!string.IsNullOrWhiteSpace(userEmail))
            q = q.Where(e => e.UserEmail == userEmail);
        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var s = query.Search.ToLower();
            q = q.Where(e => e.UserEmail.ToLower().Contains(s)
                || e.Hostname.ToLower().Contains(s)
                || e.WebsiteAi.ToLower().Contains(s)
                || e.DataTypeMatched.ToLower().Contains(s));
        }

        q = q.OrderByDescending(e => e.CreatedAt);

        var total = await q.CountAsync();
        var entities = await q
            .Include(e => e.Approvals)
            .Skip((query.Page - 1) * query.PageSize)
            .Take(query.PageSize)
            .ToListAsync();

        return new PagedResult<EndpointEventResponse>
        {
            Items = entities.Select(MapToResponse).ToList(),
            TotalCount = total,
            Page = query.Page,
            PageSize = query.PageSize
        };
    }

    public async Task<EndpointEventResponse?> CreateEventAsync(CreateEndpointEventRequest request, Device device)
    {
        var receipt = await _receiptService.ConsumeAsync(request.ScanId, request.Receipt, device, request.OriginalHash);
        if (receipt == null) return null;
        var ev = new EndpointEvent
        {
            UserEmail = device.UserEmail,
            Hostname = device.Hostname,
            Browser = request.Browser,
            WebsiteAi = request.WebsiteAi,
            EventType = request.EventType,
            RiskScore = receipt.RiskScore,
            RiskLevel = receipt.RiskLevel,
            Decision = receipt.Decision,
            DataTypeMatched = receipt.DataTypeMatched,
            MaskedContentPreview = receipt.MaskedContentPreview,
            OriginalHash = receipt.ContentHash,
            PolicyVersion = receipt.PolicyVersion,
            TenantCode = device.TenantCode,
            ScanReceiptId = receipt.Id
            ,DepartmentId = device.DepartmentId
        };

        _db.EndpointEvents.Add(ev);
        await _db.SaveChangesAsync();

        var user = await _db.Users
            .Include(u => u.Department)
            .FirstOrDefaultAsync(u => u.Email == ev.UserEmail);

        await _auditLogService.CreateLogAsync(
            ev.EventType,
            "Endpoint",
            user?.Id,
            ev.UserEmail,
            user?.DepartmentId,
            ev.RiskLevel,
            ev.Decision,
            new
            {
                endpointEventId = ev.Id,
                ev.Hostname,
                ev.Browser,
                ev.WebsiteAi,
                ev.DataTypeMatched,
                ev.OriginalHash,
                ev.PolicyVersion
            });

        Guid? approvalId = null;
        if (ev.Decision == "PendingApproval")
        {
            var approval = await _approvalService.CreateApprovalAsync(
                "EndpointDLP",
                ev.Id,
                null,
                ev.UserEmail,
                request.BusinessJustification);
            approvalId = approval.Id;

            var notification = new
            {
                approvalId = approval.Id,
                endpointEventId = ev.Id,
                ev.UserEmail,
                ev.WebsiteAi,
                ev.RiskScore,
                ev.RiskLevel
            };
            await _hubContext.Clients.Group(NotificationGroups.Role(ev.TenantCode, "SecurityAdmin"))
                .SendAsync("NewApprovalRequest", notification);
            await _hubContext.Clients.Group(NotificationGroups.Role(ev.TenantCode, "TenantOwner"))
                .SendAsync("NewApprovalRequest", notification);
            if (ev.DepartmentId.HasValue)
                await _hubContext.Clients.Group(NotificationGroups.Department(ev.TenantCode, ev.DepartmentId.Value))
                    .SendAsync("NewApprovalRequest", notification);
        }
        else if (ev.Decision == "Block" || ev.RiskLevel == "Critical")
        {
            var alert = new
            {
                endpointEventId = ev.Id,
                ev.UserEmail,
                ev.Hostname,
                ev.WebsiteAi,
                ev.RiskScore,
                ev.DataTypeMatched
            };
            await _hubContext.Clients.Group(NotificationGroups.Role(ev.TenantCode, "SecurityAdmin"))
                .SendAsync("EmergencyAlert", alert);
            await _hubContext.Clients.Group(NotificationGroups.Role(ev.TenantCode, "TenantOwner"))
                .SendAsync("EmergencyAlert", alert);
        }

        var response = MapToResponse(ev);
        response.ApprovalId = approvalId;
        return response;
    }

    private static EndpointEventResponse MapToResponse(EndpointEvent e) => new()
    {
        Id = e.Id,
        UserEmail = e.UserEmail,
        Hostname = e.Hostname,
        Browser = e.Browser,
        WebsiteAi = e.WebsiteAi,
        EventType = e.EventType,
        RiskScore = e.RiskScore,
        RiskLevel = e.RiskLevel,
        Decision = e.Decision,
        DataTypeMatched = e.DataTypeMatched,
        MaskedContentPreview = e.MaskedContentPreview,
        OriginalHash = e.OriginalHash,
        PolicyVersion = e.PolicyVersion,
        CreatedAt = e.CreatedAt
        ,ApprovalId = e.Approvals.OrderByDescending(a => a.CreatedAt).Select(a => (Guid?)a.Id).FirstOrDefault()
    };
}
