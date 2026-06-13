using System.ComponentModel.DataAnnotations;

namespace aiguard_api.Models;

public class SecurityPolicy
{
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required, MaxLength(255)]
    public string Name { get; set; } = string.Empty;

    public Guid? DepartmentId { get; set; }

    public int SensitivityThreshold { get; set; } = 70; // 0-100

    public bool EnableEmailDetection { get; set; } = true;
    public bool EnablePhoneDetection { get; set; } = true;
    public bool EnableCccdDetection { get; set; } = true;
    public bool EnableApiKeyDetection { get; set; } = true;
    public bool EnablePasswordDetection { get; set; } = true;
    public bool EnableTokenDetection { get; set; } = true;
    public bool EnableDbUrlDetection { get; set; } = true;
    public bool EnablePrivateKeyDetection { get; set; } = true;
    public bool EnableSourceCodeDetection { get; set; } = true;
    public bool EnableFinancialDetection { get; set; } = true;
    public bool EnableHrDetection { get; set; } = true;

    [Required, MaxLength(50)]
    public string LowAction { get; set; } = "Allow";

    [Required, MaxLength(50)]
    public string MediumAction { get; set; } = "Mask";

    [Required, MaxLength(50)]
    public string HighAction { get; set; } = "PendingApproval";

    [Required, MaxLength(50)]
    public string CriticalAction { get; set; } = "Block";

    public bool IsActive { get; set; } = true;
    public bool ScanOnPaste { get; set; } = true;
    public bool ScanOnSubmit { get; set; } = true;
    public bool ScanFileUpload { get; set; } = true;
    public bool ClipboardWarning { get; set; } = true;
    public bool OfflineCriticalBlock { get; set; } = true;

    [Required, MaxLength(50)]
    public string Version { get; set; } = "1.0.0";

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public Department? Department { get; set; }
    [Required, MaxLength(100)] public string TenantCode { get; set; } = "DEFAULT";
}
