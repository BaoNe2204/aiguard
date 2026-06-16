using System.ComponentModel.DataAnnotations;

namespace aiguard_api.DTOs.Approvals;

public class ApprovalResponse
{
    public Guid Id { get; set; }
    public string RequestType { get; set; } = string.Empty;
    public Guid? EndpointEventId { get; set; }
    public Guid? AgentActionLogId { get; set; }
    public string RequestedByUserEmail { get; set; } = string.Empty;
    public string? AssignedApproverName { get; set; }
    public Guid? AssignedApproverId { get; set; }
    public string Status { get; set; } = string.Empty;
    public string? Reason { get; set; }
    public string? BusinessJustification { get; set; }
    public string? ApproverNote { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime ExpiresAt { get; set; }
    public DateTime? DecidedAt { get; set; }
    public DateTime? RevokedAt { get; set; }
    public Guid ConcurrencyToken { get; set; }

    // Embedded detail
    public string? EventSummary { get; set; }
    public int? RiskScore { get; set; }
    public string? RiskLevel { get; set; }
    public string? DataTypeMatched { get; set; }
    public string? MaskedPreview { get; set; }
}

public class ApprovalActionRequest
{
    [Required]
    public string Action { get; set; } = string.Empty; // Approve, Reject, ApproveWithMasking

    public string? Note { get; set; }

    public bool AddToWhitelist { get; set; } = false;

    public string? WhitelistKeyword { get; set; }
}

public class ApprovalJustificationRequest
{
    [Required, MaxLength(2000)]
    public string BusinessJustification { get; set; } = string.Empty;
}
