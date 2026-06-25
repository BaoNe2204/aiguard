using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

namespace AIGuard.EndpointAgent;

public sealed class EndpointPolicyCache
{
    private readonly AgentStateStore _store;

    public EndpointPolicyCache(AgentStateStore store) => _store = store;

    public void Save(PolicyData policy, EndpointAiPolicyData? aiPolicy)
    {
        Directory.CreateDirectory(_store.DirectoryPath);
        var envelope = new StoredPolicyCache(DateTime.UtcNow, policy, aiPolicy);
        var payload = JsonSerializer.SerializeToUtf8Bytes(envelope, JsonOptions);
        var protectedPayload = ProtectedData.Protect(payload, null, DataProtectionScope.LocalMachine);
        File.WriteAllText(_store.PolicyCachePath, Convert.ToBase64String(protectedPayload));
    }

    public EndpointPolicySnapshot Resolve(AgentConfig config)
    {
        var cached = Load();
        var ttl = TimeSpan.FromMinutes(Math.Clamp(config.OfflinePolicyTtlMinutes, 1, 43200));
        if (cached is not null)
        {
            var age = DateTime.UtcNow - cached.FetchedAtUtc;
            if (age <= ttl)
            {
                return new EndpointPolicySnapshot(
                    cached.Policy,
                    cached.AiPolicy,
                    "cached",
                    cached.FetchedAtUtc,
                    IsExpired: false);
            }

            if (!config.OfflineFallbackToBlock)
            {
                return new EndpointPolicySnapshot(
                    cached.Policy,
                    cached.AiPolicy,
                    "expired-cache",
                    cached.FetchedAtUtc,
                    IsExpired: true);
            }
        }

        return new EndpointPolicySnapshot(
            StrictFallbackPolicy(cached?.Policy),
            cached?.AiPolicy,
            cached is null ? "strict-fallback-no-cache" : "strict-fallback-expired-cache",
            cached?.FetchedAtUtc,
            IsExpired: cached is not null);
    }

    private StoredPolicyCache? Load()
    {
        try
        {
            if (!File.Exists(_store.PolicyCachePath)) return null;
            var protectedPayload = Convert.FromBase64String(File.ReadAllText(_store.PolicyCachePath));
            var payload = ProtectedData.Unprotect(protectedPayload, null, DataProtectionScope.LocalMachine);
            return JsonSerializer.Deserialize<StoredPolicyCache>(Encoding.UTF8.GetString(payload), JsonOptions);
        }
        catch
        {
            return null;
        }
    }

    private static PolicyData StrictFallbackPolicy(PolicyData? lastKnown) => new()
    {
        Version = lastKnown is null ? "offline-strict-fallback" : $"{lastKnown.Version}-offline-strict",
        SensitivityThreshold = Math.Min(lastKnown?.SensitivityThreshold ?? 1, 1),
        EnableApiKeyDetection = true,
        EnableDbUrlDetection = true,
        EnablePrivateKeyDetection = true,
        EnableSourceCodeDetection = true,
        LowAction = "Block",
        MediumAction = "Block",
        HighAction = "Block",
        CriticalAction = "Block",
        ScanOnPaste = true,
        ScanOnSubmit = true,
        ScanFileUpload = true,
        ClipboardWarning = true,
        OfflineCriticalBlock = true
    };

    private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNameCaseInsensitive = true, WriteIndented = true };
    private sealed record StoredPolicyCache(DateTime FetchedAtUtc, PolicyData Policy, EndpointAiPolicyData? AiPolicy);
}

public sealed record EndpointPolicySnapshot(
    PolicyData Policy,
    EndpointAiPolicyData? AiPolicy,
    string Source,
    DateTime? FetchedAtUtc,
    bool IsExpired);
