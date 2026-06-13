using System.ComponentModel.DataAnnotations;

namespace aiguard_api.Models;

public class ScanReceipt
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid DeviceId { get; set; }
    [Required, MaxLength(100)] public string TenantCode { get; set; } = "DEFAULT";
    [Required, MaxLength(128)] public string ContentHash { get; set; } = string.Empty;
    public int RiskScore { get; set; }
    [Required, MaxLength(50)] public string RiskLevel { get; set; } = string.Empty;
    [Required, MaxLength(50)] public string Decision { get; set; } = string.Empty;
    [Required, MaxLength(500)] public string DataTypeMatched { get; set; } = string.Empty;
    public string? MaskedContentPreview { get; set; }
    [Required, MaxLength(50)] public string PolicyVersion { get; set; } = string.Empty;
    [Required, MaxLength(128)] public string Signature { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime ExpiresAt { get; set; }
    public DateTime? ConsumedAt { get; set; }
    public Device Device { get; set; } = null!;
}
