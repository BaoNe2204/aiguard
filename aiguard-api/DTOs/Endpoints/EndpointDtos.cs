using System.ComponentModel.DataAnnotations;

namespace aiguard_api.DTOs.Endpoints;

public class DeviceResponse
{
    public Guid Id { get; set; }
    public string Hostname { get; set; } = string.Empty;
    public string UserEmail { get; set; } = string.Empty;
    public string DepartmentName { get; set; } = string.Empty;
    public string? AgentVersion { get; set; }
    public string? ExtensionVersion { get; set; }
    public bool ExtensionActive { get; set; }
    public string PolicyVersion { get; set; } = string.Empty;
    public DateTime LastSeen { get; set; }
    public string RiskStatus { get; set; } = string.Empty;
    public bool IsOnline { get; set; }
    public bool IsQuarantined { get; set; }
    public bool IsRemoteDisabled { get; set; }
    public string? QuarantineReason { get; set; }
    public DateTime? LastPolicySyncAt { get; set; }
    public string AgentStatus { get; set; } = string.Empty;
}

public class EndpointEventResponse
{
    public Guid Id { get; set; }
    public string UserEmail { get; set; } = string.Empty;
    public string Hostname { get; set; } = string.Empty;
    public string Browser { get; set; } = string.Empty;
    public string WebsiteAi { get; set; } = string.Empty;
    public string EventType { get; set; } = string.Empty;
    public int RiskScore { get; set; }
    public string RiskLevel { get; set; } = string.Empty;
    public string Decision { get; set; } = string.Empty;
    public string DataTypeMatched { get; set; } = string.Empty;
    public string? MaskedContentPreview { get; set; }
    public string OriginalHash { get; set; } = string.Empty;
    public string PolicyVersion { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public Guid? ApprovalId { get; set; }
}

public class CreateEndpointEventRequest
{
    [Required]
    public Guid ScanId { get; set; }
    [Required]
    public string Receipt { get; set; } = string.Empty;
    [Required]
    public string UserEmail { get; set; } = string.Empty;
    [Required]
    public string Hostname { get; set; } = string.Empty;
    [Required]
    public string Browser { get; set; } = string.Empty;
    [Required]
    public string WebsiteAi { get; set; } = string.Empty;
    [Required]
    public string EventType { get; set; } = string.Empty;
    public int RiskScore { get; set; }
    [Required]
    public string RiskLevel { get; set; } = string.Empty;
    [Required]
    public string Decision { get; set; } = string.Empty;
    [Required]
    public string DataTypeMatched { get; set; } = string.Empty;
    public string? MaskedContentPreview { get; set; }
    [Required]
    [RegularExpression("^[a-fA-F0-9]{64}$", ErrorMessage = "OriginalHash must be a SHA-256 hex string")]
    public string OriginalHash { get; set; } = string.Empty;
    [Required]
    public string PolicyVersion { get; set; } = string.Empty;
    public string? BusinessJustification { get; set; }
}

public class RotateEndpointKeyResponse
{
    public Guid DeviceId { get; set; }
    public string EndpointKey { get; set; } = string.Empty;
    public int KeyVersion { get; set; }
    public DateTime RotatedAt { get; set; }
}

public class AiWebsiteResponse
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string DomainPattern { get; set; } = string.Empty;
    public bool IsActive { get; set; }
    public string Mode { get; set; } = string.Empty;
    public DateTime LastUpdated { get; set; }
}

public class CreateAiWebsiteRuleRequest
{
    [Required, MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    [Required, MaxLength(500)]
    public string DomainPattern { get; set; } = string.Empty;

    [Required]
    public string Mode { get; set; } = "Block";
}

public class UpdateAiWebsiteRequest
{
    public string? Name { get; set; }
    public string? DomainPattern { get; set; }
    public bool? IsActive { get; set; }
    public string? Mode { get; set; }
}

public class HeartbeatRequest
{
    [Required]
    public string Hostname { get; set; } = string.Empty;
    public string? AgentVersion { get; set; }
    public string? ExtensionVersion { get; set; }
    public bool? ExtensionActive { get; set; }
    public string? PolicyVersion { get; set; }
    public string? AgentStatus { get; set; }
}

public class DeviceControlRequest
{
    [Required, MaxLength(1000)]
    public string Reason { get; set; } = string.Empty;
}

public class DeploymentTokenResponse
{
    public string? Token { get; set; }
    public Guid TokenId { get; set; }
    public string TenantCode { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime ExpiresAt { get; set; }
    public string InstallCommand { get; set; } = string.Empty;
    public string ExtensionSetupCommand { get; set; } = string.Empty;
    public string ExtensionSetupUrl { get; set; } = string.Empty;
}

public class EnrollDeviceRequest
{
    [Required]
    public string EnrollmentToken { get; set; } = string.Empty;

    [Required, MaxLength(100)]
    public string Hostname { get; set; } = string.Empty;

    [Required, EmailAddress]
    public string UserEmail { get; set; } = string.Empty;

    [Required, MaxLength(100)]
    public string DepartmentName { get; set; } = string.Empty;

    public string? AgentVersion { get; set; }
    public string? ExtensionVersion { get; set; }
}

public class EnrollDeviceResponse
{
    public Guid DeviceId { get; set; }
    public string EndpointKey { get; set; } = string.Empty;
    public string PolicyVersion { get; set; } = string.Empty;
    public DateTime EnrolledAt { get; set; }
}

public class ShadowAiDiscoverRequest
{
    [Required, MaxLength(100)] public string Hostname { get; set; } = string.Empty;
    [Required, MaxLength(1000)] public string Url { get; set; } = string.Empty;
    [MaxLength(500)] public string? PageTitle { get; set; }
    [MaxLength(100)] public string Browser { get; set; } = "Chromium";
}

public class ShadowAiDiscoveryResponse
{
    public Guid Id { get; set; }
    public string Hostname { get; set; } = string.Empty;
    public string UserEmail { get; set; } = string.Empty;
    public string DepartmentName { get; set; } = string.Empty;
    public string Domain { get; set; } = string.Empty;
    public string? Url { get; set; }
    public string? PageTitle { get; set; }
    public bool IsApproved { get; set; }
    public string Decision { get; set; } = string.Empty;
    public bool ShouldBlock { get; set; }
    public int VisitCount { get; set; }
    public DateTime FirstSeenAt { get; set; }
    public DateTime LastSeenAt { get; set; }
}

public class EndpointAiPolicyResponse
{
    public List<AiWebsiteResponse> Websites { get; set; } = new();
    public bool BlockUnknownAi { get; set; } = true;
}

public class EndpointTelemetryItemRequest
{
    [Required, MaxLength(100)] public string Category { get; set; } = string.Empty;
    [Required, MaxLength(100)] public string EventType { get; set; } = string.Empty;
    [MaxLength(2000)] public string? Detail { get; set; }
    [MaxLength(30)] public string Severity { get; set; } = "Info";
    public DateTime OccurredAt { get; set; } = DateTime.UtcNow;
}

public class EndpointTelemetryBatchRequest
{
    [Required, MaxLength(100)] public string Hostname { get; set; } = string.Empty;
    [Required] public List<EndpointTelemetryItemRequest> Events { get; set; } = new();
}

public class EndpointTelemetryResponse : EndpointTelemetryItemRequest
{
    public Guid Id { get; set; }
    public string Hostname { get; set; } = string.Empty;
    public string UserEmail { get; set; } = string.Empty;
    public string DepartmentName { get; set; } = string.Empty;
    public DateTime ReceivedAt { get; set; }
}
