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
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Data.SqlClient;
using System.Threading.RateLimiting;

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
    {
        var sqlConnection = new SqlConnectionStringBuilder(connectionString)
        {
            MultipleActiveResultSets = false
        };
        options.UseSqlServer(sqlConnection.ConnectionString);
    }
});

// ── Authentication (JWT) ──
var jwtSettings = builder.Configuration.GetSection("JwtSettings");
var jwtSecret = jwtSettings["Secret"];
if (string.IsNullOrWhiteSpace(jwtSecret) || jwtSecret.Length < 32)
{
    throw new InvalidOperationException(
        "JwtSettings:Secret must be configured with at least 32 characters. Use environment variables or user secrets outside Development.");
}
var scanReceiptSecret = builder.Configuration["ScanReceiptSettings:Secret"];
if (!builder.Environment.IsDevelopment() &&
    !builder.Environment.IsEnvironment("Testing") &&
    (string.IsNullOrWhiteSpace(scanReceiptSecret) ||
     scanReceiptSecret.Length < 32 ||
     scanReceiptSecret.Contains("CHANGE-ME", StringComparison.OrdinalIgnoreCase)))
{
    throw new InvalidOperationException(
        "ScanReceiptSettings:Secret must be supplied securely and contain at least 32 characters.");
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
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.AddPolicy("auth", context =>
        RateLimitPartition.GetFixedWindowLimiter(
            context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = Math.Clamp(
                    builder.Configuration.GetValue("Authentication:RateLimitPerMinute", 20),
                    5,
                    1000),
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0,
                AutoReplenishment = true
            }));
    options.AddPolicy("agent-runtime", context =>
    {
        var key = context.Request.Headers["X-Agent-Key"].ToString();
        var partition = string.IsNullOrWhiteSpace(key)
            ? context.Connection.RemoteIpAddress?.ToString() ?? "unknown"
            : key[..Math.Min(24, key.Length)];
        return RateLimitPartition.GetTokenBucketLimiter(
            partition,
            _ => new TokenBucketRateLimiterOptions
            {
                TokenLimit = 120,
                TokensPerPeriod = 120,
                ReplenishmentPeriod = TimeSpan.FromMinutes(1),
                QueueLimit = 0,
                AutoReplenishment = true
            });
    });
});

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
builder.Services.AddSingleton<IOidcTokenValidatorService, OidcTokenValidatorService>();
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
builder.Services.AddScoped<ISaasBusinessService, SaasBusinessService>();
builder.Services.AddScoped<ILicenseEntitlementService, LicenseEntitlementService>();
builder.Services.AddScoped<IBusinessDocumentService, BusinessDocumentService>();
builder.Services.AddScoped<IEmailSender, EmailSenderService>();
builder.Services.AddHttpClient("IntegrationDelivery", client =>
{
    client.Timeout = TimeSpan.FromSeconds(15);
});
builder.Services.AddHttpClient<IOcrService, OcrService>(client =>
{
    client.Timeout = TimeSpan.FromSeconds(
        Math.Clamp(builder.Configuration.GetValue("OcrSettings:TimeoutSeconds", 30), 5, 120));
});
builder.Services.AddHttpClient<IAiSecurityEngineClient, AiSecurityEngineClient>(client =>
{
    var baseUrl = builder.Configuration.GetValue<string>("AiSecuritySettings:BaseUrl") ?? "http://127.0.0.1:8000";
    client.BaseAddress = new Uri(baseUrl);
    var timeout = builder.Configuration.GetValue<int>("AiSecuritySettings:TimeoutSeconds", 5);
    client.Timeout = TimeSpan.FromSeconds(Math.Clamp(timeout, 1, 60));
});

builder.Services.AddHttpClient<IVisionAiClient, LocalVisionAiClient>(client =>
{
    var timeout = builder.Configuration.GetValue<int>("VisionAiSettings:TimeoutSeconds", 10);
    client.Timeout = TimeSpan.FromSeconds(Math.Clamp(timeout, 1, 60));
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
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapHub<NotificationHub>("/hubs/notifications").RequireAuthorization();
app.MapHub<EndpointHub>("/hubs/endpoint");

// ── Database Migration & Seed ──
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AiguardDbContext>();
    if (builder.Configuration.GetValue<bool>("DatabaseSettings:ResetOnStartup"))
    {
        await db.Database.EnsureDeletedAsync();
    }

    if (app.Environment.IsEnvironment("Testing"))
    {
        await db.Database.EnsureCreatedAsync();
    }
    else
    {
        await LegacyDatabaseBootstrapper.BaselineLegacySchemaAsync(
            db, app.Logger, app.Lifetime.ApplicationStopping);
        await db.Database.MigrateAsync();
    }
    await DbSeeder.SeedAsync(db, app.Configuration);

}

app.Run();
