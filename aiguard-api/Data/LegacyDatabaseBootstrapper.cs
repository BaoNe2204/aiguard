using System.Data;
using Microsoft.EntityFrameworkCore;

namespace aiguard_api.Data;

public static class LegacyDatabaseBootstrapper
{
    private const string InitialSchemaMigration = "20260611184153_InitialProductionSchema";
    private const string ScopeFiltersMigration = "20260611185444_AddDataScopeFilters";

    private static readonly string[] CoreTables =
    [
        "AiWebsites", "BlockchainBatches", "Departments", "Devices",
        "EndpointEvents", "EnrollmentTokens", "Agents", "AuditLogs",
        "PolicyListEntries", "SecurityPolicies", "Users", "ScanReceipts",
        "AgentActionLogs", "AgentToolPermissions", "PasswordResetTokens", "Approvals"
    ];

    public static async Task BaselineLegacySchemaAsync(
        AiguardDbContext db,
        ILogger logger,
        CancellationToken cancellationToken = default)
    {
        if (db.Database.ProviderName?.Contains("SqlServer", StringComparison.OrdinalIgnoreCase) != true)
            return;

        var connection = db.Database.GetDbConnection();
        if (connection.State != ConnectionState.Open)
            await connection.OpenAsync(cancellationToken);

        await using var countCommand = connection.CreateCommand();
        countCommand.CommandText = $"""
            SELECT [name]
            FROM sys.tables
            WHERE [name] IN ({string.Join(",", CoreTables.Select((_, index) => $"@p{index}"))});
            """;
        for (var index = 0; index < CoreTables.Length; index++)
        {
            var parameter = countCommand.CreateParameter();
            parameter.ParameterName = $"@p{index}";
            parameter.Value = CoreTables[index];
            countCommand.Parameters.Add(parameter);
        }
        var existing = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        await using (var reader = await countCommand.ExecuteReaderAsync(cancellationToken))
        {
            while (await reader.ReadAsync(cancellationToken))
                existing.Add(reader.GetString(0));
        }
        if (existing.Count == 0) return;
        if (!existing.Contains("ScanReceipts") && CoreTables.Where(t => t != "ScanReceipts").All(existing.Contains))
        {
            await RepairMissingScanReceiptsAsync(connection, cancellationToken);
            existing.Add("ScanReceipts");
            logger.LogWarning("Legacy AIGuard database was missing ScanReceipts. The table and indexes were created.");
        }
        if (existing.Count != CoreTables.Length)
        {
            var missing = CoreTables.Where(table => !existing.Contains(table));
            throw new InvalidOperationException(
                $"Legacy AIGuard database is incomplete ({existing.Count}/{CoreTables.Length} core tables). " +
                $"Missing: {string.Join(", ", missing)}. " +
                "Back up the database and repair the schema before running migrations.");
        }

        await EnsureLegacyScopeColumnsAsync(connection, logger, cancellationToken);
        await EnsureRuntimeFeatureSchemaAsync(connection, logger, cancellationToken);

        await using var baselineCommand = connection.CreateCommand();
        baselineCommand.CommandText = $"""
            IF OBJECT_ID(N'[dbo].[__EFMigrationsHistory]', N'U') IS NULL
            BEGIN
                CREATE TABLE [dbo].[__EFMigrationsHistory] (
                    [MigrationId] nvarchar(150) NOT NULL,
                    [ProductVersion] nvarchar(32) NOT NULL,
                    CONSTRAINT [PK___EFMigrationsHistory] PRIMARY KEY ([MigrationId])
                );
            END;

            IF NOT EXISTS (SELECT 1 FROM [dbo].[__EFMigrationsHistory] WHERE [MigrationId] = N'{InitialSchemaMigration}')
                INSERT INTO [dbo].[__EFMigrationsHistory] ([MigrationId], [ProductVersion])
                VALUES (N'{InitialSchemaMigration}', N'10.0.6');

            IF NOT EXISTS (SELECT 1 FROM [dbo].[__EFMigrationsHistory] WHERE [MigrationId] = N'{ScopeFiltersMigration}')
                INSERT INTO [dbo].[__EFMigrationsHistory] ([MigrationId], [ProductVersion])
                VALUES (N'{ScopeFiltersMigration}', N'10.0.6');
            """;
        await baselineCommand.ExecuteNonQueryAsync(cancellationToken);
        logger.LogWarning(
            "Detected a complete legacy schema without migration history. Baseline migration records were created.");
    }

    private static async Task RepairMissingScanReceiptsAsync(
        System.Data.Common.DbConnection connection,
        CancellationToken cancellationToken)
    {
        await using var command = connection.CreateCommand();
        command.CommandText = """
            IF OBJECT_ID(N'[dbo].[ScanReceipts]', N'U') IS NULL
            BEGIN
                CREATE TABLE [dbo].[ScanReceipts] (
                    [Id] uniqueidentifier NOT NULL,
                    [DeviceId] uniqueidentifier NOT NULL,
                    [TenantCode] nvarchar(100) NOT NULL,
                    [ContentHash] nvarchar(128) NOT NULL,
                    [RiskScore] int NOT NULL,
                    [RiskLevel] nvarchar(50) NOT NULL,
                    [Decision] nvarchar(50) NOT NULL,
                    [DataTypeMatched] nvarchar(500) NOT NULL,
                    [MaskedContentPreview] nvarchar(max) NULL,
                    [PolicyVersion] nvarchar(50) NOT NULL,
                    [Signature] nvarchar(128) NOT NULL,
                    [CreatedAt] datetime2 NOT NULL,
                    [ExpiresAt] datetime2 NOT NULL,
                    [ConsumedAt] datetime2 NULL,
                    CONSTRAINT [PK_ScanReceipts] PRIMARY KEY ([Id]),
                    CONSTRAINT [FK_ScanReceipts_Devices_DeviceId]
                        FOREIGN KEY ([DeviceId]) REFERENCES [dbo].[Devices] ([Id]) ON DELETE CASCADE
                );
            END;

            IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [name] = N'IX_ScanReceipts_DeviceId' AND [object_id] = OBJECT_ID(N'[dbo].[ScanReceipts]'))
                CREATE INDEX [IX_ScanReceipts_DeviceId] ON [dbo].[ScanReceipts] ([DeviceId]);

            IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [name] = N'IX_ScanReceipts_ExpiresAt' AND [object_id] = OBJECT_ID(N'[dbo].[ScanReceipts]'))
                CREATE INDEX [IX_ScanReceipts_ExpiresAt] ON [dbo].[ScanReceipts] ([ExpiresAt]);
            """;
        await command.ExecuteNonQueryAsync(cancellationToken);
    }

    private static async Task EnsureLegacyScopeColumnsAsync(
        System.Data.Common.DbConnection connection,
        ILogger logger,
        CancellationToken cancellationToken)
    {
        var tenantTables = new[]
        {
            "AiWebsites", "BlockchainBatches", "Departments", "Devices",
            "EndpointEvents", "EnrollmentTokens", "Agents", "AuditLogs",
            "PolicyListEntries", "SecurityPolicies", "Users", "ScanReceipts",
            "AgentActionLogs", "Approvals"
        };
        var departmentTables = new[]
        {
            "Devices", "EndpointEvents", "Agents", "AuditLogs",
            "PolicyListEntries", "SecurityPolicies", "Users",
            "AgentActionLogs", "Approvals"
        };
        var sql = string.Join("\n", tenantTables.Select(table => $"""
            IF OBJECT_ID(N'[dbo].[{table}]', N'U') IS NOT NULL
               AND COL_LENGTH(N'[dbo].[{table}]', N'TenantCode') IS NULL
                ALTER TABLE [dbo].[{table}]
                ADD [TenantCode] nvarchar(100) NOT NULL
                    CONSTRAINT [DF_{table}_TenantCode_AIGuardLegacy] DEFAULT N'DEFAULT';
            """)) + "\n" + string.Join("\n", departmentTables.Select(table => $"""
            IF OBJECT_ID(N'[dbo].[{table}]', N'U') IS NOT NULL
               AND COL_LENGTH(N'[dbo].[{table}]', N'DepartmentId') IS NULL
                ALTER TABLE [dbo].[{table}]
                ADD [DepartmentId] uniqueidentifier NULL;
            """));

        await using var command = connection.CreateCommand();
        command.CommandText = sql;
        await command.ExecuteNonQueryAsync(cancellationToken);
        logger.LogInformation("Legacy scope column repair completed.");
    }

    private static async Task EnsureRuntimeFeatureSchemaAsync(
        System.Data.Common.DbConnection connection,
        ILogger logger,
        CancellationToken cancellationToken)
    {
        await using var command = connection.CreateCommand();
        var deviceColumnRepair = string.Join("\n", new[]
        {
            AddColumnSql("Devices", "AgentVersion", "nvarchar(50) NULL"),
            AddColumnSql("Devices", "ExtensionVersion", "nvarchar(50) NULL"),
            AddColumnSql("Devices", "ExtensionActive", "bit NOT NULL CONSTRAINT [DF_Devices_ExtensionActive_AIGuardLegacy] DEFAULT CAST(0 AS bit)"),
            AddColumnSql("Devices", "PolicyVersion", "nvarchar(50) NOT NULL CONSTRAINT [DF_Devices_PolicyVersion_AIGuardLegacy] DEFAULT N'p-default'"),
            AddColumnSql("Devices", "LastSeen", "datetime2 NOT NULL CONSTRAINT [DF_Devices_LastSeen_AIGuardLegacy] DEFAULT SYSUTCDATETIME()"),
            AddColumnSql("Devices", "RiskStatus", "nvarchar(50) NOT NULL CONSTRAINT [DF_Devices_RiskStatus_AIGuardLegacy] DEFAULT N'Safe'"),
            AddColumnSql("Devices", "EndpointKeyHash", "nvarchar(128) NULL"),
            AddColumnSql("Devices", "EnrolledAt", "datetime2 NULL"),
            AddColumnSql("Devices", "EndpointKeyVersion", "int NOT NULL CONSTRAINT [DF_Devices_EndpointKeyVersion_AIGuardLegacy] DEFAULT 1"),
            AddColumnSql("Devices", "EndpointKeyRevoked", "bit NOT NULL CONSTRAINT [DF_Devices_EndpointKeyRevoked_AIGuardLegacy] DEFAULT CAST(0 AS bit)"),
            AddColumnSql("Devices", "EndpointKeyRotatedAt", "datetime2 NULL"),
            AddColumnSql("Devices", "IsQuarantined", "bit NOT NULL CONSTRAINT [DF_Devices_IsQuarantined_AIGuardLegacy] DEFAULT CAST(0 AS bit)"),
            AddColumnSql("Devices", "IsRemoteDisabled", "bit NOT NULL CONSTRAINT [DF_Devices_IsRemoteDisabled_AIGuardLegacy] DEFAULT CAST(0 AS bit)"),
            AddColumnSql("Devices", "QuarantineReason", "nvarchar(1000) NULL"),
            AddColumnSql("Devices", "QuarantinedAt", "datetime2 NULL"),
            AddColumnSql("Devices", "LastPolicySyncAt", "datetime2 NULL"),
            AddColumnSql("Devices", "ExtensionLastSeenAt", "datetime2 NULL"),
            AddColumnSql("Devices", "AgentStatus", "nvarchar(50) NOT NULL CONSTRAINT [DF_Devices_AgentStatus_AIGuardLegacy] DEFAULT N'Unknown'")
        });
        command.CommandText = deviceColumnRepair + "\n" + """
            IF OBJECT_ID(N'[dbo].[EndpointEvents]', N'U') IS NOT NULL
               AND COL_LENGTH(N'[dbo].[EndpointEvents]', N'ScanReceiptId') IS NULL
                ALTER TABLE [dbo].[EndpointEvents] ADD [ScanReceiptId] uniqueidentifier NULL;

            IF OBJECT_ID(N'[dbo].[ShadowAiDiscoveryEvents]', N'U') IS NULL
            BEGIN
                CREATE TABLE [dbo].[ShadowAiDiscoveryEvents] (
                    [Id] uniqueidentifier NOT NULL,
                    [DeviceId] uniqueidentifier NOT NULL,
                    [Domain] nvarchar(255) NOT NULL,
                    [Url] nvarchar(1000) NULL,
                    [PageTitle] nvarchar(500) NULL,
                    [Browser] nvarchar(100) NOT NULL,
                    [IsApproved] bit NOT NULL,
                    [Decision] nvarchar(50) NOT NULL,
                    [VisitCount] int NOT NULL,
                    [FirstSeenAt] datetime2 NOT NULL,
                    [LastSeenAt] datetime2 NOT NULL,
                    [TenantCode] nvarchar(100) NOT NULL,
                    [DepartmentId] uniqueidentifier NULL,
                    CONSTRAINT [PK_ShadowAiDiscoveryEvents] PRIMARY KEY ([Id]),
                    CONSTRAINT [FK_ShadowAiDiscoveryEvents_Devices_DeviceId]
                        FOREIGN KEY ([DeviceId]) REFERENCES [dbo].[Devices] ([Id]) ON DELETE CASCADE
                );
            END;

            IF OBJECT_ID(N'[dbo].[EndpointTelemetryEvents]', N'U') IS NULL
            BEGIN
                CREATE TABLE [dbo].[EndpointTelemetryEvents] (
                    [Id] uniqueidentifier NOT NULL,
                    [DeviceId] uniqueidentifier NOT NULL,
                    [Category] nvarchar(100) NOT NULL,
                    [EventType] nvarchar(100) NOT NULL,
                    [Detail] nvarchar(2000) NULL,
                    [Severity] nvarchar(30) NOT NULL,
                    [OccurredAt] datetime2 NOT NULL,
                    [ReceivedAt] datetime2 NOT NULL,
                    [TenantCode] nvarchar(100) NOT NULL,
                    [DepartmentId] uniqueidentifier NULL,
                    CONSTRAINT [PK_EndpointTelemetryEvents] PRIMARY KEY ([Id]),
                    CONSTRAINT [FK_EndpointTelemetryEvents_Devices_DeviceId]
                        FOREIGN KEY ([DeviceId]) REFERENCES [dbo].[Devices] ([Id]) ON DELETE CASCADE
                );
            END;

            IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [name] = N'IX_ShadowAiDiscoveryEvents_TenantCode_DeviceId_Domain' AND [object_id] = OBJECT_ID(N'[dbo].[ShadowAiDiscoveryEvents]'))
                CREATE UNIQUE INDEX [IX_ShadowAiDiscoveryEvents_TenantCode_DeviceId_Domain]
                    ON [dbo].[ShadowAiDiscoveryEvents] ([TenantCode], [DeviceId], [Domain]);

            IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [name] = N'IX_ShadowAiDiscoveryEvents_LastSeenAt' AND [object_id] = OBJECT_ID(N'[dbo].[ShadowAiDiscoveryEvents]'))
                CREATE INDEX [IX_ShadowAiDiscoveryEvents_LastSeenAt]
                    ON [dbo].[ShadowAiDiscoveryEvents] ([LastSeenAt]);

            IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [name] = N'IX_EndpointTelemetryEvents_Category_ReceivedAt' AND [object_id] = OBJECT_ID(N'[dbo].[EndpointTelemetryEvents]'))
                CREATE INDEX [IX_EndpointTelemetryEvents_Category_ReceivedAt]
                    ON [dbo].[EndpointTelemetryEvents] ([Category], [ReceivedAt]);

            IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [name] = N'IX_EndpointTelemetryEvents_DeviceId' AND [object_id] = OBJECT_ID(N'[dbo].[EndpointTelemetryEvents]'))
                CREATE INDEX [IX_EndpointTelemetryEvents_DeviceId]
                    ON [dbo].[EndpointTelemetryEvents] ([DeviceId]);
            """;
        await command.ExecuteNonQueryAsync(cancellationToken);
        logger.LogInformation("Legacy runtime feature schema repair completed.");
    }

    private static string AddColumnSql(string table, string column, string definition) => $"""
            IF OBJECT_ID(N'[dbo].[{table}]', N'U') IS NOT NULL
               AND COL_LENGTH(N'[dbo].[{table}]', N'{column}') IS NULL
                ALTER TABLE [dbo].[{table}] ADD [{column}] {definition};
            """;
}
