using System.Net.Http.Headers;
using System.Text.Json;

namespace aiguard_api.Services;

public interface IOcrService
{
    bool IsConfigured { get; }
    Task<string> ExtractTextAsync(byte[] content, string fileName, string? contentType, CancellationToken token = default);
}

public class OcrService : IOcrService
{
    private readonly HttpClient _http;
    private readonly IConfiguration _configuration;
    public OcrService(HttpClient http, IConfiguration configuration)
    {
        _http = http;
        _configuration = configuration;
    }

    public bool IsConfigured => Uri.TryCreate(
        _configuration["OcrSettings:Endpoint"], UriKind.Absolute, out _);

    public async Task<string> ExtractTextAsync(
        byte[] content, string fileName, string? contentType, CancellationToken token = default)
    {
        var endpoint = _configuration["OcrSettings:Endpoint"];
        if (!Uri.TryCreate(endpoint, UriKind.Absolute, out var endpointUri))
            return string.Empty; // Graceful fallback if OCR is not configured

        using var request = new HttpRequestMessage(HttpMethod.Post, endpointUri);
        var apiKey = _configuration["OcrSettings:ApiKey"];
        if (!string.IsNullOrWhiteSpace(apiKey))
        {
            var header = _configuration["OcrSettings:ApiKeyHeader"] ?? "Ocp-Apim-Subscription-Key";
            request.Headers.TryAddWithoutValidation(header, apiKey);
        }

        using var multipart = new MultipartFormDataContent();
        var fileContent = new ByteArrayContent(content);
        fileContent.Headers.ContentType = MediaTypeHeaderValue.Parse(
            string.IsNullOrWhiteSpace(contentType) ? "application/octet-stream" : contentType);
        multipart.Add(fileContent, "file", fileName);
        request.Content = multipart;

        try
        {
            using var response = await _http.SendAsync(request, token);
            var responseBody = await response.Content.ReadAsStringAsync(token);
            if (!response.IsSuccessStatusCode)
                return string.Empty; // Graceful fallback on OCR API failure

            using var json = JsonDocument.Parse(responseBody);
            if (TryReadText(json.RootElement, out var text)) return text;
            return string.Empty;
        }
        catch
        {
            return string.Empty; // Graceful fallback on network error
        }
    }

    private static bool TryReadText(JsonElement element, out string text)
    {
        foreach (var propertyName in new[] { "text", "content", "extractedText" })
        {
            if (element.TryGetProperty(propertyName, out var property) &&
                property.ValueKind == JsonValueKind.String)
            {
                text = property.GetString() ?? string.Empty;
                return true;
            }
        }
        if (element.TryGetProperty("data", out var data) && data.ValueKind == JsonValueKind.Object)
            return TryReadText(data, out text);
        text = string.Empty;
        return false;
    }
}
