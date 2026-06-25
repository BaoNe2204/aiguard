using System.ComponentModel.DataAnnotations;

namespace aiguard_api.DTOs.Governance;

public class UserAdminResponse
{
    public Guid Id { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public Guid? DepartmentId { get; set; }
    public string? DepartmentName { get; set; }
    public bool IsActive { get; set; }
    public bool MfaRequired { get; set; }
    public bool MfaEnabled { get; set; }
    public string AuthProvider { get; set; } = string.Empty;
    public DateTime? LastLoginAt { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class UpsertUserRequest
{
    [Required, MaxLength(255)] public string FullName { get; set; } = string.Empty;
    [Required, EmailAddress, MaxLength(255)] public string Email { get; set; } = string.Empty;
    [Required, MaxLength(50)] public string Role { get; set; } = "Employee";
    public Guid? DepartmentId { get; set; }
    [MinLength(8)] public string? Password { get; set; }
    public bool IsActive { get; set; } = true;
    public bool MfaRequired { get; set; }
    [MaxLength(50)] public string AuthProvider { get; set; } = "Local";
}

public class DepartmentAdminResponse
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public int UserCount { get; set; }
    public int DeviceCount { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class UpsertDepartmentRequest
{
    [Required, MaxLength(100)] public string Name { get; set; } = string.Empty;
    [Required, MaxLength(50)] public string Code { get; set; } = string.Empty;
}

public class FalsePositiveCreateRequest
{
    [Required] public Guid EndpointEventId { get; set; }
    [Required, MaxLength(255)] public string DetectorName { get; set; } = string.Empty;
    [Required, MaxLength(2000)] public string Reason { get; set; } = string.Empty;
}

public class FalsePositiveReviewRequest
{
    [Required] public string Action { get; set; } = "Reject";
    public string? Note { get; set; }
    public bool CreateWhitelist { get; set; }
    public int? WhitelistDurationDays { get; set; }
}

public class FalsePositiveResponse
{
    public Guid Id { get; set; }
    public Guid EndpointEventId { get; set; }
    public string ReportedByEmail { get; set; } = string.Empty;
    public string DetectorName { get; set; } = string.Empty;
    public string Reason { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string? ReviewNote { get; set; }
    public bool CreateWhitelist { get; set; }
    public DateTime? WhitelistExpiresAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? ReviewedAt { get; set; }
    public string? MaskedContentPreview { get; set; }
}

public class IncidentResponse
{
    public Guid Id { get; set; }
    public string IncidentNumber { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Severity { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string SourceType { get; set; } = string.Empty;
    public Guid? EndpointEventId { get; set; }
    public Guid? AgentActionLogId { get; set; }
    public Guid? AssignedToUserId { get; set; }
    public string? AssignedToName { get; set; }
    public string? Summary { get; set; }
    public string? Resolution { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public DateTime? ResolvedAt { get; set; }
}

public class CreateIncidentRequest
{
    [Required, MaxLength(255)] public string Title { get; set; } = string.Empty;
    [Required, MaxLength(50)] public string Severity { get; set; } = "High";
    [Required, MaxLength(50)] public string SourceType { get; set; } = "Manual";
    public Guid? EndpointEventId { get; set; }
    public Guid? AgentActionLogId { get; set; }
    public Guid? AssignedToUserId { get; set; }
    public string? Summary { get; set; }
}

public class UpdateIncidentRequest
{
    public string? Status { get; set; }
    public string? Severity { get; set; }
    public Guid? AssignedToUserId { get; set; }
    public string? Summary { get; set; }
    public string? Resolution { get; set; }
}

public class NotificationResponse
{
    public Guid Id { get; set; }
    public string Type { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string? ActionUrl { get; set; }
    public bool IsRead { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? ReadAt { get; set; }
}

public class PolicyRuleRequest
{
    [Required, MaxLength(255)] public string Name { get; set; } = string.Empty;
    public int Priority { get; set; } = 100;
    public Guid? DepartmentId { get; set; }
    public string? DataType { get; set; }
    public string? WebsitePattern { get; set; }
    public string? UserEmail { get; set; }
    public string? Hostname { get; set; }
    public TimeOnly? ActiveFrom { get; set; }
    public TimeOnly? ActiveTo { get; set; }
    [Required] public string Action { get; set; } = "Block";
    public bool IsEnabled { get; set; } = true;
}

public class PolicyRuleResponse : PolicyRuleRequest
{
    public Guid Id { get; set; }
    public string? DepartmentName { get; set; }
    public string Status { get; set; } = string.Empty;
    public string Version { get; set; } = string.Empty;
    public DateTime UpdatedAt { get; set; }
    public DateTime? PublishedAt { get; set; }
}

public class PolicySimulationRequest
{
    public string? DepartmentCode { get; set; }
    public string? DataType { get; set; }
    public string? Website { get; set; }
    public string? UserEmail { get; set; }
    public string? Hostname { get; set; }
    public TimeOnly? Time { get; set; }
}

public class RetentionPolicyRequest
{
    [Range(1, 3650)] public int EndpointEventDays { get; set; } = 90;
    [Range(1, 3650)] public int AuditLogDays { get; set; } = 365;
    [Range(1, 3650)] public int NotificationDays { get; set; } = 30;
    [Range(1, 3650)] public int IncidentDays { get; set; } = 730;
    public bool StoreOriginalContent { get; set; }
    public bool EncryptSensitivePreview { get; set; } = true;
}

public class IntegrationRequest
{
    [Required, MaxLength(100)] public string Name { get; set; } = string.Empty;
    [Required, MaxLength(50)] public string Type { get; set; } = "Webhook";
    [Required, MaxLength(1000)] public string Endpoint { get; set; } = string.Empty;
    public string? ConfigurationJson { get; set; }
    public string? Secret { get; set; }
    public bool IsEnabled { get; set; } = true;
}

public class IntegrationResponse
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public string Endpoint { get; set; } = string.Empty;
    public bool IsEnabled { get; set; }
    public DateTime? LastSuccessAt { get; set; }
    public DateTime? LastFailureAt { get; set; }
    public string? LastError { get; set; }
}

public class GovernanceHealthResponse
{
    public int OnlineDevices { get; set; }
    public int OfflineDevices { get; set; }
    public int QuarantinedDevices { get; set; }
    public int ExtensionDisabledDevices { get; set; }
    public int StalePolicyDevices { get; set; }
    public int PendingApprovals { get; set; }
    public int ExpiredApprovals { get; set; }
    public int OpenIncidents { get; set; }
    public int PendingFalsePositives { get; set; }
    public int FailedIntegrations { get; set; }
    public double ApiUptimeSeconds { get; set; }
}

public class ExactDataMatchImportRequest
{
    [Required, MaxLength(100)] public string DataType { get; set; } = string.Empty;
    [Required] public List<string> Values { get; set; } = new();
    public Guid? DepartmentId { get; set; }
    public string? Label { get; set; }
    public DateTime? ExpiresAt { get; set; }
}

public class ExactDataMatchResponse
{
    public Guid Id { get; set; }
    public string DataType { get; set; } = string.Empty;
    public string? Label { get; set; }
    public Guid? DepartmentId { get; set; }
    public string? DepartmentName { get; set; }
    public bool IsActive { get; set; }
    public DateTime? ExpiresAt { get; set; }
    public DateTime CreatedAt { get; set; }
}
