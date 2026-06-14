namespace AIGuard.EndpointAgent;

public sealed class EndpointWorker : BackgroundService
{
    private readonly AgentStateStore _store;
    private readonly EndpointApiClient _api;
    private readonly EndpointTelemetryCollector _telemetry;
    private readonly ILogger<EndpointWorker> _logger;

    public EndpointWorker(
        AgentStateStore store,
        EndpointApiClient api,
        EndpointTelemetryCollector telemetry,
        ILogger<EndpointWorker> logger)
    {
        _store = store;
        _api = api;
        _telemetry = telemetry;
        _logger = logger;
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
                await SendTelemetryAsync(config, state, stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Heartbeat/policy synchronization failed");
            }
            await Task.Delay(TimeSpan.FromSeconds(Math.Clamp(config.HeartbeatSeconds, 10, 300)), stoppingToken);
        }
    }

    private async Task SendTelemetryAsync(AgentConfig config, AgentState state, CancellationToken token)
    {
        var events = _telemetry.Collect();
        if (events.Count == 0) return;
        await _api.SendTelemetryAsync(config, state, events, token);
    }
}
