using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Reflection;
using System.Text.Json;

namespace AIGuard.EndpointAgent;

public sealed class EndpointApiClient
{
    private readonly AgentStateStore _store;

    public EndpointApiClient(AgentStateStore store) => _store = store;

    public async Task<AgentState> EnrollAsync(AgentConfig config, CancellationToken token)
    {
        if (string.IsNullOrWhiteSpace(config.EnrollmentToken))
            throw new InvalidOperationException("EnrollmentToken is required for first enrollment.");
        if (string.IsNullOrWhiteSpace(config.UserEmail))
            throw new InvalidOperationException("UserEmail is required for first enrollment.");
        if (string.IsNullOrWhiteSpace(config.DepartmentName))
            throw new InvalidOperationException("DepartmentName is required for first enrollment.");

        using var client = Client(config);
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

    public async Task<EndpointSyncResult> HeartbeatAndSyncAsync(
        AgentConfig config,
        AgentState state,
        CancellationToken token)
    {
        using var client = Client(config, state.EndpointKey);
        var heartbeat = await client.PostAsJsonAsync("/api/endpoints/devices/heartbeat", new
        {
            hostname = Environment.MachineName,
            agentVersion = Version,
            policyVersion = state.PolicyVersion,
            agentStatus = "Healthy"
        }, token);
        heartbeat.EnsureSuccessStatusCode();
        var device = await ReadDataAsync<DeviceData>(heartbeat, token);

        var policyResponse = await client.GetAsync(
            $"/api/policies/current?hostname={Uri.EscapeDataString(Environment.MachineName)}",
            token);
        policyResponse.EnsureSuccessStatusCode();
        var policy = await ReadDataAsync<PolicyData>(policyResponse, token);

        var nextState = state with { PolicyVersion = policy.Version };
        _store.SaveState(nextState);
        return new EndpointSyncResult(nextState, device, policy);
    }

    public async Task<int> SendTelemetryAsync(
        AgentConfig config,
        AgentState state,
        IEnumerable<AgentTelemetryItem> events,
        CancellationToken token)
    {
        var batch = events.ToList();
        if (batch.Count == 0) return 0;

        using var client = Client(config, state.EndpointKey);
        var response = await client.PostAsJsonAsync("/api/endpoints/telemetry", new
        {
            hostname = Environment.MachineName,
            events = batch
        }, token);
        response.EnsureSuccessStatusCode();
        return batch.Count;
    }

    public async Task<DlpScanData> ScanTextAsync(
        AgentConfig config,
        AgentState state,
        string content,
        string websiteAi,
        CancellationToken token)
    {
        using var client = Client(config, state.EndpointKey);
        var response = await client.PostAsJsonAsync("/api/dlp/scan", new
        {
            content,
            hostname = Environment.MachineName,
            websiteAi
        }, token);
        response.EnsureSuccessStatusCode();
        return await ReadDataAsync<DlpScanData>(response, token);
    }

    public async Task<DlpScanData> ScanFileAsync(
        AgentConfig config,
        AgentState state,
        string path,
        CancellationToken token)
    {
        if (!File.Exists(path)) throw new FileNotFoundException("File not found.", path);

        using var client = Client(config, state.EndpointKey);
        await using var stream = File.OpenRead(path);
        using var form = new MultipartFormDataContent();
        form.Add(new StringContent(Environment.MachineName), "hostname");
        var file = new StreamContent(stream);
        file.Headers.ContentType = new MediaTypeHeaderValue(ContentTypeFromExtension(Path.GetExtension(path)));
        form.Add(file, "file", Path.GetFileName(path));

        var response = await client.PostAsync("/api/dlp/files/scan", form, token);
        response.EnsureSuccessStatusCode();
        return await ReadDataAsync<DlpScanData>(response, token);
    }

    private static HttpClient Client(AgentConfig config, string? key = null)
    {
        var client = new HttpClient { BaseAddress = new Uri(config.ApiBaseUrl.TrimEnd('/')) };
        if (!string.IsNullOrWhiteSpace(key)) client.DefaultRequestHeaders.Add("X-Endpoint-Key", key);
        return client;
    }

    private static async Task<T> ReadDataAsync<T>(HttpResponseMessage response, CancellationToken token) where T : class
    {
        await using var stream = await response.Content.ReadAsStreamAsync(token);
        var envelope = await JsonSerializer.DeserializeAsync<ApiEnvelope<T>>(
            stream,
            new JsonSerializerOptions { PropertyNameCaseInsensitive = true },
            token);
        return envelope?.Data ?? throw new InvalidOperationException("API response has no data.");
    }

    private static string ContentTypeFromExtension(string extension) => extension.ToLowerInvariant() switch
    {
        ".pdf" => "application/pdf",
        ".docx" => "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ".xlsx" => "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        ".zip" => "application/zip",
        ".json" => "application/json",
        ".csv" => "text/csv",
        ".txt" or ".md" or ".cs" or ".java" or ".js" or ".ts" or ".py" or ".sql" or ".env" => "text/plain",
        _ => "application/octet-stream"
    };

    private static string Version => Assembly.GetExecutingAssembly().GetName().Version?.ToString() ?? "1.0.0";

    private sealed class ApiEnvelope<T> where T : class { public T? Data { get; set; } }
    private sealed class EnrollData
    {
        public Guid DeviceId { get; set; }
        public string EndpointKey { get; set; } = "";
        public string PolicyVersion { get; set; } = "";
    }
}

public sealed record EndpointSyncResult(AgentState State, DeviceData Device, PolicyData Policy);

public sealed class DeviceData
{
    public Guid Id { get; set; }
    public string Hostname { get; set; } = "";
    public string UserEmail { get; set; } = "";
    public string DepartmentName { get; set; } = "";
    public string PolicyVersion { get; set; } = "";
    public string RiskStatus { get; set; } = "";
    public bool IsQuarantined { get; set; }
    public bool IsRemoteDisabled { get; set; }
    public string AgentStatus { get; set; } = "";
}

public sealed class PolicyData
{
    public string Version { get; set; } = "";
    public int SensitivityThreshold { get; set; }
    public bool ScanOnPaste { get; set; }
    public bool ScanOnSubmit { get; set; }
    public bool ScanFileUpload { get; set; }
    public bool ClipboardWarning { get; set; }
    public bool OfflineCriticalBlock { get; set; }
}

public sealed class DlpScanData
{
    public Guid ScanId { get; set; }
    public string Receipt { get; set; } = "";
    public string ContentHash { get; set; } = "";
    public int RiskScore { get; set; }
    public string RiskLevel { get; set; } = "";
    public string Decision { get; set; } = "";
    public List<DetectionMatchData> Matches { get; set; } = new();
    public string? MaskedContent { get; set; }
    public string? PolicyVersion { get; set; }
    public string? PolicyReason { get; set; }
}

public sealed class DetectionMatchData
{
    public string DataType { get; set; } = "";
    public int Weight { get; set; }
    public int Count { get; set; }
    public string Sample { get; set; } = "";
    public string Reason { get; set; } = "";
    public List<DetectionLocationData> Locations { get; set; } = new();
}

public sealed class DetectionLocationData
{
    public int StartIndex { get; set; }
    public int EndIndex { get; set; }
    public int Line { get; set; }
    public int Column { get; set; }
}
