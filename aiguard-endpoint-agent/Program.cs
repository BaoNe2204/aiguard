using AIGuard.EndpointAgent;

var builder = Host.CreateApplicationBuilder(args);
builder.Services.AddWindowsService(options => options.ServiceName = "AIGuard Endpoint Agent");
builder.Services.AddSingleton<AgentStateStore>();
builder.Services.AddSingleton<EndpointTelemetryCollector>();
builder.Services.AddHostedService<EndpointWorker>();
await builder.Build().RunAsync();
