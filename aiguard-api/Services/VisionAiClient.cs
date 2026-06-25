using System.Text.Json.Serialization;

namespace aiguard_api.Services;

public interface IVisionAiClient
{
    Task<VisionAiResult> AnalyzeImageAsync(byte[] imageBytes, string contentType, CancellationToken token = default);
}

public class VisionAiResult
{
    public bool Safe { get; set; } = true;
    public string? Reason { get; set; }
}

public class LocalVisionAiClient : IVisionAiClient
{
    private readonly HttpClient _http;
    private readonly IConfiguration _config;
    private readonly ILogger<LocalVisionAiClient> _logger;

    public LocalVisionAiClient(HttpClient http, IConfiguration config, ILogger<LocalVisionAiClient> logger)
    {
        _http = http;
        _config = config;
        _logger = logger;
    }

    public async Task<VisionAiResult> AnalyzeImageAsync(byte[] imageBytes, string contentType, CancellationToken token = default)
    {
        var endpoint = _config["VisionAiSettings:Endpoint"];
        if (string.IsNullOrWhiteSpace(endpoint))
            return new VisionAiResult { Safe = true, Reason = "Vision AI disabled (Endpoint not configured)." };

        try
        {
            var request = new
            {
                model = _config["VisionAiSettings:Model"] ?? "llava",
                prompt = "Analyze this image. Does it contain sensitive data such as architecture diagrams, proprietary source code, ID cards, financial dashboards, or confidential documents? Reply only with 'YES' or 'NO' followed by a short reason.",
                images = new[] { Convert.ToBase64String(imageBytes) },
                stream = false
            };

            var response = await _http.PostAsJsonAsync(endpoint, request, token);
            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning($"Vision AI API returned {(int)response.StatusCode}. Bypassing.");
                return new VisionAiResult { Safe = true };
            }

            var result = await response.Content.ReadFromJsonAsync<OllamaResponse>(cancellationToken: token);
            var responseText = result?.Response?.Trim() ?? "";

            var isUnsafe = responseText.StartsWith("YES", StringComparison.OrdinalIgnoreCase) || 
                           responseText.Contains("YES", StringComparison.OrdinalIgnoreCase) && responseText.Length < 200;

            if (isUnsafe)
            {
                return new VisionAiResult { Safe = false, Reason = responseText };
            }

            return new VisionAiResult { Safe = true };
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Vision AI inference failed. Bypassing.");
            return new VisionAiResult { Safe = true };
        }
    }

    private class OllamaResponse
    {
        [JsonPropertyName("response")]
        public string? Response { get; set; }
    }
}
