using System.ComponentModel.DataAnnotations;

namespace aiguard_api.Models;

public class RefreshSession
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    [Required, MaxLength(128)] public string TokenHash { get; set; } = string.Empty;
    [MaxLength(128)] public string? ReplacedByTokenHash { get; set; }
    [MaxLength(100)] public string? IpAddress { get; set; }
    [MaxLength(500)] public string? UserAgent { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime ExpiresAt { get; set; }
    public DateTime? LastUsedAt { get; set; }
    public DateTime? RevokedAt { get; set; }
    [MaxLength(500)] public string? RevokeReason { get; set; }
    [Required, MaxLength(100)] public string TenantCode { get; set; } = "DEFAULT";
    public User User { get; set; } = null!;
}

public class MfaRecoveryCode
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    [Required, MaxLength(128)] public string CodeHash { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UsedAt { get; set; }
    [Required, MaxLength(100)] public string TenantCode { get; set; } = "DEFAULT";
    public User User { get; set; } = null!;
}

public class SecurityPolicyVersion
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid SecurityPolicyId { get; set; }
    [Required, MaxLength(50)] public string Version { get; set; } = string.Empty;
    [Required] public string SnapshotJson { get; set; } = "{}";
    [MaxLength(2000)] public string? ChangeReason { get; set; }
    [MaxLength(255)] public string? CreatedByEmail { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    [Required, MaxLength(100)] public string TenantCode { get; set; } = "DEFAULT";
    public SecurityPolicy SecurityPolicy { get; set; } = null!;
}

public class AgentCredential
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid AgentId { get; set; }
    [Required, MaxLength(30)] public string KeyPrefix { get; set; } = string.Empty;
    [Required, MaxLength(128)] public string KeyHash { get; set; } = string.Empty;
    [Required, MaxLength(50)] public string Status { get; set; } = "Active";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime ExpiresAt { get; set; } = DateTime.UtcNow.AddYears(1);
    public DateTime? LastUsedAt { get; set; }
    public DateTime? RevokedAt { get; set; }
    [Required, MaxLength(100)] public string TenantCode { get; set; } = "DEFAULT";
    public Agent Agent { get; set; } = null!;
}

public class TenantSignupVerificationToken
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TenantId { get; set; }
    public Guid UserId { get; set; }
    [Required, MaxLength(128)] public string TokenHash { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime ExpiresAt { get; set; }
    public DateTime? UsedAt { get; set; }
    [Required, MaxLength(100)] public string TenantCode { get; set; } = "DEFAULT";
    public Tenant Tenant { get; set; } = null!;
    public User User { get; set; } = null!;
}
