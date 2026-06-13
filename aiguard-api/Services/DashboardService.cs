using Microsoft.EntityFrameworkCore;
using aiguard_api.Data;
using aiguard_api.DTOs.Dashboard;

namespace aiguard_api.Services;

public interface IDashboardService
{
    Task<DashboardStatsResponse> GetStatsAsync();
    Task<List<DepartmentRiskResponse>> GetDepartmentRiskAsync();
    Task<List<TrendDataPoint>> GetTrendsAsync(int days);
    Task<AgentRiskResponse> GetAgentRiskAsync();
}

public class DashboardService : IDashboardService
{
    private readonly AiguardDbContext _db;

    public DashboardService(AiguardDbContext db) => _db = db;

    public async Task<DashboardStatsResponse> GetStatsAsync()
    {
        var events = _db.EndpointEvents;
        var devices = _db.Devices;
        var approvals = _db.Approvals;
        var batches = _db.BlockchainBatches;

        return new DashboardStatsResponse
        {
            TotalPromptsChecked = await events.CountAsync(),
            BlockedIncidents = await events.CountAsync(e => e.Decision == "Block"),
            MaskedDetections = await events.CountAsync(e => e.Decision == "Mask"),
            PendingApprovals = await approvals.CountAsync(a => a.Status == "Pending"),
            ActiveProtectedDevices = await devices.CountAsync(),
            FailedBlockchainBatches = await batches.CountAsync(b => b.Status == "Failed"),
            ExtensionActiveCount = await devices.CountAsync(d => d.ExtensionActive),
            PolicySyncedCount = await devices.CountAsync(),
            CriticalLeaksPrevented = await events.CountAsync(e => e.RiskLevel == "Critical" && e.Decision == "Block"),
            SensitivePasteDetected = await events.CountAsync(e => e.EventType == "PromptPasteDetected")
        };
    }

    public async Task<List<DepartmentRiskResponse>> GetDepartmentRiskAsync()
    {
        var departments = await _db.Departments.ToListAsync();
        var result = new List<DepartmentRiskResponse>();

        foreach (var dept in departments)
        {
            var devices = await _db.Devices.Where(d => d.DepartmentName == dept.Name).ToListAsync();
            var userEmails = devices.Select(d => d.UserEmail).Distinct().ToList();
            var events = await _db.EndpointEvents.Where(e => userEmails.Contains(e.UserEmail)).ToListAsync();

            result.Add(new DepartmentRiskResponse
            {
                DepartmentName = dept.Name,
                UserCount = userEmails.Count,
                TotalPrompts = events.Count,
                MaskedCount = events.Count(e => e.Decision == "Mask"),
                BlockedCount = events.Count(e => e.Decision == "Block"),
                AvgRiskScore = events.Any() ? Math.Round(events.Average(e => e.RiskScore), 1) : 0,
                TopDataType = events.GroupBy(e => e.DataTypeMatched)
                    .OrderByDescending(g => g.Count())
                    .Select(g => g.Key)
                    .FirstOrDefault() ?? "N/A"
            });
        }

        return result.OrderByDescending(r => r.AvgRiskScore).ToList();
    }

    public async Task<List<TrendDataPoint>> GetTrendsAsync(int days)
    {
        var startDate = DateTime.UtcNow.Date.AddDays(-days);
        var events = await _db.EndpointEvents
            .Where(e => e.CreatedAt >= startDate)
            .ToListAsync();

        var grouped = Enumerable.Range(0, days + 1)
            .Select(offset =>
            {
                var date = startDate.AddDays(offset);
                var dayEvents = events.Where(e => e.CreatedAt.Date == date).ToList();
                return new TrendDataPoint
                {
                    Date = date.ToString("yyyy-MM-dd"),
                    AllowCount = dayEvents.Count(e => e.Decision == "Allow"),
                    MaskCount = dayEvents.Count(e => e.Decision == "Mask"),
                    BlockCount = dayEvents.Count(e => e.Decision == "Block"),
                    PendingCount = dayEvents.Count(e => e.Decision == "PendingApproval")
                };
            })
            .ToList();

        return grouped;
    }

    public async Task<AgentRiskResponse> GetAgentRiskAsync()
    {
        var agents = await _db.Agents.ToListAsync();
        var logs = await _db.AgentActionLogs.Include(l => l.Agent).ToListAsync();

        var topRisky = logs
            .GroupBy(l => l.Agent.Name)
            .Select(g => new AgentRiskItem
            {
                AgentName = g.Key,
                ToolCallCount = g.Count(),
                BlockedCount = g.Count(l => l.Decision == "Block"),
                AvgRiskScore = Math.Round(g.Average(l => l.RiskScore), 1)
            })
            .OrderByDescending(a => a.AvgRiskScore)
            .Take(5)
            .ToList();

        return new AgentRiskResponse
        {
            TotalAgents = agents.Count,
            TotalToolCalls = logs.Count,
            BlockedToolCalls = logs.Count(l => l.Decision == "Block"),
            PendingToolCalls = logs.Count(l => l.Decision == "PendingApproval"),
            TopRiskyAgents = topRisky
        };
    }
}
