using System.Net.Http.Json;
using System.Reflection;
using System.Text.Json;

namespace AIGuard.EndpointAgent;

public sealed class EndpointWorker : BackgroundService
{
    private readonly AgentStateStore _store;
    private readonly EndpointTelemetryCollector _telemetry;
    private readonly ILogger<EndpointWorker> _logger;

    public EndpointWorker(
        AgentStateStore store,
        EndpointTelemetryCollector telemetry,
        ILogger<EndpointWorker> logger)
    {
        _store = store;
        _telemetry = telemetry;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var config = _store.LoadConfig();
        var state = _store.LoadState() ?? await EnrollAsync(config, stoppingToken);
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                state = await HeartbeatAndSyncAsync(config, state, stoppingToken);
                _store.SaveState(state);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Heartbeat/policy synchronization failed");
            }
            await Task.Delay(TimeSpan.FromSeconds(Math.Clamp(config.HeartbeatSeconds, 10, 300)), stoppingToken);
        }
    }

    private async Task<AgentState> EnrollAsync(AgentConfig config, CancellationToken token)
    {
        if (string.IsNullOrWhiteSpace(config.EnrollmentToken))
            throw new InvalidOperationException("EnrollmentToken is required for first start.");
        var client = Client(config);
        var response = await client.PostAsJsonAsync("/api/endpoints/deployment/enroll", new
        {
            enrollmentToken = config.EnrollmentToken,
            hostname = Environment.MachineName,
            userEmail = config.UserEmail,
            departmentName = config.DepartmentName,
            agentVersion = Version
        }, token);
        response.EnsureSuccessStatusCode();
        var data = await ReadDataAsync<EnrollData>(response, token);
        var state = new AgentState(data.DeviceId, data.EndpointKey, data.PolicyVersion);
        _store.SaveState(state);
        return state;
    }

    private async Task<AgentState> HeartbeatAndSyncAsync(AgentConfig config, AgentState state, CancellationToken token)
    {
        var client = Client(config, state.EndpointKey);
        var heartbeat = await client.PostAsJsonAsync("/api/endpoints/devices/heartbeat", new
        {
            hostname = Environment.MachineName, agentVersion = Version,
            policyVersion = state.PolicyVersion, agentStatus = "Healthy"
        }, token);
        if (heartbeat.StatusCode == System.Net.HttpStatusCode.Unauthorized)
            throw new InvalidOperationException("Endpoint key was revoked. Re-enrollment is required.");
        heartbeat.EnsureSuccessStatusCode();
        var policy = await client.GetAsync($"/api/policies/current?hostname={Uri.EscapeDataString(Environment.MachineName)}", token);
        policy.EnsureSuccessStatusCode();
        var policyData = await ReadDataAsync<PolicyData>(policy, token);
        await SendTelemetryAsync(client, token);
        return state with { PolicyVersion = policyData.Version };
    }

    private async Task SendTelemetryAsync(HttpClient client, CancellationToken token)
    {
        var events = _telemetry.Collect();
        if (events.Count == 0) return;
        var response = await client.PostAsJsonAsync("/api/endpoints/telemetry", new
        {
            hostname = Environment.MachineName,
            events
        }, token);
        response.EnsureSuccessStatusCode();
    }

    private static HttpClient Client(AgentConfig config, string? key = null)
    {
        var client = new HttpClient { BaseAddress = new Uri(config.ApiBaseUrl.TrimEnd('/')) };
        if (key != null) client.DefaultRequestHeaders.Add("X-Endpoint-Key", key);
        return client;
    }

    private static async Task<T> ReadDataAsync<T>(HttpResponseMessage response, CancellationToken token) where T : class
    {
        await using var stream = await response.Content.ReadAsStreamAsync(token);
        var envelope = await JsonSerializer.DeserializeAsync<ApiEnvelope<T>>(stream,
            new JsonSerializerOptions { PropertyNameCaseInsensitive = true }, token);
        return envelope?.Data ?? throw new InvalidOperationException("API response has no data.");
    }

    private static string Version => Assembly.GetExecutingAssembly().GetName().Version?.ToString() ?? "1.0.0";
    private sealed class ApiEnvelope<T> where T : class { public T? Data { get; set; } }
    private sealed class EnrollData { public Guid DeviceId { get; set; } public string EndpointKey { get; set; } = ""; public string PolicyVersion { get; set; } = ""; }
    private sealed class PolicyData { public string Version { get; set; } = ""; }
}
