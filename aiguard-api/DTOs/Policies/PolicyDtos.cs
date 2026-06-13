using System.ComponentModel.DataAnnotations;

namespace aiguard_api.DTOs.Policies;

public class SecurityPolicyResponse
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? DepartmentName { get; set; }
    public Guid? DepartmentId { get; set; }
    public int SensitivityThreshold { get; set; }
    public bool EnableEmailDetection { get; set; }
    public bool EnablePhoneDetection { get; set; }
    public bool EnableCccdDetection { get; set; }
    public bool EnableApiKeyDetection { get; set; }
    public bool EnablePasswordDetection { get; set; }
    public bool EnableTokenDetection { get; set; }
    public bool EnableDbUrlDetection { get; set; }
    public bool EnablePrivateKeyDetection { get; set; }
    public bool EnableSourceCodeDetection { get; set; }
    public bool EnableFinancialDetection { get; set; }
    public bool EnableHrDetection { get; set; }
    public string LowAction { get; set; } = string.Empty;
    public string MediumAction { get; set; } = string.Empty;
    public string HighAction { get; set; } = string.Empty;
    public string CriticalAction { get; set; } = string.Empty;
    public bool IsActive { get; set; }
    public bool ScanOnPaste { get; set; }
    public bool ScanOnSubmit { get; set; }
    public bool ScanFileUpload { get; set; }
    public bool ClipboardWarning { get; set; }
    public bool OfflineCriticalBlock { get; set; }
    public string Version { get; set; } = string.Empty;
    public DateTime UpdatedAt { get; set; }
}

public class UpdatePolicyRequest
{
    public int? SensitivityThreshold { get; set; }
    public bool? EnableEmailDetection { get; set; }
    public bool? EnablePhoneDetection { get; set; }
    public bool? EnableCccdDetection { get; set; }
    public bool? EnableApiKeyDetection { get; set; }
    public bool? EnablePasswordDetection { get; set; }
    public bool? EnableTokenDetection { get; set; }
    public bool? EnableDbUrlDetection { get; set; }
    public bool? EnablePrivateKeyDetection { get; set; }
    public bool? EnableSourceCodeDetection { get; set; }
    public bool? EnableFinancialDetection { get; set; }
    public bool? EnableHrDetection { get; set; }
    public string? LowAction { get; set; }
    public string? MediumAction { get; set; }
    public string? HighAction { get; set; }
    public string? CriticalAction { get; set; }
    public bool? IsActive { get; set; }
    public bool? ScanOnPaste { get; set; }
    public bool? ScanOnSubmit { get; set; }
    public bool? ScanFileUpload { get; set; }
    public bool? ClipboardWarning { get; set; }
    public bool? OfflineCriticalBlock { get; set; }
}

public class PolicyVersionResponse
{
    public Guid Id { get; set; }
    public string Version { get; set; } = string.Empty;
    public string UpdatedBy { get; set; } = string.Empty;
    public DateTime UpdatedAt { get; set; }
    public string Reason { get; set; } = string.Empty;
}

public class WhitelistBlacklistResponse
{
    public List<string> Whitelist { get; set; } = new();
    public List<string> Blacklist { get; set; } = new();
}

public class UpdateWhitelistBlacklistRequest
{
    public List<string>? Whitelist { get; set; }
    public List<string>? Blacklist { get; set; }
}
