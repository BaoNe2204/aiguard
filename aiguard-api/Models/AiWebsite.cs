using System.ComponentModel.DataAnnotations;

namespace aiguard_api.Models;

public class AiWebsite
{
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required, MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    [Required, MaxLength(500)]
    public string DomainPattern { get; set; } = string.Empty;

    public bool IsActive { get; set; } = true;

    [Required, MaxLength(50)]
    public string Mode { get; set; } = "Block"; // Allow, Mask, PendingApproval, Block

    public DateTime LastUpdated { get; set; } = DateTime.UtcNow;
    [Required, MaxLength(100)] public string TenantCode { get; set; } = "DEFAULT";
}
