using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using aiguard_api.Data;
using aiguard_api.DTOs.Agents;
using aiguard_api.DTOs.Common;
using aiguard_api.Models;

namespace aiguard_api.Services;

public interface IAgentService
{
    Task<List<AgentResponse>> GetAgentsAsync();
    Task<AgentResponse> CreateAgentAsync(CreateAgentRequest request);
    Task<AgentResponse?> UpdateAgentAsync(Guid id, UpdateAgentRequest request);
    Task<List<ToolPermissionResponse>> GetToolPermissionsAsync(Guid agentId);
    Task<ToolPermissionResponse?> UpsertToolPermissionAsync(Guid agentId, UpdateToolPermissionRequest request);
    Task<PagedResult<ToolCallLogResponse>> GetToolCallLogsAsync(PagedQuery query, Guid? agentId);
    Task<SimulateResponse> SimulateAsync(SimulateRequest request);
    Task<ToolCallCheckResponse> CheckToolCallAsync(ToolCallCheckRequest request);
}

public class AgentService : IAgentService
{
    private readonly AiguardDbContext _db;
    private readonly IApprovalService _approvalService;
    private readonly IAuditLogService _auditLogService;
    private readonly IDataScopeContext _scope;

    public AgentService(
        AiguardDbContext db,
        IApprovalService approvalService,
        IAuditLogService auditLogService,
        IDataScopeContext scope)
    {
        _db = db;
        _approvalService = approvalService;
        _auditLogService = auditLogService;
        _scope = scope;
    }

    public async Task<List<AgentResponse>> GetAgentsAsync()
    {
        var agents = await _db.Agents
            .Include(a => a.Department)
            .Include(a => a.ActionLogs)
            .OrderBy(a => a.Name)
            .ToListAsync();

        var today = DateTime.UtcNow.Date;
        return agents.Select(a =>
        {
            var todayLogs = a.ActionLogs.Where(l => l.CreatedAt >= today).ToList();
            return MapAgent(a, todayLogs);
        }).ToList();
    }

    public async Task<AgentResponse> CreateAgentAsync(CreateAgentRequest request)
    {
        if (await _db.Agents.AnyAsync(a => a.Code == request.Code))
            throw new ArgumentException("Agent code already exists");

        var agent = new Agent
        {
            Name = request.Name.Trim(),
            Code = request.Code.Trim().ToUpperInvariant(),
            Description = request.Description,
            DepartmentId = request.DepartmentId
            ,TenantCode = _scope.TenantCode
        };
        _db.Agents.Add(agent);
        await _db.SaveChangesAsync();
        await _db.Entry(agent).Reference(a => a.Department).LoadAsync();
        return MapAgent(agent, []);
    }

    public async Task<AgentResponse?> UpdateAgentAsync(Guid id, UpdateAgentRequest request)
    {
        var agent = await _db.Agents.Include(a => a.Department).FirstOrDefaultAsync(a => a.Id == id);
        if (agent == null) return null;

        if (request.Name != null) agent.Name = request.Name.Trim();
        if (request.Description != null) agent.Description = request.Description;
        if (request.IsEnabled.HasValue) agent.IsEnabled = request.IsEnabled.Value;
        if (request.DepartmentId.HasValue) agent.DepartmentId = request.DepartmentId.Value;
        await _db.SaveChangesAsync();
        return MapAgent(agent, []);
    }

    public async Task<List<ToolPermissionResponse>> GetToolPermissionsAsync(Guid agentId)
    {
        return await _db.AgentToolPermissions
            .Where(p => p.AgentId == agentId)
            .OrderBy(p => p.ToolName)
            .Select(p => MapPermission(p))
            .ToListAsync();
    }

    public async Task<ToolPermissionResponse?> UpsertToolPermissionAsync(Guid agentId, UpdateToolPermissionRequest request)
    {
        if (!await _db.Agents.AnyAsync(a => a.Id == agentId)) return null;

        var permission = await _db.AgentToolPermissions
            .FirstOrDefaultAsync(p => p.AgentId == agentId && p.ToolName == request.ToolName);
        if (permission == null)
        {
            permission = new AgentToolPermission { AgentId = agentId, ToolName = request.ToolName.Trim() };
            _db.AgentToolPermissions.Add(permission);
        }

        permission.Category = request.Category.Trim();
        permission.CanRead = request.CanRead || request.IsAllowed;
        permission.CanWrite = request.CanWrite;
        permission.CanDelete = request.CanDelete;
        permission.CanSendExternal = request.CanSendExternal;
        permission.CanExport = request.CanExport;
        permission.RequiresApproval = request.RequiresApproval;
        permission.MaxRecordsPerCall = Math.Max(0, request.MaxRecords);
        await _db.SaveChangesAsync();
        return MapPermission(permission);
    }

    public async Task<PagedResult<ToolCallLogResponse>> GetToolCallLogsAsync(PagedQuery query, Guid? agentId)
    {
        var q = _db.AgentActionLogs.Include(l => l.Agent).AsQueryable();
        if (agentId.HasValue) q = q.Where(l => l.AgentId == agentId.Value);
        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var search = query.Search.ToLower();
            q = q.Where(l => l.ToolName.ToLower().Contains(search)
                || l.Agent.Name.ToLower().Contains(search)
                || (l.TargetResource != null && l.TargetResource.ToLower().Contains(search)));
        }

        q = q.OrderByDescending(l => l.CreatedAt);
        var total = await q.CountAsync();
        var items = await q.Skip((query.Page - 1) * query.PageSize).Take(query.PageSize)
            .Select(l => new ToolCallLogResponse
            {
                Id = l.Id,
                AgentName = l.Agent.Name,
                ToolName = l.ToolName,
                ActionType = l.ActionType,
                TargetResource = l.TargetResource,
                Recipient = l.Recipient,
                RiskScore = l.RiskScore,
                RiskLevel = l.RiskLevel,
                Decision = l.Decision,
                Reason = l.Reason,
                CreatedAt = l.CreatedAt
            }).ToListAsync();

        return new PagedResult<ToolCallLogResponse>
        {
            Items = items,
            TotalCount = total,
            Page = query.Page,
            PageSize = query.PageSize
        };
    }

    public async Task<SimulateResponse> SimulateAsync(SimulateRequest request)
    {
        var evaluation = await EvaluateAsync(request.AgentId, request.ToolName, "Read", request.Recipient,
            request.RecordCount, null, request.PayloadJson);
        return evaluation;
    }

    public async Task<ToolCallCheckResponse> CheckToolCallAsync(ToolCallCheckRequest request)
    {
        var evaluation = await EvaluateAsync(request.AgentId, request.ToolName, request.ActionType,
            request.Recipient, request.RecordCount, request.TargetResource, request.PayloadJson);

        if (evaluation.RuleMatched == "AgentNotFound")
        {
            return new ToolCallCheckResponse
            {
                Decision = evaluation.Decision,
                RiskScore = evaluation.RiskScore,
                RuleMatched = evaluation.RuleMatched,
                Reason = evaluation.Reason
            };
        }

        var log = new AgentActionLog
        {
            AgentId = request.AgentId,
            ToolName = request.ToolName,
            ActionType = request.ActionType,
            TargetResource = request.TargetResource,
            Recipient = request.Recipient,
            RequestPayloadHash = HashPayload(request.PayloadJson),
            RiskScore = evaluation.RiskScore,
            RiskLevel = ToRiskLevel(evaluation.RiskScore),
            Decision = evaluation.Decision,
            Reason = evaluation.Reason
            ,TenantCode = _scope.TenantCode
        };
        _db.AgentActionLogs.Add(log);
        await _db.SaveChangesAsync();

        Guid? approvalId = null;
        if (evaluation.Decision == "PendingApproval")
        {
            var approval = await _approvalService.CreateApprovalAsync(
                "AgentAction", null, log.Id, $"agent:{request.AgentId}");
            approvalId = approval.Id;
        }

        var agent = await _db.Agents.Include(a => a.Department).FirstAsync(a => a.Id == request.AgentId);
        log.DepartmentId = agent.DepartmentId;
        await _db.SaveChangesAsync();
        await _auditLogService.CreateLogAsync(
            "AgentToolCall",
            "Agent",
            agent.Id,
            agent.Code,
            agent.DepartmentId,
            log.RiskLevel,
            log.Decision,
            new
            {
                actionLogId = log.Id,
                request.ToolName,
                request.ActionType,
                request.TargetResource,
                request.Recipient,
                request.RecordCount,
                log.RequestPayloadHash,
                evaluation.RuleMatched
            });

        return new ToolCallCheckResponse
        {
            ActionLogId = log.Id,
            ApprovalId = approvalId,
            Decision = evaluation.Decision,
            RiskScore = evaluation.RiskScore,
            RuleMatched = evaluation.RuleMatched,
            Reason = evaluation.Reason
        };
    }

    private async Task<SimulateResponse> EvaluateAsync(
        Guid agentId,
        string toolName,
        string actionType,
        string? recipient,
        int recordCount,
        string? targetResource,
        string? payloadJson)
    {
        var agent = await _db.Agents.FirstOrDefaultAsync(a => a.Id == agentId);
        if (agent == null)
            return Blocked("AgentNotFound", "Unknown agent ID");
        if (!agent.IsEnabled)
            return Blocked("AgentDisabled", "Agent is disabled");

        var permission = await _db.AgentToolPermissions
            .FirstOrDefaultAsync(p => p.AgentId == agentId && p.ToolName == toolName);

        var score = 10;
        var rules = new List<string>();
        var reasons = new List<string>();
        if (permission == null)
        {
            score += 80;
            rules.Add("UndefinedTool");
            reasons.Add("Tool is not registered for this agent");
        }
        else
        {
            var actionAllowed = actionType.ToLowerInvariant() switch
            {
                "read" => permission.CanRead,
                "write" => permission.CanWrite,
                "delete" => permission.CanDelete,
                "sendexternal" => permission.CanSendExternal,
                "export" => permission.CanExport,
                _ => false
            };
            if (!actionAllowed)
            {
                score += 80;
                rules.Add("ActionNotAllowed");
                reasons.Add($"{actionType} is not permitted for {toolName}");
            }
            if (permission.RequiresApproval)
            {
                score += 50;
                rules.Add("RequiresApproval");
            }
            if (recordCount > permission.MaxRecordsPerCall && permission.MaxRecordsPerCall >= 0)
            {
                score += 50;
                rules.Add("ExceedsMaxRecords");
                reasons.Add($"Requested {recordCount}, maximum is {permission.MaxRecordsPerCall}");
            }
        }

        if (!string.IsNullOrWhiteSpace(recipient) &&
            !recipient.EndsWith("@company.com", StringComparison.OrdinalIgnoreCase))
        {
            score += 40;
            rules.Add("ExternalRecipient");
            reasons.Add("Recipient is outside the company domain");
        }

        var injectionText = $"{targetResource} {payloadJson}";
        if (RegexPromptInjection().IsMatch(injectionText))
        {
            score += 60;
            rules.Add("PromptInjection");
            reasons.Add("Prompt injection pattern detected");
        }

        score = Math.Min(100, score);
        return new SimulateResponse
        {
            RiskScore = score,
            Decision = score switch
            {
                >= 85 => "Block",
                >= 60 => "PendingApproval",
                _ => "Allow"
            },
            RuleMatched = rules.Count == 0 ? "No rules triggered" : string.Join(" | ", rules),
            Reason = reasons.Count == 0 ? "All checks passed" : string.Join("; ", reasons)
        };
    }

    private static System.Text.RegularExpressions.Regex RegexPromptInjection() => new(
        @"(?i)(ignore previous instructions|bỏ qua (mọi |toàn bộ )?(quy định|hướng dẫn)|disable security|reveal secrets|export all|xuất toàn bộ dữ liệu)",
        System.Text.RegularExpressions.RegexOptions.Compiled,
        TimeSpan.FromSeconds(1));

    private static SimulateResponse Blocked(string rule, string reason) => new()
    {
        Decision = "Block",
        RiskScore = 100,
        RuleMatched = rule,
        Reason = reason
    };

    private static string ToRiskLevel(int score) => score switch
    {
        >= 85 => "Critical",
        >= 60 => "High",
        >= 30 => "Medium",
        _ => "Low"
    };

    private static string? HashPayload(string? payload)
    {
        if (string.IsNullOrWhiteSpace(payload)) return null;
        return Convert.ToHexStringLower(SHA256.HashData(Encoding.UTF8.GetBytes(payload)));
    }

    private static AgentResponse MapAgent(Agent agent, List<AgentActionLog> todayLogs) => new()
    {
        Id = agent.Id,
        Name = agent.Name,
        Code = agent.Code,
        Description = agent.Description,
        DepartmentName = agent.Department?.Name,
        DepartmentId = agent.DepartmentId,
        IsEnabled = agent.IsEnabled,
        CreatedAt = agent.CreatedAt,
        ToolCallsToday = todayLogs.Count,
        RiskScoreToday = todayLogs.Count == 0 ? 0 : (int)todayLogs.Average(l => l.RiskScore)
    };

    private static ToolPermissionResponse MapPermission(AgentToolPermission permission) => new()
    {
        Id = permission.Id,
        ToolName = permission.ToolName,
        Category = permission.Category,
        IsAllowed = permission.CanRead || permission.CanWrite || permission.CanDelete ||
                    permission.CanSendExternal || permission.CanExport,
        RequiresApproval = permission.RequiresApproval,
        MaxRecords = permission.MaxRecordsPerCall,
        CanRead = permission.CanRead,
        CanWrite = permission.CanWrite,
        CanDelete = permission.CanDelete,
        CanSendExternal = permission.CanSendExternal,
        CanExport = permission.CanExport
    };
}
