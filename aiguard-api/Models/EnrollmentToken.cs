using System.ComponentModel.DataAnnotations;

namespace aiguard_api.Models;

public class EnrollmentToken
{
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required, MaxLength(128)]
    public string TokenHash { get; set; } = string.Empty;

    [Required, MaxLength(100)]
    public string TenantCode { get; set; } = "DEFAULT";

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime ExpiresAt { get; set; }
    public bool IsRevoked { get; set; }
}
