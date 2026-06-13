using System.ComponentModel.DataAnnotations;

namespace aiguard_api.Models;

public class Approval
{
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required, MaxLength(50)]
    public string RequestType { get; set; } = string.Empty; // Prompt, AgentAction, EndpointDLP

    public Guid? EndpointEventId { get; set; }
    public Guid? AgentActionLogId { get; set; }

    [Required, MaxLength(255)]
    public string RequestedByUserEmail { get; set; } = string.Empty;

    public Guid? AssignedApproverId { get; set; }

    [Required, MaxLength(50)]
    public string Status { get; set; } = "Pending"; // Pending, Approved, Rejected, ApprovedWithMasking

    public string? Reason { get; set; }
    public string? BusinessJustification { get; set; }
    public string? ApproverNote { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime ExpiresAt { get; set; } = DateTime.UtcNow.AddMinutes(30);
    public DateTime? DecidedAt { get; set; }
    public DateTime? RevokedAt { get; set; }
    [Required, MaxLength(100)] public string TenantCode { get; set; } = "DEFAULT";
    public Guid? DepartmentId { get; set; }

    // Navigation
    public EndpointEvent? EndpointEvent { get; set; }
    public AgentActionLog? AgentActionLog { get; set; }
    public User? AssignedApprover { get; set; }
}
