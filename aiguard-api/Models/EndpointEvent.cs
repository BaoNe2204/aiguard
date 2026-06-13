using System.ComponentModel.DataAnnotations;

namespace aiguard_api.Models;

public class EndpointEvent
{
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required, MaxLength(255)]
    public string UserEmail { get; set; } = string.Empty;

    [Required, MaxLength(100)]
    public string Hostname { get; set; } = string.Empty;

    [Required, MaxLength(100)]
    public string Browser { get; set; } = string.Empty;

    [Required, MaxLength(100)]
    public string WebsiteAi { get; set; } = string.Empty;

    [Required, MaxLength(100)]
    public string EventType { get; set; } = string.Empty; // PromptPasteDetected, SendBlocked, PromptMasked, FileUploadBlocked, ExtensionDisabled

    public int RiskScore { get; set; }

    [Required, MaxLength(50)]
    public string RiskLevel { get; set; } = "Low"; // Low, Medium, High, Critical

    [Required, MaxLength(50)]
    public string Decision { get; set; } = "Allow"; // Allow, Mask, PendingApproval, Block

    [Required, MaxLength(255)]
    public string DataTypeMatched { get; set; } = string.Empty;

    public string? MaskedContentPreview { get; set; }

    [Required, MaxLength(128)]
    public string OriginalHash { get; set; } = string.Empty;

    [Required, MaxLength(50)]
    public string PolicyVersion { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    [Required, MaxLength(100)]
    public string TenantCode { get; set; } = "DEFAULT";
    public Guid? ScanReceiptId { get; set; }
    public Guid? DepartmentId { get; set; }

    // Navigation
    public ICollection<Approval> Approvals { get; set; } = new List<Approval>();
}
