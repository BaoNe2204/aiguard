using System.ComponentModel.DataAnnotations;

namespace aiguard_api.Models;

public class PolicyListEntry
{
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required, MaxLength(20)]
    public string ListType { get; set; } = "Whitelist";

    [Required, MaxLength(50)]
    public string EntryType { get; set; } = "Keyword";

    [Required, MaxLength(500)]
    public string Value { get; set; } = string.Empty;

    public Guid? DepartmentId { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime? ExpiresAt { get; set; }
    [MaxLength(255)] public string? Source { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public Department? Department { get; set; }
    [Required, MaxLength(100)] public string TenantCode { get; set; } = "DEFAULT";
}
