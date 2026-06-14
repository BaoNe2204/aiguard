using AIGuard.EndpointAgent;

if (args.Length > 0 && !args[0].Equals("run", StringComparison.OrdinalIgnoreCase))
{
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
    return await cli.RunAsync(args, CancellationToken.None);
}

var builder = Host.CreateApplicationBuilder(args);
builder.Services.AddWindowsService(options => options.ServiceName = "AIGuard Endpoint Agent");
builder.Services.AddSingleton<AgentStateStore>();
builder.Services.AddSingleton<EndpointApiClient>();
builder.Services.AddSingleton<EndpointTelemetryCollector>();
builder.Services.AddHostedService<EndpointWorker>();
await builder.Build().RunAsync();
return 0;
