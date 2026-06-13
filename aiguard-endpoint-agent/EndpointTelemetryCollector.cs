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
    private HashSet<string> _previous = new(StringComparer.OrdinalIgnoreCase);
    private bool _initialized;

    public IReadOnlyList<AgentTelemetryItem> Collect()
    {
        var now = DateTime.UtcNow;
        var current = Snapshot();
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

        _previous = current;
        return events;
    }

    private static HashSet<string> Snapshot()
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
        return result;
    }

    private static AgentTelemetryItem ToEvent(string value, string eventType, DateTime occurredAt)
    {
        var separator = value.IndexOf('|');
        var category = separator > 0 ? value[..separator] : "AgentHealth";
        var detail = separator > 0 ? value[(separator + 1)..] : value;
        var severity = category is "RemovableStorage" or "NetworkShare" ? "Medium" : "Info";
        return new AgentTelemetryItem(category, eventType, detail, severity, occurredAt);
    }
}
