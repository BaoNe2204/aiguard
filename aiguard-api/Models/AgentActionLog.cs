using System.ComponentModel.DataAnnotations;

namespace aiguard_api.Models;

public class AgentActionLog
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid AgentId { get; set; }

    [Required, MaxLength(255)]
    public string ToolName { get; set; } = string.Empty;

    [Required, MaxLength(100)]
    public string ActionType { get; set; } = string.Empty;

    [MaxLength(500)]
    public string? TargetResource { get; set; }

    [MaxLength(500)]
    public string? Recipient { get; set; }

    [MaxLength(128)]
    public string? RequestPayloadHash { get; set; }
    [MaxLength(100)] public string? RequestId { get; set; }
    public int RecordCount { get; set; }
    public decimal EstimatedCost { get; set; }
    public Guid? ParentAgentId { get; set; }
    public int DelegationDepth { get; set; }

    public int RiskScore { get; set; }

    [Required, MaxLength(50)]
    public string RiskLevel { get; set; } = "Low"; // Low, Medium, High, Critical

    [Required, MaxLength(50)]
    public string Decision { get; set; } = "Allow"; // Allow, Mask, PendingApproval, Block

    public string? Reason { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    [Required, MaxLength(100)] public string TenantCode { get; set; } = "DEFAULT";
    public Guid? DepartmentId { get; set; }

    // Navigation
    public Agent Agent { get; set; } = null!;
    public ICollection<Approval> Approvals { get; set; } = new List<Approval>();
}
