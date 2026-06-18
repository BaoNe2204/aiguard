using System;
using System.Drawing;
using System.Threading;
using System.Threading.Tasks;
using System.Windows.Forms;
using System.IO;

namespace AIGuard.EndpointAgent;

public sealed class AgentGuiForm : Form
{
    // Color Palette
    private static readonly Color ColorBg = Color.FromArgb(24, 24, 27);        // Zinc 900
    private static readonly Color ColorCard = Color.FromArgb(39, 39, 42);      // Zinc 800
    private static readonly Color ColorText = Color.FromArgb(244, 244, 245);    // Zinc 100
    private static readonly Color ColorMuted = Color.FromArgb(161, 161, 170);   // Zinc 400
    private static readonly Color ColorAccent = Color.FromArgb(99, 102, 241);   // Indigo 500
    private static readonly Color ColorGreen = Color.FromArgb(16, 185, 129);    // Emerald 500
    private static readonly Color ColorRed = Color.FromArgb(239, 68, 68);      // Red 500
    private static readonly Color ColorTerminal = Color.FromArgb(9, 9, 11);     // Zinc 950

    private readonly AgentStateStore _store = new();
    private readonly EndpointApiClient _api;
    private readonly EndpointTelemetryCollector _telemetry = new();
    
    // UI Controls
    private Label _lblStatusLight = null!;
    private Label _lblStatusText = null!;
    private Label _lblHostnameValue = null!;
    private Label _lblDeviceIdValue = null!;
    private Label _lblPolicyValue = null!;
    private Label _lblLastSeenValue = null!;

    private TextBox _txtQuickPaste = null!;
    private TextBox _txtApiUrl = null!;
    private TextBox _txtToken = null!;
    private TextBox _txtEmail = null!;
    private TextBox _txtDepartment = null!;

    private Button _btnEnroll = null!;
    private Button _btnSync = null!;
    private Button _btnTelemetry = null!;
    private Button _btnReset = null!;

    private RichTextBox _txtLog = null!;

    private NotifyIcon _notifyIcon = null!;
    private ContextMenuStrip _trayMenu = null!;
    
    private bool _reallyExit = false;
    private readonly System.Windows.Forms.Timer _syncTimer;

    public AgentGuiForm()
    {
        _api = new EndpointApiClient(_store);
        
        InitializeComponent();
        
        _syncTimer = new System.Windows.Forms.Timer();
        _syncTimer.Interval = 15000; // 15 seconds
        _syncTimer.Tick += OnSyncTimerTick;
    }

    private void InitializeComponent()
    {
        // Form properties
        this.Text = "AIGuard Endpoint Agent Console";
        this.Size = new Size(880, 720);
        this.BackColor = ColorBg;
        this.ForeColor = ColorText;
        this.Font = new Font("Segoe UI", 9.5F, FontStyle.Regular);
        this.StartPosition = FormStartPosition.CenterScreen;
        this.FormBorderStyle = FormBorderStyle.FixedSingle;
        this.MaximizeBox = false;
        
        // Dynamically create and apply form icon
        using (var defaultIcon = CreateDynamicIcon(ColorMuted))
        {
            this.Icon = defaultIcon;
        }

        // Layout panels
        var panelHeader = new Panel
        {
            Dock = DockStyle.Top,
            Height = 75,
            BackColor = ColorTerminal,
            Padding = new Padding(20, 12, 20, 12)
        };
        
        var lblHeaderTitle = new Label
        {
            Text = "AIGuard Endpoint Agent",
            Font = new Font("Segoe UI", 14F, FontStyle.Bold),
            ForeColor = ColorAccent,
            AutoSize = true,
            Location = new Point(20, 12)
        };
        
        var lblHeaderSub = new Label
        {
            Text = "Desktop Data Loss Prevention Console & Protection Service",
            Font = new Font("Segoe UI", 8.5F, FontStyle.Regular),
            ForeColor = ColorMuted,
            AutoSize = true,
            Location = new Point(22, 42)
        };
        
        panelHeader.Controls.Add(lblHeaderTitle);
        panelHeader.Controls.Add(lblHeaderSub);
        this.Controls.Add(panelHeader);

        // Left Container
        var panelLeft = new Panel
        {
            Dock = DockStyle.Left,
            Width = 390,
            Padding = new Padding(15, 10, 10, 15)
        };
        this.Controls.Add(panelLeft);

        // Right Container
        var panelRight = new Panel
        {
            Dock = DockStyle.Fill,
            Padding = new Padding(10, 10, 15, 15)
        };
        this.Controls.Add(panelRight);

        // Status Card inside Left Container
        var grpStatus = CreateSectionGroup("System Status", 15, 10, 360, 185, panelLeft);
        
        CreateLabel("Machine Hostname:", 15, 30, grpStatus);
        _lblHostnameValue = CreateValueLabel(Environment.MachineName, 150, 30, grpStatus);

        CreateLabel("Device ID:", 15, 55, grpStatus);
        _lblDeviceIdValue = CreateValueLabel("Unregistered", 150, 55, grpStatus);

        CreateLabel("Active Policy:", 15, 80, grpStatus);
        _lblPolicyValue = CreateValueLabel("None", 150, 80, grpStatus);

        CreateLabel("Last Synchronized:", 15, 105, grpStatus);
        _lblLastSeenValue = CreateValueLabel("Never", 150, 105, grpStatus);

        CreateLabel("Connection Status:", 15, 138, grpStatus);
        _lblStatusLight = new Label
        {
            Location = new Point(150, 140),
            Size = new Size(12, 12),
            BackColor = ColorMuted
        };
        grpStatus.Controls.Add(_lblStatusLight);

        _lblStatusText = new Label
        {
            Text = "Offline / Unregistered",
            Location = new Point(168, 136),
            Size = new Size(180, 20),
            Font = new Font("Segoe UI", 9.5F, FontStyle.Bold),
            ForeColor = ColorMuted
        };
        grpStatus.Controls.Add(_lblStatusText);

        // Configuration Card inside Left Container
        var grpConfig = CreateSectionGroup("Configuration Settings", 15, 205, 360, 395, panelLeft);

        CreateLabel("Quick Setup Paste (Dán nhanh lệnh):", 15, 30, grpConfig);
        _txtQuickPaste = CreateTextBox("", 15, 50, 330, grpConfig);
        _txtQuickPaste.TextChanged += OnQuickPasteChanged;

        CreateLabel("API Base URL:", 15, 90, grpConfig);
        _txtApiUrl = CreateTextBox("http://127.0.0.1:5185", 15, 110, 330, grpConfig);

        CreateLabel("Enrollment Token:", 15, 150, grpConfig);
        _txtToken = CreateTextBox("", 15, 170, 330, grpConfig);

        CreateLabel("User Email:", 15, 210, grpConfig);
        _txtEmail = CreateTextBox("", 15, 230, 160, grpConfig);

        CreateLabel("Department:", 190, 210, grpConfig);
        _txtDepartment = CreateTextBox("", 190, 230, 155, grpConfig);

        // Action Buttons inside Config Card
        _btnEnroll = CreateStyledButton("Save & Register Device", 15, 285, 330, 35, ColorAccent, ColorText, grpConfig);
        _btnEnroll.Click += OnEnrollClick;

        _btnSync = CreateStyledButton("Sync Policy Now", 15, 335, 105, 32, ColorCard, ColorText, grpConfig);
        _btnSync.Click += OnSyncClick;

        _btnTelemetry = CreateStyledButton("Send Telemetry", 127, 335, 105, 32, ColorCard, ColorText, grpConfig);
        _btnTelemetry.Click += OnTelemetryClick;

        _btnReset = CreateStyledButton("Clear State", 239, 335, 106, 32, ColorCard, ColorRed, grpConfig);
        _btnReset.Click += OnResetClick;

        // Terminal Log inside Right Container
        var lblLogTitle = new Label
        {
            Text = "Live Service Logs & Audit Viewer",
            Font = new Font("Segoe UI", 10F, FontStyle.Bold),
            ForeColor = ColorText,
            Dock = DockStyle.Top,
            Height = 25
        };
        panelRight.Controls.Add(lblLogTitle);

        var panelLogBorder = new Panel
        {
            Dock = DockStyle.Fill,
            BackColor = ColorCard,
            Padding = new Padding(1)
        };
        panelRight.Controls.Add(panelLogBorder);

        _txtLog = new RichTextBox
        {
            Dock = DockStyle.Fill,
            BackColor = ColorTerminal,
            ForeColor = ColorText,
            BorderStyle = BorderStyle.None,
            ReadOnly = true,
            Font = new Font("Consolas", 9F, FontStyle.Regular)
        };
        panelLogBorder.Controls.Add(_txtLog);

        // System Tray (Notify Icon) setup
        _trayMenu = new ContextMenuStrip();
        _trayMenu.BackColor = ColorTerminal;
        _trayMenu.ForeColor = ColorText;
        
        var menuOpen = new ToolStripMenuItem("Open Agent Console", null, (s, e) => RestoreForm());
        var menuSync = new ToolStripMenuItem("Sync Policy Now", null, async (s, e) => await SyncStatusAsync());
        var menuExit = new ToolStripMenuItem("Exit Service Console", null, (s, e) => ExitForm());
        
        _trayMenu.Items.Add(menuOpen);
        _trayMenu.Items.Add(menuSync);
        _trayMenu.Items.Add(new ToolStripSeparator());
        _trayMenu.Items.Add(menuExit);

        _notifyIcon = new NotifyIcon
        {
            Text = "AIGuard Endpoint Agent",
            Visible = true,
            ContextMenuStrip = _trayMenu
        };
        _notifyIcon.DoubleClick += (s, e) => RestoreForm();
        
        this.FormClosing += OnFormClosing;
        this.Load += OnFormLoad;
    }

    // Controls Helper Methods
    private Panel CreateSectionGroup(string title, int x, int y, int width, int height, Control parent)
    {
        var container = new Panel
        {
            Location = new Point(x, y),
            Size = new Size(width, height),
            BackColor = ColorCard,
            Padding = new Padding(12)
        };
        
        var header = new Label
        {
            Text = title,
            Font = new Font("Segoe UI", 10F, FontStyle.Bold),
            ForeColor = ColorAccent,
            AutoSize = true,
            Location = new Point(12, 8)
        };
        
        container.Controls.Add(header);
        parent.Controls.Add(container);
        return container;
    }

    private void CreateLabel(string text, int x, int y, Control parent)
    {
        var label = new Label
        {
            Text = text,
            Location = new Point(x, y),
            AutoSize = true,
            ForeColor = ColorMuted,
            Font = new Font("Segoe UI", 9F, FontStyle.Bold)
        };
        parent.Controls.Add(label);
    }

    private Label CreateValueLabel(string text, int x, int y, Control parent)
    {
        var label = new Label
        {
            Text = text,
            Location = new Point(x, y),
            Size = new Size(200, 20),
            ForeColor = ColorText,
            Font = new Font("Segoe UI", 9F, FontStyle.Regular),
            AutoEllipsis = true
        };
        parent.Controls.Add(label);
        return label;
    }

    private TextBox CreateTextBox(string text, int x, int y, int width, Control parent)
    {
        var tb = new TextBox
        {
            Text = text,
            Location = new Point(x, y),
            Width = width,
            BackColor = ColorTerminal,
            ForeColor = ColorText,
            BorderStyle = BorderStyle.FixedSingle,
            Font = new Font("Segoe UI", 9.5F, FontStyle.Regular)
        };
        parent.Controls.Add(tb);
        return tb;
    }

    private Button CreateStyledButton(string text, int x, int y, int width, int height, Color backColor, Color foreColor, Control parent)
    {
        var btn = new Button
        {
            Text = text,
            Location = new Point(x, y),
            Size = new Size(width, height),
            BackColor = backColor,
            ForeColor = foreColor,
            FlatStyle = FlatStyle.Flat,
            Font = new Font("Segoe UI", 9F, FontStyle.Bold)
        };
        btn.FlatAppearance.BorderSize = 0;
        parent.Controls.Add(btn);
        return btn;
    }

    // Form Event Handlers
    private async void OnFormLoad(object? sender, EventArgs e)
    {
        Log("AIGuard Endpoint Agent GUI Console started.", ColorGreen);
        LoadConfigData();
        await SyncStatusAsync();
        _syncTimer.Start();
    }

    private void OnFormClosing(object? sender, FormClosingEventArgs e)
    {
        if (!_reallyExit && e.CloseReason == CloseReason.UserClosing)
        {
            e.Cancel = true;
            this.Hide();
            _notifyIcon.ShowBalloonTip(3000, 
                "AIGuard Desktop Protection Active", 
                "The agent is minimized to the system tray and continues protecting your workspace in the background.", 
                ToolTipIcon.Info);
        }
    }

    private void RestoreForm()
    {
        this.Show();
        this.WindowState = FormWindowState.Normal;
        this.BringToFront();
    }

    private void ExitForm()
    {
        _reallyExit = true;
        _syncTimer.Stop();
        _notifyIcon.Visible = false;
        _notifyIcon.Dispose();
        Application.Exit();
    }

    // Dynamic Tray Icon Helper
    private Icon CreateDynamicIcon(Color statusColor)
    {
        var bitmap = new Bitmap(16, 16);
        using (var g = Graphics.FromImage(bitmap))
        {
            g.Clear(Color.Transparent);
            g.SmoothingMode = System.Drawing.Drawing2D.SmoothingMode.AntiAlias;

            // Base disk
            using var brush = new SolidBrush(Color.FromArgb(20, 20, 23));
            g.FillEllipse(brush, 0, 0, 15, 15);

            // Ring matching status color
            using var pen = new Pen(statusColor, 2F);
            g.DrawEllipse(pen, 1, 1, 13, 13);

            // Inner Shield text
            using var font = new Font("Segoe UI", 7F, FontStyle.Bold);
            using var textBrush = new SolidBrush(ColorText);
            g.DrawString("G", font, textBrush, 3.5F, 1.5F); // G for Guard
        }
        
        var ptr = bitmap.GetHicon();
        var icon = Icon.FromHandle(ptr);
        return icon;
    }

    private void UpdateTrayIcon(Color statusColor)
    {
        try
        {
            var oldIcon = _notifyIcon.Icon;
            _notifyIcon.Icon = CreateDynamicIcon(statusColor);
            this.Icon = _notifyIcon.Icon;
            
            // Dispose old handle
            oldIcon?.Dispose();
        }
        catch
        {
            // Fallback
        }
    }

    // Logging helper
    private void Log(string message, Color color)
    {
        if (this.InvokeRequired)
        {
            this.BeginInvoke(new Action(() => Log(message, color)));
            return;
        }

        var timestamp = DateTime.Now.ToString("HH:mm:ss");
        _txtLog.SelectionStart = _txtLog.TextLength;
        _txtLog.SelectionLength = 0;
        
        _txtLog.SelectionColor = ColorMuted;
        _txtLog.AppendText($"[{timestamp}] ");
        
        _txtLog.SelectionColor = color;
        _txtLog.AppendText(message + Environment.NewLine);
        _txtLog.SelectionColor = ColorText;
        
        _txtLog.ScrollToCaret();
    }

    private void OnQuickPasteChanged(object? sender, EventArgs e)
    {
        var text = _txtQuickPaste.Text.Trim();
        if (string.IsNullOrWhiteSpace(text)) return;

        var api = ExtractParam(text, "--api");
        var token = ExtractParam(text, "--token");
        var dept = ExtractParam(text, "--department");

        if (!string.IsNullOrEmpty(api)) _txtApiUrl.Text = api;
        if (!string.IsNullOrEmpty(token)) _txtToken.Text = token;
        if (!string.IsNullOrEmpty(dept)) _txtDepartment.Text = dept;

        // Force clear user email to require manual input
        _txtEmail.Text = "";
        _txtEmail.Focus();

        Log("Quick Setup: Parsed parameters from pasted command. Email cleared for manual entry.", ColorAccent);
    }

    private string? ExtractParam(string text, string paramName)
    {
        var index = text.IndexOf(paramName, StringComparison.OrdinalIgnoreCase);
        if (index < 0) return null;

        var start = index + paramName.Length;
        while (start < text.Length && (char.IsWhiteSpace(text[start]) || text[start] == '='))
        {
            start++;
        }

        if (start >= text.Length) return null;

        if (text[start] == '"' || text[start] == '\'')
        {
            var quote = text[start];
            start++;
            var end = text.IndexOf(quote, start);
            if (end < 0) return text[start..].Trim();
            return text[start..end];
        }
        else
        {
            var end = start;
            while (end < text.Length && !char.IsWhiteSpace(text[end]))
            {
                end++;
            }
            return text[start..end];
        }
    }

    // Business Logic Action Handlers
    private void LoadConfigData()
    {
        try
        {
            var config = _store.LoadConfig();
            _txtApiUrl.Text = config.ApiBaseUrl;
            _txtToken.Text = config.EnrollmentToken;
            _txtEmail.Text = config.UserEmail;
            _txtDepartment.Text = config.DepartmentName;
            Log("Loaded configuration from agent-config.json", ColorText);
        }
        catch
        {
            Log("No existing configuration found. Please enter settings and register.", ColorMuted);
        }
    }

    private async void OnEnrollClick(object? sender, EventArgs e)
    {
        _btnEnroll.Enabled = false;
        Log("Initiating device registration...", ColorAccent);
        
        try
        {
            var config = new AgentConfig
            {
                ApiBaseUrl = _txtApiUrl.Text.Trim(),
                EnrollmentToken = _txtToken.Text.Trim(),
                UserEmail = _txtEmail.Text.Trim(),
                DepartmentName = _txtDepartment.Text.Trim(),
                HeartbeatSeconds = 30,
                EnableAiCodeAppProtection = true,
                EnableProcessKill = true
            };
            
            _store.SaveConfig(config);
            Log("Configuration saved locally. Contacting registration API...", ColorText);

            var state = await Task.Run(() => _api.EnrollAsync(config, CancellationToken.None));
            _store.SaveState(state);

            Log($"Registration successful! Device Registered with ID: {state.DeviceId}", ColorGreen);
            await SyncStatusAsync();
        }
        catch (Exception ex)
        {
            Log($"Registration failed: {ex.Message}", ColorRed);
            UpdateTrayIcon(ColorRed);
        }
        finally
        {
            _btnEnroll.Enabled = true;
        }
    }

    private async void OnSyncClick(object? sender, EventArgs e)
    {
        _btnSync.Enabled = false;
        Log("Forcing status & policy synchronization...", ColorAccent);
        await SyncStatusAsync();
        _btnSync.Enabled = true;
    }

    private async void OnTelemetryClick(object? sender, EventArgs e)
    {
        _btnTelemetry.Enabled = false;
        Log("Collecting telemetry events...", ColorText);
        
        try
        {
            var config = _store.LoadConfig();
            var state = _store.LoadState();
            
            if (state == null)
            {
                Log("Device must be registered before sending telemetry.", ColorRed);
                return;
            }

            var syncResult = await Task.Run(() => _api.HeartbeatAndSyncAsync(config, state, CancellationToken.None));
            var events = _telemetry.Collect(syncResult.Policy, config, syncResult.AiPolicy);
            Log($"Found {events.Count} local events to transmit.", ColorText);
            
            var sentCount = await Task.Run(() => _api.SendTelemetryAsync(config, state, events, CancellationToken.None));
            Log($"Telemetry transmission complete. {sentCount} events synced with platform.", ColorGreen);
        }
        catch (Exception ex)
        {
            Log($"Telemetry transmission failed: {ex.Message}", ColorRed);
        }
        finally
        {
            _btnTelemetry.Enabled = true;
        }
    }

    private void OnResetClick(object? sender, EventArgs e)
    {
        var result = MessageBox.Show(
            "Are you sure you want to reset the agent state? This will clear local cryptographic keys and registration.",
            "Reset Agent State",
            MessageBoxButtons.YesNo,
            MessageBoxIcon.Warning);

        if (result == DialogResult.Yes)
        {
            _store.ClearState();
            _lblDeviceIdValue.Text = "Unregistered";
            _lblPolicyValue.Text = "None";
            _lblLastSeenValue.Text = "Never";
            _lblStatusLight.BackColor = ColorMuted;
            _lblStatusText.Text = "Offline / Unregistered";
            _lblStatusText.ForeColor = ColorMuted;
            _txtToken.Text = "";
            UpdateTrayIcon(ColorMuted);
            Log("Local cryptographic state deleted. Device is now unregistered.", ColorRed);
        }
    }

    private async void OnSyncTimerTick(object? sender, EventArgs e)
    {
        await SyncStatusAsync(silent: true);
    }

    private async Task SyncStatusAsync(bool silent = false)
    {
        try
        {
            var config = _store.LoadConfig();
            var state = _store.LoadState();

            if (state == null)
            {
                if (!silent) Log("Sync skipped: Device is not registered yet.", ColorMuted);
                _lblStatusLight.BackColor = ColorMuted;
                _lblStatusText.Text = "Offline / Unregistered";
                _lblStatusText.ForeColor = ColorMuted;
                UpdateTrayIcon(ColorMuted);
                return;
            }

            _lblDeviceIdValue.Text = state.DeviceId.ToString();
            
            if (!silent) Log("Synchronizing connection and active policies...", ColorText);
            
            var syncResult = await Task.Run(() => _api.HeartbeatAndSyncAsync(config, state, CancellationToken.None));
            await SendProtectionTelemetryAsync(config, syncResult, silent);
            
            // Update labels
            _lblPolicyValue.Text = syncResult.Policy.Version;
            _lblLastSeenValue.Text = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss");
            
            if (syncResult.Device.IsRemoteDisabled)
            {
                _lblStatusLight.BackColor = ColorRed;
                _lblStatusText.Text = "Disabled Remotely";
                _lblStatusText.ForeColor = ColorRed;
                UpdateTrayIcon(ColorRed);
                if (!silent) Log("WARNING: This device has been disabled remotely by your security administrator.", ColorRed);
            }
            else if (syncResult.Device.IsQuarantined)
            {
                _lblStatusLight.BackColor = ColorRed;
                _lblStatusText.Text = "Quarantined";
                _lblStatusText.ForeColor = ColorRed;
                UpdateTrayIcon(ColorRed);
                if (!silent) Log("WARNING: This device is in Quarantine mode. Content transfers are blocked.", ColorRed);
            }
            else
            {
                _lblStatusLight.BackColor = ColorGreen;
                _lblStatusText.Text = "Protected / Online";
                _lblStatusText.ForeColor = ColorGreen;
                UpdateTrayIcon(ColorGreen);
                if (!silent) Log("Synchronized successfully. Local shielding is active.", ColorGreen);
            }
        }
        catch (Exception ex)
        {
            if (!silent) Log($"Synchronization check failed: {ex.Message}", ColorRed);
            _lblStatusLight.BackColor = ColorRed;
            _lblStatusText.Text = "Connection Error";
            _lblStatusText.ForeColor = ColorRed;
            UpdateTrayIcon(ColorRed);
        }
    }

    private async Task SendProtectionTelemetryAsync(AgentConfig config, EndpointSyncResult syncResult, bool silent)
    {
        try
        {
            var events = _telemetry.Collect(syncResult.Policy, config, syncResult.AiPolicy);
            if (events.Count == 0) return;

            var sentCount = await Task.Run(() =>
                _api.SendTelemetryAsync(config, syncResult.State, events, CancellationToken.None));

            foreach (var item in events.Where(x => x.Category == "DesktopAppPolicyDecision"))
            {
                Log($"Desktop app blocked by enterprise policy: {item.Detail}", ColorRed);
            }

            if (!silent)
                Log($"Protection telemetry synced. {sentCount} events sent.", ColorGreen);
        }
        catch (Exception ex)
        {
            if (!silent) Log($"Protection telemetry failed: {ex.Message}", ColorRed);
        }
    }
}
