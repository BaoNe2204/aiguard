using System.Diagnostics;

namespace AIGuard.EndpointAgent;

public sealed record AgentTelemetryItem(
    string Category,
    string EventType,
    string Detail,
    string Severity,
    DateTime OccurredAt);

public sealed class EndpointTelemetryCollector
{
    private static readonly string[] SensitiveFileNames =
    [
        ".env", ".env.local", ".env.production", "appsettings.Production.json",
        "secrets.json", "id_rsa", "id_ed25519", "private.key", "database.yml"
    ];

    private static readonly string[] SensitiveExtensions =
    [
        ".pem", ".pfx", ".p12", ".key"
    ];

    private static readonly string[] SourceMarkers =
    [
        ".git", "package.json", "*.sln", "pom.xml", "build.gradle", "requirements.txt"
    ];

    private static readonly string[] SkippedDirectoryNames =
    [
        ".git", ".next", ".nuxt", ".turbo", "bin", "obj", "node_modules", "dist", "build", "target"
    ];

    private const int MaxWorkspaceSearchDepth = 3;
    private const int MaxSecretSearchDepth = 5;
    private const int MaxWorkspacesPerRoot = 12;
    private const int MaxSecretsPerWorkspace = 8;

    private HashSet<string> _previous = new(StringComparer.OrdinalIgnoreCase);
    private bool _initialized;

    public IReadOnlyList<AgentTelemetryItem> Collect(PolicyData? policy = null, AgentConfig? config = null)
    {
        var now = DateTime.UtcNow;
        var current = Snapshot(policy, config);
        var events = new List<AgentTelemetryItem>();

        if (!_initialized)
        {
            events.AddRange(current.Select(item => ToEvent(item, "Observed", now)));
            events.Add(new AgentTelemetryItem(
                "Clipboard",
                "CapabilityStatus",
                "Windows Service session cannot safely read or block the interactive clipboard; deploy the signed interactive helper or Intune/GPO policy.",
                "Info",
                now));
            _initialized = true;
        }
        else
        {
            events.AddRange(current.Except(_previous).Select(item => ToEvent(item, "Connected", now)));
            events.AddRange(_previous.Except(current).Select(item => ToEvent(item, "Disconnected", now)));
        }

        if (config?.EnableAiCodeAppProtection ?? true)
            events.AddRange(EvaluateAiCodePolicy(current, policy, config, now));
        _previous = current;
        return events;
    }

    private static HashSet<string> Snapshot(PolicyData? policy, AgentConfig? config)
    {
        var result = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (var drive in DriveInfo.GetDrives())
        {
            try
            {
                if (!drive.IsReady) continue;
                if (drive.DriveType == DriveType.Removable)
                    result.Add($"RemovableStorage|{drive.Name} ({drive.DriveFormat})");
                if (drive.DriveType == DriveType.Network)
                    result.Add($"NetworkShare|{drive.Name}");
            }
            catch
            {
                // A drive can disappear while Windows is enumerating it.
            }
        }

        var processes = Process.GetProcesses()
            .Select(process =>
            {
                try { return process.ProcessName; }
                catch { return string.Empty; }
                finally { process.Dispose(); }
            })
            .Where(name => name.Length > 0)
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        if (processes.Overlaps(["mstsc", "msrdc"]))
            result.Add("RdpClient|Remote Desktop client is running");
        if (processes.Overlaps(["outlook", "thunderbird", "olk"]))
            result.Add("EmailClient|Desktop email client is running");
        if (processes.Contains("spoolsv"))
            result.Add("PrintService|Windows Print Spooler is running");

        if (config?.EnableAiCodeAppProtection ?? true)
        {
            AddAiCodeProcessSignals(result, processes);
            AddSensitiveWorkspaceSignals(result, policy, config);
        }
        return result;
    }

    private static void AddAiCodeProcessSignals(HashSet<string> result, HashSet<string> processes)
    {
        var detected = new List<string>();
        if (processes.Overlaps(["cursor", "cursor helper"])) detected.Add("Cursor");
        if (processes.Overlaps(["codex", "openai-codex"])) detected.Add("Codex");
        if (processes.Overlaps(["code", "code-insiders"])) detected.Add("VS Code");
        if (processes.Overlaps(["github copilot", "copilot"])) detected.Add("GitHub Copilot");
        if (processes.Overlaps(["claude", "claude desktop"])) detected.Add("Claude Desktop");
        if (processes.Overlaps(["windsurf", "trae", "tabnine"])) detected.Add("AI coding assistant");

        foreach (var name in detected.Distinct(StringComparer.OrdinalIgnoreCase))
            result.Add($"AiCodeApp|{name} is running and may access opened code/workspace files");
    }

    private static void AddSensitiveWorkspaceSignals(HashSet<string> result, PolicyData? policy, AgentConfig? config)
    {
        var sourceEnabled = policy?.EnableSourceCodeDetection ?? true;
        var secretEnabled = policy == null ||
            policy.EnablePrivateKeyDetection ||
            policy.EnableApiKeyDetection ||
            policy.EnableDbUrlDetection;
        if (!sourceEnabled && !secretEnabled) return;

        var workspaces = CandidateWorkspaceRoots(config)
            .Where(Directory.Exists)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .SelectMany(FindSourceWorkspaces)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .Take(40)
            .ToList();

        foreach (var workspace in workspaces)
        {
            if (sourceEnabled)
                result.Add($"SensitiveWorkspace|Source workspace detected: {workspace}");
            if (secretEnabled)
            {
                foreach (var secret in FindSensitiveFiles(workspace).Take(MaxSecretsPerWorkspace))
                    result.Add($"DeveloperSecret|Sensitive developer file present: {secret}");
            }
        }
    }

    private static IEnumerable<AgentTelemetryItem> EvaluateAiCodePolicy(
        HashSet<string> current,
        PolicyData? policy,
        AgentConfig? config,
        DateTime occurredAt)
    {
        var apps = DetailsFor(current, "AiCodeApp").ToList();
        var workspaces = DetailsFor(current, "SensitiveWorkspace").ToList();
        var secrets = DetailsFor(current, "DeveloperSecret").ToList();
        if (apps.Count == 0 && workspaces.Count == 0 && secrets.Count == 0) yield break;

        string risk;
        string reason;
        if (apps.Count > 0 && secrets.Count > 0)
        {
            risk = "Critical";
            reason = "AI coding app is running while sensitive developer secrets exist in a source workspace.";
        }
        else if (apps.Count > 0 && workspaces.Count > 0)
        {
            risk = "High";
            reason = "AI coding app is running while source workspaces are present.";
        }
        else if (secrets.Count > 0)
        {
            risk = "High";
            reason = "Sensitive developer secrets are present in a source workspace.";
        }
        else
        {
            risk = "Low";
            reason = "AI coding app observed without a sensitive workspace signal.";
        }

        var decision = DecisionForRisk(policy, risk);
        var enforcement = "None";
        if (risk == "Critical" && IsBlockDecision(decision))
        {
            if (config?.EnableProcessKill == true)
            {
                var killed = KillAiCodeProcesses();
                enforcement = killed.Count == 0 ? "BlockRequestedNoMatchingProcess" : $"KilledProcesses={string.Join(",", killed)}";
            }
            else
            {
                enforcement = "BlockRequestedProcessKillDisabled";
            }
        }

        var detail = string.Join("; ", [
            $"Risk={risk}",
            $"Decision={decision}",
            $"Enforcement={enforcement}",
            $"Reason={reason}",
            $"Apps={Compact(apps)}",
            $"Workspaces={Compact(workspaces)}",
            $"Secrets={Compact(secrets)}",
            $"PolicyVersion={policy?.Version ?? "local-default"}"
        ]);

        yield return new AgentTelemetryItem(
            "AiCodePolicyDecision",
            IsBlockDecision(decision) && risk == "Critical" ? "Blocked" : "Evaluated",
            detail,
            risk,
            occurredAt);
    }

    private static IEnumerable<string> DetailsFor(HashSet<string> current, string category)
    {
        var prefix = category + "|";
        return current
            .Where(item => item.StartsWith(prefix, StringComparison.OrdinalIgnoreCase))
            .Select(item => item[prefix.Length..]);
    }

    private static string DecisionForRisk(PolicyData? policy, string risk) => risk switch
    {
        "Critical" => policy?.CriticalAction ?? "Block",
        "High" => policy?.HighAction ?? "PendingApproval",
        "Medium" => policy?.MediumAction ?? "Mask",
        _ => policy?.LowAction ?? "Allow"
    };

    private static bool IsBlockDecision(string? decision) =>
        string.Equals(decision, "Block", StringComparison.OrdinalIgnoreCase) ||
        string.Equals(decision, "Quarantine", StringComparison.OrdinalIgnoreCase) ||
        string.Equals(decision, "KillProcess", StringComparison.OrdinalIgnoreCase);

    private static string Compact(List<string> values)
    {
        if (values.Count == 0) return "none";
        var compacted = values.Take(3).Select(value => value.Length > 120 ? value[..117] + "..." : value);
        var suffix = values.Count > 3 ? $", +{values.Count - 3} more" : "";
        return string.Join(" | ", compacted) + suffix;
    }

    private static List<string> KillAiCodeProcesses()
    {
        var killed = new List<string>();
        var names = new HashSet<string>([
            "cursor", "cursor helper", "codex", "openai-codex", "code", "code-insiders",
            "github copilot", "copilot", "claude", "claude desktop", "windsurf", "trae", "tabnine"
        ], StringComparer.OrdinalIgnoreCase);

        foreach (var process in Process.GetProcesses())
        {
            try
            {
                if (!names.Contains(process.ProcessName)) continue;
                var name = process.ProcessName;
                process.Kill(entireProcessTree: true);
                killed.Add(name);
            }
            catch
            {
                // Some processes are protected or already exiting; backend still receives the block decision.
            }
            finally
            {
                process.Dispose();
            }
        }

        return killed.Distinct(StringComparer.OrdinalIgnoreCase).ToList();
    }

    private static IEnumerable<string> CandidateWorkspaceRoots(AgentConfig? config)
    {
        var profile = Environment.GetFolderPath(Environment.SpecialFolder.UserProfile);
        var current = Environment.CurrentDirectory;
        var hasExplicitRoots = false;
        foreach (var root in config?.WorkspaceRoots ?? [])
        {
            if (!string.IsNullOrWhiteSpace(root))
            {
                hasExplicitRoots = true;
                yield return NormalizePath(root);
            }
        }

        var configured = Environment.GetEnvironmentVariable("AIGUARD_WORKSPACE_ROOTS");
        if (!string.IsNullOrWhiteSpace(configured))
        {
            foreach (var item in configured.Split(Path.PathSeparator, StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
            {
                hasExplicitRoots = true;
                yield return NormalizePath(item);
            }
        }

        if (hasExplicitRoots) yield break;

        yield return NormalizePath(current);
        if (!string.IsNullOrWhiteSpace(profile))
        {
            yield return NormalizePath(Path.Combine(profile, "source"));
            yield return NormalizePath(Path.Combine(profile, "repos"));
            yield return NormalizePath(Path.Combine(profile, "Documents"));
            yield return NormalizePath(Path.Combine(profile, "Desktop"));
            yield return NormalizePath(Path.Combine(profile, "Videos"));
        }
    }

    private static string NormalizePath(string path)
    {
        try { return Path.GetFullPath(path); }
        catch { return path; }
    }

    private static IEnumerable<string> FindSourceWorkspaces(string root)
    {
        if (IsSourceWorkspace(root))
        {
            yield return root;
            yield break;
        }

        foreach (var directory in EnumerateDirectories(root, MaxWorkspaceSearchDepth)
            .Where(IsSourceWorkspace)
            .Take(MaxWorkspacesPerRoot))
        {
            yield return directory;
        }
    }

    private static bool IsSourceWorkspace(string directory)
    {
        foreach (var marker in SourceMarkers)
        {
            try
            {
                if (marker.Contains('*'))
                {
                    if (Directory.EnumerateFiles(directory, marker, SearchOption.TopDirectoryOnly).Any())
                        return true;
                }
                else if (File.Exists(Path.Combine(directory, marker)) || Directory.Exists(Path.Combine(directory, marker)))
                {
                    return true;
                }
            }
            catch
            {
                return false;
            }
        }

        return false;
    }

    private static IEnumerable<string> FindSensitiveFiles(string root)
    {
        foreach (var directory in EnumerateDirectories(root, MaxSecretSearchDepth).Prepend(root))
        {
            IEnumerable<string> files;
            try { files = Directory.EnumerateFiles(directory, "*", SearchOption.TopDirectoryOnly).ToList(); }
            catch { continue; }

            foreach (var path in files)
            {
                var name = Path.GetFileName(path);
                var ext = Path.GetExtension(path);
                if (SensitiveFileNames.Contains(name, StringComparer.OrdinalIgnoreCase) ||
                    SensitiveExtensions.Contains(ext, StringComparer.OrdinalIgnoreCase))
                    yield return path;
            }
        }
    }

    private static IEnumerable<string> EnumerateDirectories(string root, int maxDepth)
    {
        var pending = new Queue<(string Path, int Depth)>();
        pending.Enqueue((root, 0));

        while (pending.Count > 0)
        {
            var (current, depth) = pending.Dequeue();
            if (depth >= maxDepth) continue;

            IEnumerable<string> children;
            try { children = Directory.EnumerateDirectories(current, "*", SearchOption.TopDirectoryOnly).ToList(); }
            catch { continue; }

            foreach (var child in children)
            {
                if (ShouldSkipDirectory(child)) continue;
                yield return child;
                pending.Enqueue((child, depth + 1));
            }
        }
    }

    private static bool ShouldSkipDirectory(string path)
    {
        var name = Path.GetFileName(path);
        return SkippedDirectoryNames.Contains(name, StringComparer.OrdinalIgnoreCase);
    }

    private static AgentTelemetryItem ToEvent(string value, string eventType, DateTime occurredAt)
    {
        var separator = value.IndexOf('|');
        var category = separator > 0 ? value[..separator] : "AgentHealth";
        var detail = separator > 0 ? value[(separator + 1)..] : value;
        var severity = category switch
        {
            "DeveloperSecret" => "Critical",
            "AiCodePolicyDecision" => detail.Contains("Risk=Critical", StringComparison.OrdinalIgnoreCase) ? "Critical" : "High",
            "AiCodeApp" or "SensitiveWorkspace" => "High",
            "RemovableStorage" or "NetworkShare" => "Medium",
            _ => "Info"
        };
        return new AgentTelemetryItem(category, eventType, detail, severity, occurredAt);
    }
}
