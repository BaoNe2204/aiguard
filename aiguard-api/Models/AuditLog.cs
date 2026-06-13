using System.ComponentModel.DataAnnotations;

namespace aiguard_api.Models;

public class AuditLog
{
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required, MaxLength(100)]
    public string EventType { get; set; } = string.Empty;

    [Required, MaxLength(50)]
    public string ActorType { get; set; } = string.Empty; // User, Agent, System

    public Guid? ActorId { get; set; }

    [MaxLength(255)]
    public string? ActorEmail { get; set; }

    public Guid? DepartmentId { get; set; }

    [MaxLength(50)]
    public string? RiskLevel { get; set; } // Low, Medium, High, Critical

    [MaxLength(50)]
    public string? Decision { get; set; } // Allow, Mask, PendingApproval, Block

    [Required]
    public string EventJson { get; set; } = "{}";

    [Required, MaxLength(128)]
    public string EventHash { get; set; } = string.Empty;

    [MaxLength(128)]
    public string? PreviousHash { get; set; }

    public Guid? BlockchainBatchId { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    [Required, MaxLength(100)] public string TenantCode { get; set; } = "DEFAULT";

    // Navigation
    public Department? Department { get; set; }
    public BlockchainBatch? BlockchainBatch { get; set; }
}
