using System.ComponentModel.DataAnnotations;

namespace aiguard_api.Models;

public class FalsePositiveReport
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid EndpointEventId { get; set; }
    [Required, MaxLength(255)] public string ReportedByEmail { get; set; } = string.Empty;
    [Required, MaxLength(255)] public string DetectorName { get; set; } = string.Empty;
    [Required, MaxLength(2000)] public string Reason { get; set; } = string.Empty;
    [Required, MaxLength(50)] public string Status { get; set; } = "Pending";
    public Guid? ReviewedByUserId { get; set; }
    public string? ReviewNote { get; set; }
    public bool CreateWhitelist { get; set; }
    public DateTime? WhitelistExpiresAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ReviewedAt { get; set; }
    [Required, MaxLength(100)] public string TenantCode { get; set; } = "DEFAULT";
    public Guid? DepartmentId { get; set; }
    public EndpointEvent EndpointEvent { get; set; } = null!;
    public User? ReviewedByUser { get; set; }
}

public class IncidentCase
{
    public Guid Id { get; set; } = Guid.NewGuid();
    [Required, MaxLength(50)] public string IncidentNumber { get; set; } = string.Empty;
    [Required, MaxLength(255)] public string Title { get; set; } = string.Empty;
    [Required, MaxLength(50)] public string Severity { get; set; } = "High";
    [Required, MaxLength(50)] public string Status { get; set; } = "New";
    [Required, MaxLength(50)] public string SourceType { get; set; } = "EndpointEvent";
    public Guid? EndpointEventId { get; set; }
    public Guid? AgentActionLogId { get; set; }
    public Guid? AssignedToUserId { get; set; }
    public string? Summary { get; set; }
    public string? Resolution { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ResolvedAt { get; set; }
    [Required, MaxLength(100)] public string TenantCode { get; set; } = "DEFAULT";
    public Guid? DepartmentId { get; set; }
    public EndpointEvent? EndpointEvent { get; set; }
    public AgentActionLog? AgentActionLog { get; set; }
    public User? AssignedToUser { get; set; }
}

public class UserNotification
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid? RecipientUserId { get; set; }
    [MaxLength(255)] public string? RecipientEmail { get; set; }
    [MaxLength(50)] public string? RecipientRole { get; set; }
    [Required, MaxLength(100)] public string Type { get; set; } = "Information";
    [Required, MaxLength(255)] public string Title { get; set; } = string.Empty;
    [Required, MaxLength(2000)] public string Message { get; set; } = string.Empty;
    [MaxLength(500)] public string? ActionUrl { get; set; }
    public string? MetadataJson { get; set; }
    public bool IsRead { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ReadAt { get; set; }
    [Required, MaxLength(100)] public string TenantCode { get; set; } = "DEFAULT";
    public Guid? DepartmentId { get; set; }
    public User? RecipientUser { get; set; }
}

public class PolicyRule
{
    public Guid Id { get; set; } = Guid.NewGuid();
    [Required, MaxLength(255)] public string Name { get; set; } = string.Empty;
    public int Priority { get; set; } = 100;
    public Guid? DepartmentId { get; set; }
    [MaxLength(255)] public string? DataType { get; set; }
    [MaxLength(500)] public string? WebsitePattern { get; set; }
    [MaxLength(255)] public string? UserEmail { get; set; }
    [MaxLength(100)] public string? Hostname { get; set; }
    public TimeOnly? ActiveFrom { get; set; }
    public TimeOnly? ActiveTo { get; set; }
    [Required, MaxLength(50)] public string Action { get; set; } = "Block";
    [Required, MaxLength(50)] public string Status { get; set; } = "Draft";
    [Required, MaxLength(50)] public string Version { get; set; } = "draft-1";
    public bool IsEnabled { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? PublishedAt { get; set; }
    [Required, MaxLength(100)] public string TenantCode { get; set; } = "DEFAULT";
    public Department? Department { get; set; }
}

public class PolicyVersionSnapshot
{
    public Guid Id { get; set; } = Guid.NewGuid();
    [Required, MaxLength(50)] public string Version { get; set; } = string.Empty;
    [Required, MaxLength(50)] public string Status { get; set; } = "Published";
    [Required] public string SnapshotJson { get; set; } = "{}";
    [MaxLength(2000)] public string? ChangeReason { get; set; }
    [MaxLength(255)] public string? CreatedByEmail { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    [Required, MaxLength(100)] public string TenantCode { get; set; } = "DEFAULT";
}

public class IntegrationEndpoint
{
    public Guid Id { get; set; } = Guid.NewGuid();
    [Required, MaxLength(100)] public string Name { get; set; } = string.Empty;
    [Required, MaxLength(50)] public string Type { get; set; } = "Webhook";
    [Required, MaxLength(1000)] public string Endpoint { get; set; } = string.Empty;
    public string? ConfigurationJson { get; set; }
    [MaxLength(128)] public string? SecretHash { get; set; }
    public string? ProtectedSecret { get; set; }
    public bool IsEnabled { get; set; } = true;
    public DateTime? LastSuccessAt { get; set; }
    public DateTime? LastFailureAt { get; set; }
    public string? LastError { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    [Required, MaxLength(100)] public string TenantCode { get; set; } = "DEFAULT";
    public ICollection<IntegrationDelivery> Deliveries { get; set; } = new List<IntegrationDelivery>();
}

public class IntegrationDelivery
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid IntegrationEndpointId { get; set; }
    public Guid AuditLogId { get; set; }
    [Required, MaxLength(30)] public string Status { get; set; } = "Pending";
    public int AttemptCount { get; set; }
    public DateTime? LastAttemptAt { get; set; }
    public DateTime NextAttemptAt { get; set; } = DateTime.UtcNow;
    [MaxLength(2000)] public string? LastError { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? DeliveredAt { get; set; }
    [Required, MaxLength(100)] public string TenantCode { get; set; } = "DEFAULT";
    public IntegrationEndpoint IntegrationEndpoint { get; set; } = null!;
    public AuditLog AuditLog { get; set; } = null!;
}

public class RetentionPolicy
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public int EndpointEventDays { get; set; } = 90;
    public int AuditLogDays { get; set; } = 365;
    public int NotificationDays { get; set; } = 30;
    public int IncidentDays { get; set; } = 730;
    public bool StoreOriginalContent { get; set; }
    public bool EncryptSensitivePreview { get; set; } = true;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    [MaxLength(255)] public string? UpdatedByEmail { get; set; }
    [Required, MaxLength(100)] public string TenantCode { get; set; } = "DEFAULT";
}

public class ExactDataMatchRecord
{
    public Guid Id { get; set; } = Guid.NewGuid();
    [Required, MaxLength(100)] public string DataType { get; set; } = string.Empty;
    [Required, MaxLength(128)] public string ValueHash { get; set; } = string.Empty;
    [MaxLength(255)] public string? Label { get; set; }
    public Guid? DepartmentId { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime? ExpiresAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    [Required, MaxLength(100)] public string TenantCode { get; set; } = "DEFAULT";
    public Department? Department { get; set; }
}

public class ShadowAiDiscoveryEvent
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid DeviceId { get; set; }
    [Required, MaxLength(255)] public string Domain { get; set; } = string.Empty;
    [MaxLength(1000)] public string? Url { get; set; }
    [MaxLength(500)] public string? PageTitle { get; set; }
    [MaxLength(100)] public string Browser { get; set; } = "Chromium";
    public bool IsApproved { get; set; }
    [Required, MaxLength(50)] public string Decision { get; set; } = "Block";
    public int VisitCount { get; set; } = 1;
    public DateTime FirstSeenAt { get; set; } = DateTime.UtcNow;
    public DateTime LastSeenAt { get; set; } = DateTime.UtcNow;
    [Required, MaxLength(100)] public string TenantCode { get; set; } = "DEFAULT";
    public Guid? DepartmentId { get; set; }
    public Device Device { get; set; } = null!;
    public Department? Department { get; set; }
}

public class EndpointTelemetryEvent
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid DeviceId { get; set; }
    [Required, MaxLength(100)] public string Category { get; set; } = string.Empty;
    [Required, MaxLength(100)] public string EventType { get; set; } = string.Empty;
    [MaxLength(2000)] public string? Detail { get; set; }
    [Required, MaxLength(30)] public string Severity { get; set; } = "Info";
    public DateTime OccurredAt { get; set; } = DateTime.UtcNow;
    public DateTime ReceivedAt { get; set; } = DateTime.UtcNow;
    [Required, MaxLength(100)] public string TenantCode { get; set; } = "DEFAULT";
    public Guid? DepartmentId { get; set; }
    public Device Device { get; set; } = null!;
    public Department? Department { get; set; }
}
