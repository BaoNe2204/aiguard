namespace AIGuard.EndpointAgent;

public sealed class EndpointWorker : BackgroundService
{
    private readonly AgentStateStore _store;
    private readonly EndpointApiClient _api;
    private readonly EndpointTelemetryCollector _telemetry;
    private readonly EndpointPolicyCache _policyCache;
    private readonly OfflineTelemetryQueue _offlineQueue;
    private readonly ILogger<EndpointWorker> _logger;

    public EndpointWorker(
        AgentStateStore store,
        EndpointApiClient api,
        EndpointTelemetryCollector telemetry,
        EndpointPolicyCache policyCache,
        OfflineTelemetryQueue offlineQueue,
        ILogger<EndpointWorker> logger)
    {
        _store = store;
        _api = api;
        _telemetry = telemetry;
        _policyCache = policyCache;
        _offlineQueue = offlineQueue;
        _logger = logger;
        
        _telemetry.ProcessKilled += HandleProcessKilled;
    }

    private void HandleProcessKilled(string appName)
    {
        var thread = new Thread(() =>
        {
            try
            {
                var form = new ApprovalRequestForm(appName);
                if (form.ShowDialog() == DialogResult.OK)
                {
                    var config = _store.LoadConfig();
                    var state = _store.LoadState();
                    if (state != null)
                    {
                        _api.RequestDesktopAppApprovalAsync(config, state, appName, form.Reason, CancellationToken.None).GetAwaiter().GetResult();
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to prompt or send approval for desktop app {AppName}", appName);
            }
        });
        thread.SetApartmentState(ApartmentState.STA);
        thread.Start();
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var config = _store.LoadConfig();
        var state = _store.LoadState() ?? await _api.EnrollAsync(config, stoppingToken);
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                var sync = await _api.HeartbeatAndSyncAsync(config, state, stoppingToken);
                state = sync.State;
                _policyCache.Save(sync.Policy, sync.AiPolicy);
                await SendTelemetryAsync(config, state, sync.Policy, sync.AiPolicy, stoppingToken);
                await FlushOfflineTelemetryAsync(config, state, stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Heartbeat/policy synchronization failed");
                SendOfflineTelemetry(config, ex);
            }
            await Task.Delay(TimeSpan.FromSeconds(Math.Clamp(config.HeartbeatSeconds, 10, 300)), stoppingToken);
        }
    }

    private async Task SendTelemetryAsync(
        AgentConfig config,
        AgentState state,
        PolicyData policy,
        EndpointAiPolicyData? aiPolicy,
        CancellationToken token)
    {
        var events = _telemetry.Collect(policy, config, aiPolicy);
        if (events.Count == 0) return;
        try
        {
            await _api.SendTelemetryAsync(config, state, events, token);
        }
        catch (Exception ex)
        {
            var queued = _offlineQueue.Enqueue(events, config.MaxQueuedTelemetryEvents);
            _logger.LogWarning(ex, "Telemetry delivery failed; queued {QueuedCount} encrypted offline event(s)", queued);
        }
    }

    private async Task FlushOfflineTelemetryAsync(
        AgentConfig config,
        AgentState state,
        CancellationToken token)
    {
        try
        {
            var sent = await _offlineQueue.FlushAsync(_api, config, state, token);
            if (sent > 0)
                _logger.LogInformation("Replayed {SentCount} encrypted offline telemetry event(s)", sent);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Offline telemetry replay failed; queue will retry on the next heartbeat");
        }
    }

    private void SendOfflineTelemetry(AgentConfig config, Exception syncError)
    {
        var snapshot = _policyCache.Resolve(config);
        var events = _telemetry.Collect(snapshot.Policy, config, snapshot.AiPolicy).ToList();
        events.Add(new AgentTelemetryItem(
            "AgentHealth",
            "OfflineMode",
            string.Join("; ", [
                $"PolicySource={snapshot.Source}",
                $"PolicyCacheExpired={snapshot.IsExpired}",
                $"PolicyFetchedAtUtc={snapshot.FetchedAtUtc?.ToString("O") ?? "none"}",
                $"Error={syncError.GetType().Name}"
            ]),
            snapshot.Source.StartsWith("strict-fallback", StringComparison.OrdinalIgnoreCase) ? "Critical" : "High",
            DateTime.UtcNow));

        var queued = _offlineQueue.Enqueue(events, config.MaxQueuedTelemetryEvents);
        _logger.LogWarning(
            "Agent is offline; queued {EventCount} event(s). Offline queue now has {QueuedCount} encrypted event(s)",
            events.Count,
            queued);
    }
}
