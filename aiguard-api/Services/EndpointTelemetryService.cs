using Microsoft.EntityFrameworkCore;
using aiguard_api.Data;
using aiguard_api.DTOs.Common;
using aiguard_api.DTOs.Endpoints;
using aiguard_api.Models;

namespace aiguard_api.Services;

public interface IEndpointTelemetryService
{
    Task<int> AddAsync(Device device, EndpointTelemetryBatchRequest request);
    Task<PagedResult<EndpointTelemetryResponse>> GetAsync(PagedQuery query, string? category);
}

public class EndpointTelemetryService : IEndpointTelemetryService
{
    private static readonly HashSet<string> Categories = new(StringComparer.OrdinalIgnoreCase)
    {
        "RemovableStorage", "NetworkShare", "RdpClient", "EmailClient",
        "PrintService", "Clipboard", "AgentHealth", "AiCodeApp",
        "SensitiveWorkspace", "DeveloperSecret", "AiCodePolicyDecision",
        "ExtensionMonitor", "NetworkSharePolicy", "TamperProtection"
    };
    private static readonly HashSet<string> Severities = new(StringComparer.OrdinalIgnoreCase)
    {
        "Info", "Low", "Medium", "High", "Critical"
    };
    private readonly AiguardDbContext _db;
    private readonly IAuditLogService _audit;

    public EndpointTelemetryService(AiguardDbContext db, IAuditLogService audit)
    {
        _db = db;
        _audit = audit;
    }

    public async Task<int> AddAsync(Device device, EndpointTelemetryBatchRequest request)
    {
        if (request.Events.Count is < 1 or > 100)
            throw new ArgumentException("Telemetry batch must contain between 1 and 100 events.");
        var now = DateTime.UtcNow;
        var records = request.Events.Select(item =>
        {
            if (!Categories.Contains(item.Category)) throw new ArgumentException($"Unsupported telemetry category: {item.Category}");
            if (!Severities.Contains(item.Severity)) throw new ArgumentException($"Unsupported telemetry severity: {item.Severity}");
            var occurred = item.OccurredAt.ToUniversalTime();
            if (occurred < now.AddDays(-7) || occurred > now.AddMinutes(5)) occurred = now;
            return new EndpointTelemetryEvent
            {
                DeviceId = device.Id,
                Category = item.Category,
                EventType = item.EventType,
                Detail = item.Detail,
                Severity = item.Severity,
                OccurredAt = occurred,
                TenantCode = device.TenantCode,
                DepartmentId = device.DepartmentId
            };
        }).ToList();
        _db.EndpointTelemetryEvents.AddRange(records);
        ApplyAutomaticDeviceControls(device, records);
        await _db.SaveChangesAsync();

        foreach (var item in records.Where(x => x.Severity is "High" or "Critical"))
        {
            await _audit.CreateLogAsync(
                "EndpointTelemetry",
                "Endpoint",
                null,
                device.UserEmail,
                device.DepartmentId,
                item.Severity,
                "Recorded",
                new { device.Id, device.Hostname, item.Category, item.EventType, item.Detail, item.OccurredAt });
        }
        return records.Count;
    }

    private static void ApplyAutomaticDeviceControls(Device device, List<EndpointTelemetryEvent> records)
    {
        // Removed auto quarantine on AI block to prevent full device lockdown just for opening Cursor/Code.
    }

    public async Task<PagedResult<EndpointTelemetryResponse>> GetAsync(PagedQuery query, string? category)
    {
        var q = _db.EndpointTelemetryEvents.Include(x => x.Device).AsQueryable();
        if (!string.IsNullOrWhiteSpace(category)) q = q.Where(x => x.Category == category);
        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var search = query.Search.ToLower();
            q = q.Where(x => x.Device.Hostname.ToLower().Contains(search) ||
                x.Device.UserEmail.ToLower().Contains(search) ||
                (x.Detail != null && x.Detail.ToLower().Contains(search)));
        }
        var total = await q.CountAsync();
        var items = await q.OrderByDescending(x => x.ReceivedAt)
            .Skip((query.Page - 1) * query.PageSize).Take(query.PageSize).ToListAsync();
        return new PagedResult<EndpointTelemetryResponse>
        {
            Items = items.Select(x => new EndpointTelemetryResponse
            {
                Id = x.Id,
                Hostname = x.Device.Hostname,
                UserEmail = x.Device.UserEmail,
                DepartmentName = x.Device.DepartmentName,
                Category = x.Category,
                EventType = x.EventType,
                Detail = x.Detail,
                Severity = x.Severity,
                OccurredAt = x.OccurredAt,
                ReceivedAt = x.ReceivedAt
            }).ToList(),
            TotalCount = total,
            Page = query.Page,
            PageSize = query.PageSize
        };
    }
}
