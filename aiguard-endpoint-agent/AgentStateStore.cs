using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

namespace AIGuard.EndpointAgent;

public sealed class AgentStateStore
{
    private readonly string _directory =
        Environment.GetEnvironmentVariable("AIGUARD_AGENT_HOME") is { Length: > 0 } configured
            ? configured
            : Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.CommonApplicationData), "AIGuard");

    public string DirectoryPath => _directory;
    public string StatePath => Path.Combine(_directory, "agent-state.json");
    public string ConfigPath => Path.Combine(_directory, "agent-config.json");

    public AgentConfig LoadConfig()
    {
        Directory.CreateDirectory(_directory);
        if (!File.Exists(ConfigPath))
        {
            var template = new AgentConfig();
            File.WriteAllText(ConfigPath, JsonSerializer.Serialize(template, JsonOptions));
            throw new InvalidOperationException($"Configure {ConfigPath} before starting the service.");
        }
        return JsonSerializer.Deserialize<AgentConfig>(File.ReadAllText(ConfigPath), JsonOptions)
            ?? throw new InvalidOperationException("Invalid agent configuration.");
    }

    public void SaveConfig(AgentConfig config)
    {
        Directory.CreateDirectory(_directory);
        File.WriteAllText(ConfigPath, JsonSerializer.Serialize(config, JsonOptions));
    }

    public AgentState? LoadState()
    {
        if (!File.Exists(StatePath)) return null;
        var stored = JsonSerializer.Deserialize<StoredState>(File.ReadAllText(StatePath), JsonOptions);
        if (stored == null) return null;
        var clear = ProtectedData.Unprotect(Convert.FromBase64String(stored.ProtectedEndpointKey), null,
            DataProtectionScope.LocalMachine);
        return new AgentState(stored.DeviceId, Encoding.UTF8.GetString(clear), stored.PolicyVersion);
    }

    public void SaveState(AgentState state)
    {
        Directory.CreateDirectory(_directory);
        var protectedKey = ProtectedData.Protect(Encoding.UTF8.GetBytes(state.EndpointKey), null,
            DataProtectionScope.LocalMachine);
        var stored = new StoredState(state.DeviceId, Convert.ToBase64String(protectedKey), state.PolicyVersion);
        File.WriteAllText(StatePath, JsonSerializer.Serialize(stored, JsonOptions));
    }

    public void ClearState()
    {
        if (File.Exists(StatePath)) File.Delete(StatePath);
    }

    private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNameCaseInsensitive = true, WriteIndented = true };
    private sealed record StoredState(Guid DeviceId, string ProtectedEndpointKey, string PolicyVersion);
}

public sealed class AgentConfig
{
    public string ApiBaseUrl { get; set; } = "http://127.0.0.1:5185";
    public string EnrollmentToken { get; set; } = "";
    public string UserEmail { get; set; } = "";
    public string DepartmentName { get; set; } = "";
    public int HeartbeatSeconds { get; set; } = 30;
}

public sealed record AgentState(Guid DeviceId, string EndpointKey, string PolicyVersion);
