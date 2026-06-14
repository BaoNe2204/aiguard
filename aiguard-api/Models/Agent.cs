using System.ComponentModel.DataAnnotations;

namespace aiguard_api.Models;

public class Agent
{
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required, MaxLength(255)]
    public string Name { get; set; } = string.Empty;

    [Required, MaxLength(100)]
    public string Code { get; set; } = string.Empty;

    public string? Description { get; set; }

    public Guid? DepartmentId { get; set; }

    public bool IsEnabled { get; set; } = true;
    public int DailyCallLimit { get; set; } = 1000;
    public int DailyRecordLimit { get; set; } = 10000;
    public decimal MonthlyCostLimit { get; set; } = 100;
    public bool AllowAgentDelegation { get; set; }
    public int MaxDelegationDepth { get; set; } = 1;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    [Required, MaxLength(100)] public string TenantCode { get; set; } = "DEFAULT";

    // Navigation
    public Department? Department { get; set; }
    public ICollection<AgentActionLog> ActionLogs { get; set; } = new List<AgentActionLog>();
    public ICollection<AgentToolPermission> ToolPermissions { get; set; } = new List<AgentToolPermission>();
    public ICollection<AgentCredential> Credentials { get; set; } = new List<AgentCredential>();
}
