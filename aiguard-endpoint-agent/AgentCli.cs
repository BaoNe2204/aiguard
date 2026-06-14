using System.Text.Json;

namespace AIGuard.EndpointAgent;

public sealed class AgentCli
{
    private readonly AgentStateStore _store;
    private readonly EndpointApiClient _api;
    private readonly EndpointTelemetryCollector _telemetry;
    private readonly TextWriter _output;

    public AgentCli(
        AgentStateStore store,
        EndpointApiClient api,
        EndpointTelemetryCollector telemetry,
        TextWriter output)
    {
        _store = store;
        _api = api;
        _telemetry = telemetry;
        _output = output;
    }

    public async Task<int> RunAsync(string[] args, CancellationToken token)
    {
        if (args.Length == 0 || IsHelp(args[0]))
        {
            PrintHelp();
            return 0;
        }

        var command = args[0].ToLowerInvariant();
        var options = Parse(args.Skip(1));

        try
        {
            return command switch
            {
                "configure" => Configure(options),
                "enroll" => await EnrollAsync(force: options.ContainsKey("force"), token),
                "status" => await StatusAsync(token),
                "scan" => await ScanTextAsync(options, token),
                "scan-file" => await ScanFileAsync(options, token),
                "telemetry-once" => await TelemetryOnceAsync(token),
                "reset-state" => ResetState(),
                _ => Unknown(command)
            };
        }
        catch (Exception ex)
        {
            await _output.WriteLineAsync($"ERROR: {ex.Message}");
            return 1;
        }
    }

    private int Configure(Dictionary<string, string?> options)
    {
        var existing = TryLoadConfig();
        var config = new AgentConfig
        {
            ApiBaseUrl = Value(options, "api") ?? existing?.ApiBaseUrl ?? "http://127.0.0.1:5185",
            EnrollmentToken = Value(options, "token") ?? existing?.EnrollmentToken ?? "",
            UserEmail = Value(options, "email") ?? existing?.UserEmail ?? "",
            DepartmentName = Value(options, "department") ?? existing?.DepartmentName ?? "",
            HeartbeatSeconds = int.TryParse(Value(options, "heartbeat"), out var seconds)
                ? seconds
                : existing?.HeartbeatSeconds ?? 30
        };

        if (options.ContainsKey("clear-state")) _store.ClearState();
        _store.SaveConfig(config);

        _output.WriteLine("AIGuard Endpoint Agent configured.");
        _output.WriteLine($"Config: {_store.ConfigPath}");
        _output.WriteLine($"API: {config.ApiBaseUrl}");
        _output.WriteLine($"User: {config.UserEmail}");
        _output.WriteLine($"Department: {config.DepartmentName}");
        _output.WriteLine($"Heartbeat: {config.HeartbeatSeconds}s");
        _output.WriteLine($"Enrollment token: {(string.IsNullOrWhiteSpace(config.EnrollmentToken) ? "missing" : "configured")}");
        return 0;
    }

    private async Task<int> EnrollAsync(bool force, CancellationToken token)
    {
        if (force) _store.ClearState();
        var existing = _store.LoadState();
        if (existing != null && !force)
        {
            _output.WriteLine($"Already enrolled. DeviceId: {existing.DeviceId}");
            _output.WriteLine("Use: enroll --force to re-enroll with the configured enrollment token.");
            return 0;
        }

        var state = await _api.EnrollAsync(_store.LoadConfig(), token);
        _output.WriteLine("Enrollment succeeded.");
        _output.WriteLine($"DeviceId: {state.DeviceId}");
        _output.WriteLine($"PolicyVersion: {state.PolicyVersion}");
        _output.WriteLine($"State: {_store.StatePath}");
        return 0;
    }

    private async Task<int> StatusAsync(CancellationToken token)
    {
        var config = _store.LoadConfig();
        var state = await EnsureStateAsync(config, token);
        var sync = await _api.HeartbeatAndSyncAsync(config, state, token);
        _output.WriteLine("AIGuard Endpoint Agent status");
        _output.WriteLine($"Machine: {Environment.MachineName}");
        _output.WriteLine($"DeviceId: {sync.State.DeviceId}");
        _output.WriteLine($"API: {config.ApiBaseUrl}");
        _output.WriteLine($"User: {sync.Device.UserEmail}");
        _output.WriteLine($"Department: {sync.Device.DepartmentName}");
        _output.WriteLine($"RiskStatus: {sync.Device.RiskStatus}");
        _output.WriteLine($"AgentStatus: {sync.Device.AgentStatus}");
        _output.WriteLine($"PolicyVersion: {sync.Policy.Version}");
        _output.WriteLine($"ScanOnPaste: {sync.Policy.ScanOnPaste}");
        _output.WriteLine($"ScanOnSubmit: {sync.Policy.ScanOnSubmit}");
        _output.WriteLine($"ScanFileUpload: {sync.Policy.ScanFileUpload}");
        _output.WriteLine($"Quarantined: {sync.Device.IsQuarantined}");
        _output.WriteLine($"RemoteDisabled: {sync.Device.IsRemoteDisabled}");
        return 0;
    }

    private async Task<int> ScanTextAsync(Dictionary<string, string?> options, CancellationToken token)
    {
        var text = Value(options, "text") ?? Value(options, "content");
        if (string.IsNullOrWhiteSpace(text))
        {
            var path = Value(options, "path");
            if (!string.IsNullOrWhiteSpace(path)) text = await File.ReadAllTextAsync(path, token);
        }
        if (string.IsNullOrWhiteSpace(text))
            throw new ArgumentException("scan requires --text \"...\" or --path <text-file>.");

        var config = _store.LoadConfig();
        var state = await EnsureStateAsync(config, token);
        var result = await _api.ScanTextAsync(config, state, text, Value(options, "site") ?? "DesktopAgent", token);
        PrintScan(result);
        return 0;
    }

    private async Task<int> ScanFileAsync(Dictionary<string, string?> options, CancellationToken token)
    {
        var path = Value(options, "path") ?? throw new ArgumentException("scan-file requires --path <file>.");
        var config = _store.LoadConfig();
        var state = await EnsureStateAsync(config, token);
        var result = await _api.ScanFileAsync(config, state, path, token);
        PrintScan(result);
        return 0;
    }

    private async Task<int> TelemetryOnceAsync(CancellationToken token)
    {
        var config = _store.LoadConfig();
        var state = await EnsureStateAsync(config, token);
        var sync = await _api.HeartbeatAndSyncAsync(config, state, token);
        var count = await _api.SendTelemetryAsync(config, sync.State, _telemetry.Collect(), token);
        _output.WriteLine($"Telemetry sent: {count}");
        return 0;
    }

    private int ResetState()
    {
        _store.ClearState();
        _output.WriteLine($"Deleted state file: {_store.StatePath}");
        return 0;
    }

    private async Task<AgentState> EnsureStateAsync(AgentConfig config, CancellationToken token)
    {
        var state = _store.LoadState();
        return state ?? await _api.EnrollAsync(config, token);
    }

    private AgentConfig? TryLoadConfig()
    {
        try { return _store.LoadConfig(); }
        catch { return null; }
    }

    private void PrintScan(DlpScanData result)
    {
        _output.WriteLine("AIGuard DLP scan result");
        _output.WriteLine($"ScanId: {result.ScanId}");
        _output.WriteLine($"Risk: {result.RiskLevel} ({result.RiskScore})");
        _output.WriteLine($"Decision: {result.Decision}");
        _output.WriteLine($"PolicyVersion: {result.PolicyVersion}");
        if (!string.IsNullOrWhiteSpace(result.PolicyReason))
            _output.WriteLine($"Reason: {result.PolicyReason}");
        if (result.Matches.Count > 0)
        {
            _output.WriteLine("Detected:");
            foreach (var match in result.Matches)
            {
                var first = match.Locations.FirstOrDefault();
                var location = first == null ? "" : $" line {first.Line}, column {first.Column}";
                _output.WriteLine($"- {match.DataType}: {match.Count} hit(s), sample '{match.Sample}'{location}");
            }
        }
        if (!string.IsNullOrWhiteSpace(result.MaskedContent))
        {
            _output.WriteLine("Masked content:");
            _output.WriteLine(result.MaskedContent);
        }
        _output.WriteLine($"Receipt: {(string.IsNullOrWhiteSpace(result.Receipt) ? "missing" : "issued")}");
    }

    private void PrintHelp()
    {
        _output.WriteLine("""
        AIGuard Endpoint Agent

        Service mode:
          aiguard-endpoint-agent run
          aiguard-endpoint-agent.exe with no arguments also runs service mode.

        Setup and diagnostics:
          configure --api http://127.0.0.1:5185 --token <enrollment-token> --email user@company.com --department Dev
          enroll
          status
          scan --text "my password is 123456"
          scan --path C:\tmp\prompt.txt
          scan-file --path C:\tmp\report.pdf
          telemetry-once
          reset-state

        Optional:
          --heartbeat 30
          --clear-state
          enroll --force

        Dev override:
          set AIGUARD_AGENT_HOME=C:\tmp\aiguard-agent
        """);
    }

    private static bool IsHelp(string value) => value is "-h" or "--help" or "help";

    private int Unknown(string command)
    {
        _output.WriteLine($"Unknown command: {command}");
        PrintHelp();
        return 1;
    }

    private static string? Value(Dictionary<string, string?> options, string key) =>
        options.TryGetValue(key, out var value) ? value : null;

    private static Dictionary<string, string?> Parse(IEnumerable<string> args)
    {
        var result = new Dictionary<string, string?>(StringComparer.OrdinalIgnoreCase);
        var list = args.ToList();
        for (var i = 0; i < list.Count; i++)
        {
            var item = list[i];
            if (!item.StartsWith("--", StringComparison.Ordinal)) continue;
            var key = item[2..];
            if (i + 1 >= list.Count || list[i + 1].StartsWith("--", StringComparison.Ordinal))
            {
                result[key] = null;
                continue;
            }
            result[key] = list[++i];
        }
        return result;
    }
}
