using System.Runtime.InteropServices;

namespace AIGuard.EndpointAgent;

public sealed class ClipboardProtectionContext : ApplicationContext
{
    private const int WmClipboardUpdate = 0x031D;
    private const int MaxClipboardChars = 20000;
    private const string ReplacementText = "[AIGuard] Sensitive clipboard content was blocked by endpoint DLP policy.";

    private readonly AgentStateStore _store;
    private readonly EndpointApiClient _api;
    private readonly ClipboardListenerWindow _window;
    private bool _selfUpdate;
    private DateTime _lastStatusSent = DateTime.MinValue;

    public ClipboardProtectionContext(AgentStateStore store, EndpointApiClient api)
    {
        _store = store;
        _api = api;
        _window = new ClipboardListenerWindow(OnClipboardChanged);
        SendStatus("HelperStarted", "Interactive clipboard helper is running in the user session.", "Info");
    }

    protected override void Dispose(bool disposing)
    {
        if (disposing)
        {
            RemoveClipboardFormatListener(_window.Handle);
            _window.DestroyHandle();
        }

        base.Dispose(disposing);
    }

    private void OnClipboardChanged()
    {
        if (_selfUpdate) return;
        if (!Clipboard.ContainsText(TextDataFormat.Text)) return;

        string text;
        try
        {
            text = Clipboard.GetText(TextDataFormat.Text);
        }
        catch
        {
            return;
        }

        if (string.IsNullOrWhiteSpace(text) || text == ReplacementText) return;
        _ = ScanAndEnforceAsync(text.Length > MaxClipboardChars ? text[..MaxClipboardChars] : text);
    }

    private async Task ScanAndEnforceAsync(string text)
    {
        try
        {
            var config = _store.LoadConfig();
            var state = _store.LoadState();
            if (state is null)
            {
                SendStatus("HelperUnenrolled", "Clipboard helper cannot enforce because endpoint is not enrolled.", "High");
                return;
            }

            var result = await _api.ScanTextAsync(config, state, text, "WindowsClipboard", CancellationToken.None);
            if (IsBlockDecision(result.Decision))
            {
                ReplaceClipboard();
                await SendTelemetryAsync(config, state, new AgentTelemetryItem(
                    "Clipboard",
                    "Blocked",
                    ScanDetail(result, "Sensitive clipboard content replaced before paste."),
                    "Critical",
                    DateTime.UtcNow));
                return;
            }

            if (result.RiskLevel.Equals("High", StringComparison.OrdinalIgnoreCase) ||
                result.RiskLevel.Equals("Critical", StringComparison.OrdinalIgnoreCase))
            {
                await SendTelemetryAsync(config, state, new AgentTelemetryItem(
                    "Clipboard",
                    "AllowedAfterScan",
                    ScanDetail(result, "Clipboard content scanned but policy did not block."),
                    result.RiskLevel,
                    DateTime.UtcNow));
            }
        }
        catch (Exception ex)
        {
            SendStatus("HelperError", $"Clipboard helper scan failed: {ex.GetType().Name}", "High");
        }
    }

    private void ReplaceClipboard()
    {
        try
        {
            _selfUpdate = true;
            Clipboard.Clear();
            Clipboard.SetText(ReplacementText, TextDataFormat.Text);
        }
        finally
        {
            _selfUpdate = false;
        }
    }

    private async void SendStatus(string eventType, string detail, string severity)
    {
        if (eventType == "HelperError" && DateTime.UtcNow - _lastStatusSent < TimeSpan.FromSeconds(30)) return;
        _lastStatusSent = DateTime.UtcNow;

        try
        {
            var config = _store.LoadConfig();
            var state = _store.LoadState();
            if (state is null) return;
            await SendTelemetryAsync(config, state, new AgentTelemetryItem(
                "Clipboard",
                eventType,
                detail,
                severity,
                DateTime.UtcNow));
        }
        catch
        {
            // The service may not be configured yet; clipboard helper keeps running.
        }
    }

    private Task SendTelemetryAsync(AgentConfig config, AgentState state, AgentTelemetryItem item) =>
        _api.SendTelemetryAsync(config, state, [item], CancellationToken.None);

    private static string ScanDetail(DlpScanData result, string reason)
    {
        var types = result.Matches.Count == 0
            ? "none"
            : string.Join(",", result.Matches.Select(match => match.DataType).Distinct().Take(5));
        return string.Join("; ", [
            $"Decision={result.Decision}",
            $"Risk={result.RiskLevel}",
            $"Score={result.RiskScore}",
            $"DataTypes={types}",
            $"PolicyVersion={result.PolicyVersion ?? "unknown"}",
            $"Reason={reason}"
        ]);
    }

    private static bool IsBlockDecision(string? decision) =>
        string.Equals(decision, "Block", StringComparison.OrdinalIgnoreCase) ||
        string.Equals(decision, "Quarantine", StringComparison.OrdinalIgnoreCase) ||
        string.Equals(decision, "KillProcess", StringComparison.OrdinalIgnoreCase);

    private sealed class ClipboardListenerWindow : NativeWindow
    {
        private readonly Action _onChanged;

        public ClipboardListenerWindow(Action onChanged)
        {
            _onChanged = onChanged;
            CreateHandle(new CreateParams { Caption = "AIGuard Clipboard Protection" });
            AddClipboardFormatListener(Handle);
        }

        protected override void WndProc(ref Message m)
        {
            if (m.Msg == WmClipboardUpdate) _onChanged();
            base.WndProc(ref m);
        }
    }

    [DllImport("user32.dll", SetLastError = true)]
    private static extern bool AddClipboardFormatListener(IntPtr hwnd);

    [DllImport("user32.dll", SetLastError = true)]
    private static extern bool RemoveClipboardFormatListener(IntPtr hwnd);
}
