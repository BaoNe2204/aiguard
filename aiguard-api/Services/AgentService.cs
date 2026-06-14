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
    Task<AgentCredentialResponse?> RotateCredentialAsync(Guid agentId);
    Task<bool> ValidateCredentialAsync(Guid agentId, string? agentKey);
}

public class AgentService : IAgentService
{
    private readonly AiguardDbContext _db;
    private readonly IApprovalService _approvalService;
    private readonly IAuditLogService _auditLogService;
    private readonly IDataScopeContext _scope;
    private readonly ILicenseEntitlementService _entitlements;

    public AgentService(
        AiguardDbContext db,
        IApprovalService approvalService,
        IAuditLogService auditLogService,
        IDataScopeContext scope,
        ILicenseEntitlementService entitlements)
    {
        _db = db;
        _approvalService = approvalService;
        _auditLogService = auditLogService;
        _scope = scope;
        _entitlements = entitlements;
    }

    public async Task<List<AgentResponse>> GetAgentsAsync()
    {
        var agents = await _db.Agents
            .Include(a => a.Department)
            .Include(a => a.ActionLogs)
            .Include(a => a.Credentials)
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
        await _entitlements.EnsureCanAddAgentAsync();
        if (await _db.Agents.AnyAsync(a => a.Code == request.Code))
            throw new ArgumentException("Agent code already exists");

        var agent = new Agent
        {
            Name = request.Name.Trim(),
            Code = request.Code.Trim().ToUpperInvariant(),
            Description = request.Description,
            DepartmentId = request.DepartmentId,
            DailyCallLimit = Math.Clamp(request.DailyCallLimit, 1, 1_000_000),
            DailyRecordLimit = Math.Clamp(request.DailyRecordLimit, 1, 100_000_000),
            MonthlyCostLimit = Math.Max(0, request.MonthlyCostLimit),
            AllowAgentDelegation = request.AllowAgentDelegation,
            MaxDelegationDepth = Math.Clamp(request.MaxDelegationDepth, 0, 20),
            TenantCode = _scope.TenantCode
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
        if (request.DailyCallLimit.HasValue) agent.DailyCallLimit = Math.Clamp(request.DailyCallLimit.Value, 1, 1_000_000);
        if (request.DailyRecordLimit.HasValue) agent.DailyRecordLimit = Math.Clamp(request.DailyRecordLimit.Value, 1, 100_000_000);
        if (request.MonthlyCostLimit.HasValue) agent.MonthlyCostLimit = Math.Max(0, request.MonthlyCostLimit.Value);
        if (request.AllowAgentDelegation.HasValue) agent.AllowAgentDelegation = request.AllowAgentDelegation.Value;
        if (request.MaxDelegationDepth.HasValue) agent.MaxDelegationDepth = Math.Clamp(request.MaxDelegationDepth.Value, 0, 20);
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
        permission.RequiresSandbox = request.RequiresSandbox;
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
                CreatedAt = l.CreatedAt,
                RequestId = l.RequestId,
                RecordCount = l.RecordCount,
                EstimatedCost = l.EstimatedCost
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
            request.RecordCount, null, request.PayloadJson, 0, null, 0, false);
        return evaluation;
    }

    public async Task<ToolCallCheckResponse> CheckToolCallAsync(ToolCallCheckRequest request)
    {
        if (!string.IsNullOrWhiteSpace(request.RequestId))
        {
            var replay = await _db.AgentActionLogs
                .Include(x => x.Approvals)
                .FirstOrDefaultAsync(x => x.AgentId == request.AgentId && x.RequestId == request.RequestId);
            if (replay != null)
                return MapReplay(replay);
        }

        var evaluation = await EvaluateAsync(request.AgentId, request.ToolName, request.ActionType,
            request.Recipient, request.RecordCount, request.TargetResource, request.PayloadJson,
            request.EstimatedCost, request.ParentAgentId, request.DelegationDepth, request.IsSandboxed);

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
            RequestId = string.IsNullOrWhiteSpace(request.RequestId) ? null : request.RequestId.Trim(),
            RecordCount = Math.Max(0, request.RecordCount),
            EstimatedCost = Math.Max(0, request.EstimatedCost),
            ParentAgentId = request.ParentAgentId,
            DelegationDepth = Math.Max(0, request.DelegationDepth),
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
            ,RequiresSandbox = evaluation.RequiresSandbox
        };
    }

    private async Task<SimulateResponse> EvaluateAsync(
        Guid agentId,
        string toolName,
        string actionType,
        string? recipient,
        int recordCount,
        string? targetResource,
        string? payloadJson,
        decimal estimatedCost,
        Guid? parentAgentId,
        int delegationDepth,
        bool isSandboxed)
    {
        var agent = await _db.Agents.FirstOrDefaultAsync(a => a.Id == agentId);
        if (agent == null)
            return Blocked("AgentNotFound", "Unknown agent ID");
        if (!agent.IsEnabled)
            return Blocked("AgentDisabled", "Agent is disabled");

        var today = DateTime.UtcNow.Date;
        var month = new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1);
        var usage = await _db.AgentActionLogs
            .Where(x => x.AgentId == agentId)
            .GroupBy(_ => 1)
            .Select(g => new
            {
                CallsToday = g.Count(x => x.CreatedAt >= today),
                RecordsToday = g.Where(x => x.CreatedAt >= today).Sum(x => x.RecordCount),
                CostThisMonth = g.Where(x => x.CreatedAt >= month).Sum(x => x.EstimatedCost)
            })
            .FirstOrDefaultAsync();
        if ((usage?.CallsToday ?? 0) + 1 > agent.DailyCallLimit)
            return Blocked("DailyCallQuota", "Agent daily call quota exceeded");
        if ((usage?.RecordsToday ?? 0) + Math.Max(0, recordCount) > agent.DailyRecordLimit)
            return Blocked("DailyRecordQuota", "Agent daily record quota exceeded");
        if ((usage?.CostThisMonth ?? 0) + Math.Max(0, estimatedCost) > agent.MonthlyCostLimit)
            return Blocked("MonthlyCostQuota", "Agent monthly cost quota exceeded");

        if (parentAgentId.HasValue)
        {
            var parent = await _db.Agents.FirstOrDefaultAsync(x => x.Id == parentAgentId.Value);
            if (parent == null || !parent.IsEnabled)
                return Blocked("ParentAgentInvalid", "Parent agent is missing or disabled");
            if (!parent.AllowAgentDelegation)
                return Blocked("AgentDelegationDenied", "Parent agent is not allowed to call another agent");
            if (delegationDepth <= 0 || delegationDepth > parent.MaxDelegationDepth)
                return Blocked("DelegationDepthExceeded", "Agent delegation depth exceeds policy");
        }

        var permission = await _db.AgentToolPermissions
            .FirstOrDefaultAsync(p => p.AgentId == agentId && p.ToolName == toolName);

        var score = 10;
        var rules = new List<string>();
        var reasons = new List<string>();
        var requiresSandbox = false;
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
            requiresSandbox = permission.RequiresSandbox ||
                actionType.Equals("Delete", StringComparison.OrdinalIgnoreCase);
            if (requiresSandbox && !isSandboxed)
            {
                score += 80;
                rules.Add("SandboxRequired");
                reasons.Add("This tool action must execute in an approved sandbox");
            }
            if (recordCount > permission.MaxRecordsPerCall && permission.MaxRecordsPerCall >= 0)
            {
                score += 50;
                rules.Add("ExceedsMaxRecords");
                reasons.Add($"Requested {recordCount}, maximum is {permission.MaxRecordsPerCall}");
            }
        }

        var allowedDomain = await GetAllowedDomainAsync(agent.TenantCode);
        if (!string.IsNullOrWhiteSpace(recipient) && IsExternalRecipient(recipient, allowedDomain))
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
            Reason = reasons.Count == 0 ? "All checks passed" : string.Join("; ", reasons),
            RequiresSandbox = requiresSandbox
        };
    }

    public async Task<AgentCredentialResponse?> RotateCredentialAsync(Guid agentId)
    {
        var agent = await _db.Agents.FirstOrDefaultAsync(x => x.Id == agentId);
        if (agent == null) return null;

        var now = DateTime.UtcNow;
        await _db.AgentCredentials
            .Where(x => x.AgentId == agentId && x.Status == "Active")
            .ExecuteUpdateAsync(setters => setters
                .SetProperty(x => x.Status, "Revoked")
                .SetProperty(x => x.RevokedAt, now));

        var rawKey = $"agk_{GenerateUrlSafeToken(36)}";
        var credential = new AgentCredential
        {
            AgentId = agentId,
            KeyPrefix = rawKey[..Math.Min(14, rawKey.Length)],
            KeyHash = HashSecret(rawKey),
            ExpiresAt = now.AddYears(1),
            TenantCode = agent.TenantCode
        };
        _db.AgentCredentials.Add(credential);
        await _db.SaveChangesAsync();

        return new AgentCredentialResponse
        {
            AgentId = agentId,
            KeyPrefix = credential.KeyPrefix,
            AgentKey = rawKey,
            ExpiresAt = credential.ExpiresAt
        };
    }

    public async Task<bool> ValidateCredentialAsync(Guid agentId, string? agentKey)
    {
        if (string.IsNullOrWhiteSpace(agentKey)) return false;
        var hash = HashSecret(agentKey);
        var credential = await _db.AgentCredentials.IgnoreQueryFilters()
            .Include(x => x.Agent)
            .FirstOrDefaultAsync(x =>
                x.AgentId == agentId &&
                x.KeyHash == hash &&
                x.Status == "Active" &&
                x.ExpiresAt > DateTime.UtcNow &&
                x.Agent.IsEnabled);
        if (credential == null) return false;

        _scope.SetEndpointScope(credential.TenantCode, credential.Agent.DepartmentId);
        credential.LastUsedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return true;
    }

    private async Task<string?> GetAllowedDomainAsync(string tenantCode)
    {
        var primary = await _db.TenantSettings.IgnoreQueryFilters()
            .Where(x => x.TenantCode == tenantCode)
            .Select(x => x.PrimaryDomain)
            .FirstOrDefaultAsync();
        if (!string.IsNullOrWhiteSpace(primary)) return primary.Trim().TrimStart('@').ToLowerInvariant();
        return await _db.Tenants.IgnoreQueryFilters()
            .Where(x => x.Code == tenantCode)
            .Select(x => x.EmailDomain)
            .FirstOrDefaultAsync();
    }

    private static bool IsExternalRecipient(string recipient, string? allowedDomain)
    {
        if (string.IsNullOrWhiteSpace(allowedDomain)) return true;
        var values = recipient.Split([',', ';'], StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        return values.Any(value =>
        {
            var at = value.LastIndexOf('@');
            if (at < 0 || at == value.Length - 1) return true;
            var domain = value[(at + 1)..].Trim().TrimEnd('>').ToLowerInvariant();
            return domain != allowedDomain &&
                !domain.EndsWith($".{allowedDomain}", StringComparison.OrdinalIgnoreCase);
        });
    }

    private static ToolCallCheckResponse MapReplay(AgentActionLog log) => new()
    {
        ActionLogId = log.Id,
        ApprovalId = log.Approvals.OrderByDescending(x => x.CreatedAt).Select(x => (Guid?)x.Id).FirstOrDefault(),
        Decision = log.Decision,
        RiskScore = log.RiskScore,
        RuleMatched = "IdempotentReplay",
        Reason = log.Reason ?? "Existing tool-call result returned",
        IsReplay = true
    };

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

    private static string GenerateUrlSafeToken(int byteCount) =>
        Convert.ToBase64String(RandomNumberGenerator.GetBytes(byteCount))
            .TrimEnd('=')
            .Replace('+', '-')
            .Replace('/', '_');

    private static string HashSecret(string value) =>
        Convert.ToHexStringLower(SHA256.HashData(Encoding.UTF8.GetBytes(value)));

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
        ,DailyCallLimit = agent.DailyCallLimit
        ,DailyRecordLimit = agent.DailyRecordLimit
        ,MonthlyCostLimit = agent.MonthlyCostLimit
        ,AllowAgentDelegation = agent.AllowAgentDelegation
        ,MaxDelegationDepth = agent.MaxDelegationDepth
        ,ActiveCredentialPrefix = agent.Credentials
            .Where(x => x.Status == "Active" && x.ExpiresAt > DateTime.UtcNow)
            .OrderByDescending(x => x.CreatedAt)
            .Select(x => x.KeyPrefix)
            .FirstOrDefault()
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
        ,RequiresSandbox = permission.RequiresSandbox
    };
}
