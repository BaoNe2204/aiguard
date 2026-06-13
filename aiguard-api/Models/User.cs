using System.ComponentModel.DataAnnotations;

namespace aiguard_api.Models;

public class User
{
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required, MaxLength(255)]
    public string FullName { get; set; } = string.Empty;

    [Required, MaxLength(255)]
    public string Email { get; set; } = string.Empty;

    [Required, MaxLength(500)]
    public string PasswordHash { get; set; } = string.Empty;

    [Required, MaxLength(50)]
    public string Role { get; set; } = "Employee"; // Employee, DepartmentManager, SecurityAdmin, SystemAdmin, Auditor

    public Guid? DepartmentId { get; set; }

    public bool IsActive { get; set; } = true;
    public bool MfaRequired { get; set; }
    public bool MfaEnabled { get; set; }
    [MaxLength(1000)] public string? MfaSecretProtected { get; set; }
    public DateTime? MfaEnabledAt { get; set; }
    [MaxLength(50)] public string AuthProvider { get; set; } = "Local";
    [MaxLength(255)] public string? ExternalSubjectId { get; set; }
    public DateTime? LastLoginAt { get; set; }

    public string? RefreshToken { get; set; }
    public DateTime? RefreshTokenExpiry { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    [Required, MaxLength(100)] public string TenantCode { get; set; } = "DEFAULT";

    // Navigation
    public Department? Department { get; set; }
    public ICollection<Approval> AssignedApprovals { get; set; } = new List<Approval>();
    public ICollection<MfaLoginChallenge> MfaLoginChallenges { get; set; } = new List<MfaLoginChallenge>();
}
