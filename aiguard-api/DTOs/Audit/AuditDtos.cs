namespace aiguard_api.DTOs.Audit;

public class AuditLogResponse
{
    public Guid Id { get; set; }
    public string EventType { get; set; } = string.Empty;
    public string ActorType { get; set; } = string.Empty;
    public string? ActorEmail { get; set; }
    public string? DepartmentName { get; set; }
    public string? RiskLevel { get; set; }
    public string? Decision { get; set; }
    public string EventHash { get; set; } = string.Empty;
    public string? PreviousHash { get; set; }
    public Guid? BlockchainBatchId { get; set; }
    public string? BlockchainStatus { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class BlockchainBatchResponse
{
    public Guid Id { get; set; }
    public int LogCount { get; set; }
    public string BatchHash { get; set; } = string.Empty;
    public string? TransactionHash { get; set; }
    public long? BlockNumber { get; set; }
    public string Status { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime? AnchoredAt { get; set; }
}

public class VerifyBatchResponse
{
    public Guid BatchId { get; set; }
    public string BatchHash { get; set; } = string.Empty;
    public string ComputedHash { get; set; } = string.Empty;
    public bool IsMatch { get; set; }
    public string VerificationStatus { get; set; } = string.Empty; // Verified, Mismatch
    public DateTime VerifiedAt { get; set; }
}
