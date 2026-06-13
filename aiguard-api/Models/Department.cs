using System.ComponentModel.DataAnnotations;

namespace aiguard_api.Models;

public class Department
{
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required, MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    [Required, MaxLength(50)]
    public string Code { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    [Required, MaxLength(100)] public string TenantCode { get; set; } = "DEFAULT";

    // Navigation
    public ICollection<User> Users { get; set; } = new List<User>();
    public ICollection<Agent> Agents { get; set; } = new List<Agent>();
    public ICollection<SecurityPolicy> SecurityPolicies { get; set; } = new List<SecurityPolicy>();
    public ICollection<AuditLog> AuditLogs { get; set; } = new List<AuditLog>();
}
