using System.ComponentModel.DataAnnotations;

namespace aiguard_api.Models;

public class MfaLoginChallenge
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }

    [Required, MaxLength(128)]
    public string ChallengeTokenHash { get; set; } = string.Empty;

    public bool IsSetup { get; set; }

    [MaxLength(1000)]
    public string? SetupSecretProtected { get; set; }

    public DateTime ExpiresAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ConsumedAt { get; set; }

    public User User { get; set; } = null!;
}
