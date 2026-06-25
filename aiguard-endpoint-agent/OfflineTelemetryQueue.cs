using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

namespace AIGuard.EndpointAgent;

public sealed class OfflineTelemetryQueue
{
    private readonly AgentStateStore _store;
    private readonly object _gate = new();

    public OfflineTelemetryQueue(AgentStateStore store) => _store = store;

    public int Count
    {
        get
        {
            lock (_gate) return LoadUnlocked().Count;
        }
    }

    public int Enqueue(IEnumerable<AgentTelemetryItem> events, int maxEvents)
    {
        var incoming = events.ToList();
        if (incoming.Count == 0) return Count;

        lock (_gate)
        {
            var queue = LoadUnlocked();
            queue.AddRange(incoming);
            var cappedMax = Math.Clamp(maxEvents, 100, 10000);
            if (queue.Count > cappedMax)
                queue = queue.TakeLast(cappedMax).ToList();
            SaveUnlocked(queue);
            return queue.Count;
        }
    }

    public async Task<int> FlushAsync(
        EndpointApiClient api,
        AgentConfig config,
        AgentState state,
        CancellationToken token)
    {
        List<AgentTelemetryItem> events;
        lock (_gate)
        {
            events = LoadUnlocked();
        }

        if (events.Count == 0) return 0;

        var sent = await api.SendTelemetryAsync(config, state, events, token);
        lock (_gate)
        {
            if (File.Exists(_store.OfflineTelemetryQueuePath))
                File.Delete(_store.OfflineTelemetryQueuePath);
        }

        return sent;
    }

    private List<AgentTelemetryItem> LoadUnlocked()
    {
        try
        {
            if (!File.Exists(_store.OfflineTelemetryQueuePath)) return new();
            var protectedPayload = Convert.FromBase64String(File.ReadAllText(_store.OfflineTelemetryQueuePath));
            var payload = ProtectedData.Unprotect(protectedPayload, null, DataProtectionScope.LocalMachine);
            return JsonSerializer.Deserialize<List<AgentTelemetryItem>>(Encoding.UTF8.GetString(payload), JsonOptions) ?? new();
        }
        catch
        {
            return new();
        }
    }

    private void SaveUnlocked(List<AgentTelemetryItem> events)
    {
        Directory.CreateDirectory(_store.DirectoryPath);
        var payload = JsonSerializer.SerializeToUtf8Bytes(events, JsonOptions);
        var protectedPayload = ProtectedData.Protect(payload, null, DataProtectionScope.LocalMachine);
        File.WriteAllText(_store.OfflineTelemetryQueuePath, Convert.ToBase64String(protectedPayload));
    }

    private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNameCaseInsensitive = true, WriteIndented = true };
}
