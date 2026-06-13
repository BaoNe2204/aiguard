using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using aiguard_api.Data;
using aiguard_api.Hubs;
using aiguard_api.Middleware;
using aiguard_api.Services;
using aiguard_api.Workers;
using Microsoft.AspNetCore.DataProtection;

var builder = WebApplication.CreateBuilder(args);
builder.Logging.ClearProviders();
builder.Logging.AddConsole();
builder.Logging.AddDebug();

var dataProtection = builder.Services.AddDataProtection();
if (builder.Environment.IsEnvironment("Testing"))
    dataProtection.UseEphemeralDataProtectionProvider();

// ── Database ──
builder.Services.AddDbContext<AiguardDbContext>(options =>
{
    var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
    if (builder.Environment.IsEnvironment("Testing"))
        options.UseSqlite(connectionString);
    else
        options.UseSqlServer(connectionString);
});

// ── Authentication (JWT) ──
var jwtSettings = builder.Configuration.GetSection("JwtSettings");
var jwtSecret = jwtSettings["Secret"];
if (string.IsNullOrWhiteSpace(jwtSecret) || jwtSecret.Length < 32)
{
    throw new InvalidOperationException(
        "JwtSettings:Secret must be configured with at least 32 characters. Use environment variables or user secrets outside Development.");
}
builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = jwtSettings["Issuer"],
        ValidAudience = jwtSettings["Audience"],
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret)),
        ClockSkew = TimeSpan.Zero
    };

    // Allow SignalR to use JWT from query string
    options.Events = new JwtBearerEvents
    {
        OnMessageReceived = context =>
        {
            var accessToken = context.Request.Query["access_token"];
            var path = context.HttpContext.Request.Path;
            if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/hubs"))
            {
                context.Token = accessToken;
            }
            return Task.CompletedTask;
        }
    };
});
builder.Services.AddAuthorization();

// ── CORS ──
var corsOrigins = builder.Configuration.GetSection("CorsSettings:AllowedOrigins").Get<string[]>() ?? new[] { "http://localhost:5173" };
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins(corsOrigins)
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});

// ── Services (DI) ──
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<IDataScopeContext, DataScopeContext>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IDeviceService, DeviceService>();
builder.Services.AddScoped<IEndpointEventService, EndpointEventService>();
builder.Services.AddScoped<IAiWebsiteService, AiWebsiteService>();
builder.Services.AddScoped<IApprovalService, ApprovalService>();
builder.Services.AddScoped<IPolicyService, PolicyService>();
builder.Services.AddScoped<IAgentService, AgentService>();
builder.Services.AddScoped<IAuditLogService, AuditLogService>();
builder.Services.AddScoped<IBlockchainService, BlockchainService>();
builder.Services.AddScoped<IDashboardService, DashboardService>();
builder.Services.AddScoped<IDlpScannerService, DlpScannerService>();
builder.Services.AddScoped<IEndpointSecurityService, EndpointSecurityService>();
builder.Services.AddScoped<IDeploymentService, DeploymentService>();
builder.Services.AddScoped<IScanReceiptService, ScanReceiptService>();
builder.Services.AddScoped<IFileContentScannerService, FileContentScannerService>();
builder.Services.AddScoped<IGovernanceService, GovernanceService>();
builder.Services.AddScoped<IReportExportService, ReportExportService>();
builder.Services.AddScoped<IShadowAiService, ShadowAiService>();
builder.Services.AddScoped<IEndpointTelemetryService, EndpointTelemetryService>();
builder.Services.AddHttpClient("IntegrationDelivery", client =>
{
    client.Timeout = TimeSpan.FromSeconds(15);
});
builder.Services.AddHttpClient<IOcrService, OcrService>(client =>
{
    client.Timeout = TimeSpan.FromSeconds(
        Math.Clamp(builder.Configuration.GetValue("OcrSettings:TimeoutSeconds", 30), 5, 120));
});
builder.Services.AddSingleton<IEvmBlockchainAnchorClient, EvmBlockchainAnchorClient>();

// ── SignalR ──
builder.Services.AddSignalR();

// ── Background Workers ──
builder.Services.AddHostedService<BlockchainAnchorWorker>();
builder.Services.AddHostedService<RetentionCleanupWorker>();
builder.Services.AddHostedService<IntegrationDeliveryWorker>();

// ── Controllers + Swagger ──
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
        options.JsonSerializerOptions.DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull;
    });

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddOpenApi();

var app = builder.Build();

// ── Middleware Pipeline ──
app.UseMiddleware<ExceptionMiddleware>();

if (app.Environment.IsDevelopment() || app.Environment.IsEnvironment("Testing"))
{
    app.MapOpenApi();
}

app.UseCors();
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapHub<NotificationHub>("/hubs/notifications");

// ── Database Migration & Seed ──
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AiguardDbContext>();
    if (app.Environment.IsEnvironment("Testing"))
    {
        if (builder.Configuration.GetValue<bool>("DatabaseSettings:ResetOnStartup"))
        {
            await db.Database.EnsureDeletedAsync();
        }
        await db.Database.EnsureCreatedAsync();
    }
    else
    {
        await LegacyDatabaseBootstrapper.BaselineLegacySchemaAsync(
            db, app.Logger, app.Lifetime.ApplicationStopping);
        await db.Database.MigrateAsync();
    }
    await DbSeeder.SeedAsync(db);
}

app.Run();
