using System.ComponentModel.DataAnnotations;

namespace aiguard_api.Models;

public class BlockchainBatch
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public int LogCount { get; set; }

    [Required, MaxLength(128)]
    public string BatchHash { get; set; } = string.Empty;

    [MaxLength(255)]
    public string? TransactionHash { get; set; }

    public long? BlockNumber { get; set; }

    [Required, MaxLength(50)]
    public string Status { get; set; } = "Pending"; // Pending, Anchored, LocalAnchored, Failed

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? AnchoredAt { get; set; }
    public DateTime? LastAttemptAt { get; set; }
    public DateTime? NextRetryAt { get; set; }
    public int RetryCount { get; set; }
    [MaxLength(2000)] public string? LastError { get; set; }
    [Required, MaxLength(100)] public string TenantCode { get; set; } = "DEFAULT";

    // Navigation
    public ICollection<AuditLog> AuditLogs { get; set; } = new List<AuditLog>();
}
