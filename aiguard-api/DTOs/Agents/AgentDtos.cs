using System.ComponentModel.DataAnnotations;

namespace aiguard_api.DTOs.Agents;

public class AgentResponse
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? DepartmentName { get; set; }
    public Guid? DepartmentId { get; set; }
    public bool IsEnabled { get; set; }
    public DateTime CreatedAt { get; set; }
    public int ToolCallsToday { get; set; }
    public int RiskScoreToday { get; set; }
}

public class CreateAgentRequest
{
    [Required, MaxLength(255)]
    public string Name { get; set; } = string.Empty;

    [Required, MaxLength(100)]
    public string Code { get; set; } = string.Empty;

    public string? Description { get; set; }
    public Guid? DepartmentId { get; set; }
}

public class UpdateAgentRequest
{
    public string? Name { get; set; }
    public string? Description { get; set; }
    public bool? IsEnabled { get; set; }
    public Guid? DepartmentId { get; set; }
}

public class ToolPermissionResponse
{
    public Guid Id { get; set; }
    public string ToolName { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public bool IsAllowed { get; set; }
    public bool RequiresApproval { get; set; }
    public int MaxRecords { get; set; }
    public bool CanRead { get; set; }
    public bool CanWrite { get; set; }
    public bool CanDelete { get; set; }
    public bool CanSendExternal { get; set; }
    public bool CanExport { get; set; }
}

public class UpdateToolPermissionRequest
{
    [Required]
    public string ToolName { get; set; } = string.Empty;
    public bool IsAllowed { get; set; }
    public bool RequiresApproval { get; set; }
    public int MaxRecords { get; set; }
    public string Category { get; set; } = "General";
    public bool CanRead { get; set; }
    public bool CanWrite { get; set; }
    public bool CanDelete { get; set; }
    public bool CanSendExternal { get; set; }
    public bool CanExport { get; set; }
}

public class ToolCallCheckRequest : SimulateRequest
{
    public string ActionType { get; set; } = "Read";
    public string? TargetResource { get; set; }
}

public class ToolCallCheckResponse : SimulateResponse
{
    public Guid ActionLogId { get; set; }
    public Guid? ApprovalId { get; set; }
}

public class ToolCallLogResponse
{
    public Guid Id { get; set; }
    public string AgentName { get; set; } = string.Empty;
    public string ToolName { get; set; } = string.Empty;
    public string ActionType { get; set; } = string.Empty;
    public string? TargetResource { get; set; }
    public string? Recipient { get; set; }
    public int RiskScore { get; set; }
    public string RiskLevel { get; set; } = string.Empty;
    public string Decision { get; set; } = string.Empty;
    public string? Reason { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class SimulateRequest
{
    [Required]
    public Guid AgentId { get; set; }

    [Required]
    public string ToolName { get; set; } = string.Empty;

    public string? Recipient { get; set; }
    public int RecordCount { get; set; } = 1;
    public string? PayloadJson { get; set; }
}

public class SimulateResponse
{
    public string Decision { get; set; } = string.Empty;
    public int RiskScore { get; set; }
    public string RuleMatched { get; set; } = string.Empty;
    public string Reason { get; set; } = string.Empty;
}
