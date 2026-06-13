using System.ComponentModel.DataAnnotations;

namespace aiguard_api.Models;

public class Device
{
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required, MaxLength(100)]
    public string Hostname { get; set; } = string.Empty;

    [Required, MaxLength(255)]
    public string UserEmail { get; set; } = string.Empty;

    [Required, MaxLength(100)]
    public string DepartmentName { get; set; } = string.Empty;

    [MaxLength(50)]
    public string? AgentVersion { get; set; }

    [MaxLength(50)]
    public string? ExtensionVersion { get; set; }

    public bool ExtensionActive { get; set; }

    [Required, MaxLength(50)]
    public string PolicyVersion { get; set; } = "p-default";

    public DateTime LastSeen { get; set; } = DateTime.UtcNow;

    [Required, MaxLength(50)]
    public string RiskStatus { get; set; } = "Safe"; // Safe, Warning, Critical

    [MaxLength(128)]
    public string? EndpointKeyHash { get; set; }

    public DateTime? EnrolledAt { get; set; }
    public int EndpointKeyVersion { get; set; } = 1;
    public bool EndpointKeyRevoked { get; set; }
    public DateTime? EndpointKeyRotatedAt { get; set; }
    public bool IsQuarantined { get; set; }
    public bool IsRemoteDisabled { get; set; }
    [MaxLength(1000)] public string? QuarantineReason { get; set; }
    public DateTime? QuarantinedAt { get; set; }
    public DateTime? LastPolicySyncAt { get; set; }
    public DateTime? ExtensionLastSeenAt { get; set; }
    [MaxLength(50)] public string AgentStatus { get; set; } = "Unknown";
    [Required, MaxLength(100)]
    public string TenantCode { get; set; } = "DEFAULT";
    public Guid? DepartmentId { get; set; }
}
