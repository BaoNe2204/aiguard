using System.ComponentModel.DataAnnotations;

namespace aiguard_api.Models;

public class AgentToolPermission
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid AgentId { get; set; }

    [Required, MaxLength(255)]
    public string ToolName { get; set; } = string.Empty;

    [Required, MaxLength(100)]
    public string Category { get; set; } = "General";

    public bool CanRead { get; set; }
    public bool CanWrite { get; set; }
    public bool CanDelete { get; set; }
    public bool CanSendExternal { get; set; }
    public bool CanExport { get; set; }
    public bool RequiresApproval { get; set; }
    public int MaxRecordsPerCall { get; set; } = 100;
    public bool RequiresSandbox { get; set; }

    public Agent Agent { get; set; } = null!;
}
