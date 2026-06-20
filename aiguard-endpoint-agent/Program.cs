using AIGuard.EndpointAgent;
using System.Runtime.InteropServices;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.DependencyInjection;

namespace AIGuard.EndpointAgent;

internal static class Program
{
    [STAThread]
    static int Main(string[] args)
    {
        try
        {
            if (args.Length > 0)
            {
                if (args[0].Equals("clipboard-helper", StringComparison.OrdinalIgnoreCase))
                {
                    var exitCode = 0;
                    var helperThread = new Thread(() =>
                    {
                        try
                        {
                            ApplicationConfiguration.Initialize();
                            var store = new AgentStateStore();
                            var api = new EndpointApiClient(store);
                            Application.Run(new ClipboardProtectionContext(store, api));
                        }
                        catch (Exception ex)
                        {
                            Console.Error.WriteLine($"Clipboard helper failed: {ex.Message}");
                            exitCode = 1;
                        }
                    });
                    helperThread.SetApartmentState(ApartmentState.STA);
                    helperThread.Start();
                    helperThread.Join();
                    return exitCode;
                }

                // Attach to parent console if running in CLI mode (not run as service)
                if (!args[0].Equals("run", StringComparison.OrdinalIgnoreCase))
                {
                    AttachConsole(-1);
                    
                    using var loggerFactory = LoggerFactory.Create(logging =>
                    {
                        logging.AddSimpleConsole(options =>
                        {
                            options.SingleLine = true;
                            options.TimestampFormat = "HH:mm:ss ";
                        });
                    });
                    var store = new AgentStateStore();
                    var api = new EndpointApiClient(store);
                    var telemetry = new EndpointTelemetryCollector();
                    var cli = new AgentCli(store, api, telemetry, Console.Out);
                    return cli.RunAsync(args, CancellationToken.None).GetAwaiter().GetResult();
                }
                else
                {
                    // Service mode
                    var builder = Host.CreateApplicationBuilder(args);
                    builder.Services.AddWindowsService(options => options.ServiceName = "AIGuard Endpoint Agent");
                    builder.Services.AddSingleton<AgentStateStore>();
                    builder.Services.AddSingleton<EndpointApiClient>();
                    builder.Services.AddSingleton<EndpointTelemetryCollector>();
                    builder.Services.AddSingleton<EndpointPolicyCache>();
                    builder.Services.AddSingleton<OfflineTelemetryQueue>();
                    builder.Services.AddHostedService<EndpointWorker>();
                    builder.Build().RunAsync().GetAwaiter().GetResult();
                    return 0;
                }
            }

            // GUI Mode (no arguments)
            ApplicationConfiguration.Initialize();
            Application.Run(new AgentGuiForm());
            return 0;
        }
        catch (Exception ex)
        {
            try
            {
                var logPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "agent-crash.log");
                File.WriteAllText(logPath, ex.ToString());
                MessageBox.Show($"Agent crashed: {ex.Message}\nDetails written to {logPath}", "AIGuard Agent Crash", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
            catch
            {
                // Fallback in case writing file fails
                MessageBox.Show($"Agent crashed: {ex.Message}\nDetails: {ex}", "AIGuard Agent Crash", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
            return 1;
        }
    }

    [DllImport("kernel32.dll", SetLastError = true)]
    static extern bool AttachConsole(int dwProcessId);
}
