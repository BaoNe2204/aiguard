using System.Net.Http.Json;
using System.Text.Json.Serialization;

namespace aiguard_api.Services;

public interface IAiSecurityEngineClient
{
    Task<AiSecurityHealthResult> GetHealthAsync(CancellationToken cancellationToken = default);
    Task<AiSecurityScanResult> ScanAsync(string content, CancellationToken cancellationToken = default);
    Task<string?> MaskAsync(string content, IReadOnlyList<AiSecurityFinding> findings, CancellationToken cancellationToken = default);
}

public sealed class AiSecurityEngineClient : IAiSecurityEngineClient
{
    private readonly HttpClient _http;
    private readonly IConfiguration _configuration;
    private readonly ILogger<AiSecurityEngineClient> _logger;

    public AiSecurityEngineClient(
        HttpClient http,
        IConfiguration configuration,
        ILogger<AiSecurityEngineClient> logger)
    {
        _http = http;
        _configuration = configuration;
        _logger = logger;
    }

    private bool Enabled => _configuration.GetValue("AiSecuritySettings:Enabled", true);

    public async Task<AiSecurityHealthResult> GetHealthAsync(CancellationToken cancellationToken = default)
    {
        if (!Enabled)
            return new AiSecurityHealthResult(false, "disabled", null, "AI security engine is disabled.");

        try
        {
            var response = await _http.GetAsync("/health", cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                return new AiSecurityHealthResult(false, "unhealthy", null,
                    $"AI security engine returned HTTP {(int)response.StatusCode}.");
            }

            var payload = await response.Content.ReadFromJsonAsync<AiHealthResponse>(cancellationToken);
            return new AiSecurityHealthResult(true, payload?.Status ?? "healthy", payload?.Version, null);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "AI security engine health check failed.");
            return new AiSecurityHealthResult(false, "unreachable", null, ex.Message);
        }
    }

    public async Task<AiSecurityScanResult> ScanAsync(string content, CancellationToken cancellationToken = default)
    {
        if (!Enabled || string.IsNullOrWhiteSpace(content))
            return AiSecurityScanResult.Unavailable("disabled");

        try
        {
            var response = await _http.PostAsJsonAsync("/api/ai/scan", new AiScanRequest(content), cancellationToken);
            if (!response.IsSuccessStatusCode)
                return AiSecurityScanResult.Unavailable($"HTTP {(int)response.StatusCode}");

            var payload = await response.Content.ReadFromJsonAsync<AiScanResponse>(cancellationToken);
            if (payload == null) return AiSecurityScanResult.Unavailable("empty response");

            return new AiSecurityScanResult(
                true,
                payload.Safe,
                Math.Clamp(payload.RiskScore, 0, 100),
                payload.Findings ?? [],
                payload.TriggeredCategories ?? [],
                null);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "AI security engine scan failed; falling back to local scanner.");
            return AiSecurityScanResult.Unavailable(ex.Message);
        }
    }

    public async Task<string?> MaskAsync(string content, IReadOnlyList<AiSecurityFinding> findings, CancellationToken cancellationToken = default)
    {
        if (!Enabled || string.IsNullOrWhiteSpace(content) || findings.Count == 0)
            return null;

        try
        {
            var response = await _http.PostAsJsonAsync("/api/ai/mask", new AiMaskRequest(content, findings), cancellationToken);
            if (!response.IsSuccessStatusCode) return null;

            var payload = await response.Content.ReadFromJsonAsync<AiMaskResponse>(cancellationToken);
            return string.IsNullOrWhiteSpace(payload?.MaskedText) ? null : payload.MaskedText;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "AI security engine mask failed; keeping local masked output.");
            return null;
        }
    }

    private sealed record AiHealthResponse(
        [property: JsonPropertyName("status")] string Status,
        [property: JsonPropertyName("version")] string? Version);

    private sealed record AiScanRequest([property: JsonPropertyName("text")] string Text);

    private sealed record AiMaskRequest(
        [property: JsonPropertyName("text")] string Text,
        [property: JsonPropertyName("findings")] IReadOnlyList<AiSecurityFinding> Findings);

    private sealed record AiScanResponse(
        [property: JsonPropertyName("safe")] bool Safe,
        [property: JsonPropertyName("riskScore")] int RiskScore,
        [property: JsonPropertyName("findings")] List<AiSecurityFinding>? Findings,
        [property: JsonPropertyName("triggeredCategories")] List<string>? TriggeredCategories);

    private sealed record AiMaskResponse(
        [property: JsonPropertyName("originalText")] string OriginalText,
        [property: JsonPropertyName("maskedText")] string MaskedText);
}

public sealed record AiSecurityHealthResult(
    bool Available,
    string Status,
    string? Version,
    string? Error);

public sealed record AiSecurityScanResult(
    bool Available,
    bool Safe,
    int RiskScore,
    IReadOnlyList<AiSecurityFinding> Findings,
    IReadOnlyList<string> TriggeredCategories,
    string? Error)
{
    public static AiSecurityScanResult Unavailable(string error) => new(
        false,
        true,
        0,
        [],
        [],
        error);
}

public sealed class AiSecurityFinding
{
    [JsonPropertyName("dataType")]
    public string DataType { get; set; } = string.Empty;

    [JsonPropertyName("matchedText")]
    public string MatchedText { get; set; } = string.Empty;

    [JsonPropertyName("startIndex")]
    public int StartIndex { get; set; }

    [JsonPropertyName("endIndex")]
    public int EndIndex { get; set; }

    [JsonPropertyName("riskWeight")]
    public int RiskWeight { get; set; }
}
