IF OBJECT_ID(N'[__EFMigrationsHistory]') IS NULL
BEGIN
    CREATE TABLE [__EFMigrationsHistory] (
        [MigrationId] nvarchar(150) NOT NULL,
        [ProductVersion] nvarchar(32) NOT NULL,
        CONSTRAINT [PK___EFMigrationsHistory] PRIMARY KEY ([MigrationId])
    );
END;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260611184153_InitialProductionSchema'
)
BEGIN
    CREATE TABLE [AiWebsites] (
        [Id] uniqueidentifier NOT NULL,
        [Name] nvarchar(100) NOT NULL,
        [DomainPattern] nvarchar(500) NOT NULL,
        [IsActive] bit NOT NULL,
        [Mode] nvarchar(50) NOT NULL,
        [LastUpdated] datetime2 NOT NULL,
        [TenantCode] nvarchar(100) NOT NULL,
        CONSTRAINT [PK_AiWebsites] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260611184153_InitialProductionSchema'
)
BEGIN
    CREATE TABLE [BlockchainBatches] (
        [Id] uniqueidentifier NOT NULL,
        [LogCount] int NOT NULL,
        [BatchHash] nvarchar(128) NOT NULL,
        [TransactionHash] nvarchar(255) NULL,
        [BlockNumber] bigint NULL,
        [Status] nvarchar(50) NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [AnchoredAt] datetime2 NULL,
        [TenantCode] nvarchar(100) NOT NULL,
        CONSTRAINT [PK_BlockchainBatches] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260611184153_InitialProductionSchema'
)
BEGIN
    CREATE TABLE [Departments] (
        [Id] uniqueidentifier NOT NULL,
        [Name] nvarchar(100) NOT NULL,
        [Code] nvarchar(50) NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [TenantCode] nvarchar(100) NOT NULL,
        CONSTRAINT [PK_Departments] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260611184153_InitialProductionSchema'
)
BEGIN
    CREATE TABLE [Devices] (
        [Id] uniqueidentifier NOT NULL,
        [Hostname] nvarchar(100) NOT NULL,
        [UserEmail] nvarchar(255) NOT NULL,
        [DepartmentName] nvarchar(100) NOT NULL,
        [AgentVersion] nvarchar(50) NULL,
        [ExtensionVersion] nvarchar(50) NULL,
        [ExtensionActive] bit NOT NULL,
        [PolicyVersion] nvarchar(50) NOT NULL,
        [LastSeen] datetime2 NOT NULL,
        [RiskStatus] nvarchar(50) NOT NULL,
        [EndpointKeyHash] nvarchar(128) NULL,
        [EnrolledAt] datetime2 NULL,
        [EndpointKeyVersion] int NOT NULL,
        [EndpointKeyRevoked] bit NOT NULL,
        [EndpointKeyRotatedAt] datetime2 NULL,
        [TenantCode] nvarchar(100) NOT NULL,
        [DepartmentId] uniqueidentifier NULL,
        CONSTRAINT [PK_Devices] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260611184153_InitialProductionSchema'
)
BEGIN
    CREATE TABLE [EndpointEvents] (
        [Id] uniqueidentifier NOT NULL,
        [UserEmail] nvarchar(255) NOT NULL,
        [Hostname] nvarchar(100) NOT NULL,
        [Browser] nvarchar(100) NOT NULL,
        [WebsiteAi] nvarchar(100) NOT NULL,
        [EventType] nvarchar(100) NOT NULL,
        [RiskScore] int NOT NULL,
        [RiskLevel] nvarchar(50) NOT NULL,
        [Decision] nvarchar(50) NOT NULL,
        [DataTypeMatched] nvarchar(255) NOT NULL,
        [MaskedContentPreview] nvarchar(max) NULL,
        [OriginalHash] nvarchar(128) NOT NULL,
        [PolicyVersion] nvarchar(50) NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [TenantCode] nvarchar(100) NOT NULL,
        [ScanReceiptId] uniqueidentifier NULL,
        [DepartmentId] uniqueidentifier NULL,
        CONSTRAINT [PK_EndpointEvents] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260611184153_InitialProductionSchema'
)
BEGIN
    CREATE TABLE [EnrollmentTokens] (
        [Id] uniqueidentifier NOT NULL,
        [TokenHash] nvarchar(128) NOT NULL,
        [TenantCode] nvarchar(100) NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [ExpiresAt] datetime2 NOT NULL,
        [IsRevoked] bit NOT NULL,
        CONSTRAINT [PK_EnrollmentTokens] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260611184153_InitialProductionSchema'
)
BEGIN
    CREATE TABLE [Agents] (
        [Id] uniqueidentifier NOT NULL,
        [Name] nvarchar(255) NOT NULL,
        [Code] nvarchar(100) NOT NULL,
        [Description] nvarchar(max) NULL,
        [DepartmentId] uniqueidentifier NULL,
        [IsEnabled] bit NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [TenantCode] nvarchar(100) NOT NULL,
        CONSTRAINT [PK_Agents] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_Agents_Departments_DepartmentId] FOREIGN KEY ([DepartmentId]) REFERENCES [Departments] ([Id]) ON DELETE SET NULL
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260611184153_InitialProductionSchema'
)
BEGIN
    CREATE TABLE [AuditLogs] (
        [Id] uniqueidentifier NOT NULL,
        [EventType] nvarchar(100) NOT NULL,
        [ActorType] nvarchar(50) NOT NULL,
        [ActorId] uniqueidentifier NULL,
        [ActorEmail] nvarchar(255) NULL,
        [DepartmentId] uniqueidentifier NULL,
        [RiskLevel] nvarchar(50) NULL,
        [Decision] nvarchar(50) NULL,
        [EventJson] nvarchar(max) NOT NULL,
        [EventHash] nvarchar(128) NOT NULL,
        [PreviousHash] nvarchar(128) NULL,
        [BlockchainBatchId] uniqueidentifier NULL,
        [CreatedAt] datetime2 NOT NULL,
        [TenantCode] nvarchar(100) NOT NULL,
        CONSTRAINT [PK_AuditLogs] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_AuditLogs_BlockchainBatches_BlockchainBatchId] FOREIGN KEY ([BlockchainBatchId]) REFERENCES [BlockchainBatches] ([Id]) ON DELETE SET NULL,
        CONSTRAINT [FK_AuditLogs_Departments_DepartmentId] FOREIGN KEY ([DepartmentId]) REFERENCES [Departments] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260611184153_InitialProductionSchema'
)
BEGIN
    CREATE TABLE [PolicyListEntries] (
        [Id] uniqueidentifier NOT NULL,
        [ListType] nvarchar(20) NOT NULL,
        [EntryType] nvarchar(50) NOT NULL,
        [Value] nvarchar(500) NOT NULL,
        [DepartmentId] uniqueidentifier NULL,
        [IsActive] bit NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [TenantCode] nvarchar(100) NOT NULL,
        CONSTRAINT [PK_PolicyListEntries] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_PolicyListEntries_Departments_DepartmentId] FOREIGN KEY ([DepartmentId]) REFERENCES [Departments] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260611184153_InitialProductionSchema'
)
BEGIN
    CREATE TABLE [SecurityPolicies] (
        [Id] uniqueidentifier NOT NULL,
        [Name] nvarchar(255) NOT NULL,
        [DepartmentId] uniqueidentifier NULL,
        [SensitivityThreshold] int NOT NULL,
        [EnableEmailDetection] bit NOT NULL,
        [EnablePhoneDetection] bit NOT NULL,
        [EnableCccdDetection] bit NOT NULL,
        [EnableApiKeyDetection] bit NOT NULL,
        [EnablePasswordDetection] bit NOT NULL,
        [EnableTokenDetection] bit NOT NULL,
        [EnableDbUrlDetection] bit NOT NULL,
        [EnablePrivateKeyDetection] bit NOT NULL,
        [EnableSourceCodeDetection] bit NOT NULL,
        [EnableFinancialDetection] bit NOT NULL,
        [EnableHrDetection] bit NOT NULL,
        [LowAction] nvarchar(50) NOT NULL,
        [MediumAction] nvarchar(50) NOT NULL,
        [HighAction] nvarchar(50) NOT NULL,
        [CriticalAction] nvarchar(50) NOT NULL,
        [IsActive] bit NOT NULL,
        [ScanOnPaste] bit NOT NULL,
        [ScanOnSubmit] bit NOT NULL,
        [ScanFileUpload] bit NOT NULL,
        [ClipboardWarning] bit NOT NULL,
        [OfflineCriticalBlock] bit NOT NULL,
        [Version] nvarchar(50) NOT NULL,
        [UpdatedAt] datetime2 NOT NULL,
        [TenantCode] nvarchar(100) NOT NULL,
        CONSTRAINT [PK_SecurityPolicies] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_SecurityPolicies_Departments_DepartmentId] FOREIGN KEY ([DepartmentId]) REFERENCES [Departments] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260611184153_InitialProductionSchema'
)
BEGIN
    CREATE TABLE [Users] (
        [Id] uniqueidentifier NOT NULL,
        [FullName] nvarchar(255) NOT NULL,
        [Email] nvarchar(255) NOT NULL,
        [PasswordHash] nvarchar(500) NOT NULL,
        [Role] nvarchar(50) NOT NULL,
        [DepartmentId] uniqueidentifier NULL,
        [IsActive] bit NOT NULL,
        [RefreshToken] nvarchar(max) NULL,
        [RefreshTokenExpiry] datetime2 NULL,
        [CreatedAt] datetime2 NOT NULL,
        [TenantCode] nvarchar(100) NOT NULL,
        CONSTRAINT [PK_Users] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_Users_Departments_DepartmentId] FOREIGN KEY ([DepartmentId]) REFERENCES [Departments] ([Id]) ON DELETE SET NULL
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260611184153_InitialProductionSchema'
)
BEGIN
    CREATE TABLE [ScanReceipts] (
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
        CONSTRAINT [FK_ScanReceipts_Devices_DeviceId] FOREIGN KEY ([DeviceId]) REFERENCES [Devices] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260611184153_InitialProductionSchema'
)
BEGIN
    CREATE TABLE [AgentActionLogs] (
        [Id] uniqueidentifier NOT NULL,
        [AgentId] uniqueidentifier NOT NULL,
        [ToolName] nvarchar(255) NOT NULL,
        [ActionType] nvarchar(100) NOT NULL,
        [TargetResource] nvarchar(500) NULL,
        [Recipient] nvarchar(500) NULL,
        [RequestPayloadHash] nvarchar(128) NULL,
        [RiskScore] int NOT NULL,
        [RiskLevel] nvarchar(50) NOT NULL,
        [Decision] nvarchar(50) NOT NULL,
        [Reason] nvarchar(max) NULL,
        [CreatedAt] datetime2 NOT NULL,
        [TenantCode] nvarchar(100) NOT NULL,
        [DepartmentId] uniqueidentifier NULL,
        CONSTRAINT [PK_AgentActionLogs] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_AgentActionLogs_Agents_AgentId] FOREIGN KEY ([AgentId]) REFERENCES [Agents] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260611184153_InitialProductionSchema'
)
BEGIN
    CREATE TABLE [AgentToolPermissions] (
        [Id] uniqueidentifier NOT NULL,
        [AgentId] uniqueidentifier NOT NULL,
        [ToolName] nvarchar(255) NOT NULL,
        [Category] nvarchar(100) NOT NULL,
        [CanRead] bit NOT NULL,
        [CanWrite] bit NOT NULL,
        [CanDelete] bit NOT NULL,
        [CanSendExternal] bit NOT NULL,
        [CanExport] bit NOT NULL,
        [RequiresApproval] bit NOT NULL,
        [MaxRecordsPerCall] int NOT NULL,
        CONSTRAINT [PK_AgentToolPermissions] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_AgentToolPermissions_Agents_AgentId] FOREIGN KEY ([AgentId]) REFERENCES [Agents] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260611184153_InitialProductionSchema'
)
BEGIN
    CREATE TABLE [PasswordResetTokens] (
        [Id] uniqueidentifier NOT NULL,
        [UserId] uniqueidentifier NOT NULL,
        [TokenHash] nvarchar(128) NOT NULL,
        [ExpiresAt] datetime2 NOT NULL,
        [UsedAt] datetime2 NULL,
        [CreatedAt] datetime2 NOT NULL,
        CONSTRAINT [PK_PasswordResetTokens] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_PasswordResetTokens_Users_UserId] FOREIGN KEY ([UserId]) REFERENCES [Users] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260611184153_InitialProductionSchema'
)
BEGIN
    CREATE TABLE [Approvals] (
        [Id] uniqueidentifier NOT NULL,
        [RequestType] nvarchar(50) NOT NULL,
        [EndpointEventId] uniqueidentifier NULL,
        [AgentActionLogId] uniqueidentifier NULL,
        [RequestedByUserEmail] nvarchar(255) NOT NULL,
        [AssignedApproverId] uniqueidentifier NULL,
        [Status] nvarchar(50) NOT NULL,
        [Reason] nvarchar(max) NULL,
        [ApproverNote] nvarchar(max) NULL,
        [CreatedAt] datetime2 NOT NULL,
        [DecidedAt] datetime2 NULL,
        [TenantCode] nvarchar(100) NOT NULL,
        [DepartmentId] uniqueidentifier NULL,
        CONSTRAINT [PK_Approvals] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_Approvals_AgentActionLogs_AgentActionLogId] FOREIGN KEY ([AgentActionLogId]) REFERENCES [AgentActionLogs] ([Id]),
        CONSTRAINT [FK_Approvals_EndpointEvents_EndpointEventId] FOREIGN KEY ([EndpointEventId]) REFERENCES [EndpointEvents] ([Id]) ON DELETE CASCADE,
        CONSTRAINT [FK_Approvals_Users_AssignedApproverId] FOREIGN KEY ([AssignedApproverId]) REFERENCES [Users] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260611184153_InitialProductionSchema'
)
BEGIN
    CREATE INDEX [IX_AgentActionLogs_AgentId] ON [AgentActionLogs] ([AgentId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260611184153_InitialProductionSchema'
)
BEGIN
    CREATE INDEX [IX_AgentActionLogs_CreatedAt] ON [AgentActionLogs] ([CreatedAt]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260611184153_InitialProductionSchema'
)
BEGIN
    CREATE INDEX [IX_Agents_DepartmentId] ON [Agents] ([DepartmentId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260611184153_InitialProductionSchema'
)
BEGIN
    CREATE UNIQUE INDEX [IX_Agents_TenantCode_Code] ON [Agents] ([TenantCode], [Code]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260611184153_InitialProductionSchema'
)
BEGIN
    CREATE UNIQUE INDEX [IX_AgentToolPermissions_AgentId_ToolName] ON [AgentToolPermissions] ([AgentId], [ToolName]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260611184153_InitialProductionSchema'
)
BEGIN
    CREATE INDEX [IX_Approvals_AgentActionLogId] ON [Approvals] ([AgentActionLogId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260611184153_InitialProductionSchema'
)
BEGIN
    CREATE INDEX [IX_Approvals_AssignedApproverId] ON [Approvals] ([AssignedApproverId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260611184153_InitialProductionSchema'
)
BEGIN
    CREATE INDEX [IX_Approvals_EndpointEventId] ON [Approvals] ([EndpointEventId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260611184153_InitialProductionSchema'
)
BEGIN
    CREATE INDEX [IX_Approvals_Status] ON [Approvals] ([Status]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260611184153_InitialProductionSchema'
)
BEGIN
    CREATE INDEX [IX_AuditLogs_BlockchainBatchId] ON [AuditLogs] ([BlockchainBatchId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260611184153_InitialProductionSchema'
)
BEGIN
    CREATE INDEX [IX_AuditLogs_CreatedAt] ON [AuditLogs] ([CreatedAt]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260611184153_InitialProductionSchema'
)
BEGIN
    CREATE INDEX [IX_AuditLogs_DepartmentId] ON [AuditLogs] ([DepartmentId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260611184153_InitialProductionSchema'
)
BEGIN
    CREATE INDEX [IX_BlockchainBatches_Status] ON [BlockchainBatches] ([Status]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260611184153_InitialProductionSchema'
)
BEGIN
    CREATE UNIQUE INDEX [IX_Departments_TenantCode_Code] ON [Departments] ([TenantCode], [Code]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260611184153_InitialProductionSchema'
)
BEGIN
    CREATE INDEX [IX_Devices_EndpointKeyHash] ON [Devices] ([EndpointKeyHash]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260611184153_InitialProductionSchema'
)
BEGIN
    CREATE UNIQUE INDEX [IX_Devices_TenantCode_Hostname] ON [Devices] ([TenantCode], [Hostname]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260611184153_InitialProductionSchema'
)
BEGIN
    CREATE INDEX [IX_EndpointEvents_CreatedAt] ON [EndpointEvents] ([CreatedAt]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260611184153_InitialProductionSchema'
)
BEGIN
    CREATE INDEX [IX_EndpointEvents_UserEmail] ON [EndpointEvents] ([UserEmail]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260611184153_InitialProductionSchema'
)
BEGIN
    CREATE INDEX [IX_EnrollmentTokens_ExpiresAt] ON [EnrollmentTokens] ([ExpiresAt]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260611184153_InitialProductionSchema'
)
BEGIN
    CREATE UNIQUE INDEX [IX_EnrollmentTokens_TokenHash] ON [EnrollmentTokens] ([TokenHash]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260611184153_InitialProductionSchema'
)
BEGIN
    CREATE UNIQUE INDEX [IX_PasswordResetTokens_TokenHash] ON [PasswordResetTokens] ([TokenHash]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260611184153_InitialProductionSchema'
)
BEGIN
    CREATE INDEX [IX_PasswordResetTokens_UserId] ON [PasswordResetTokens] ([UserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260611184153_InitialProductionSchema'
)
BEGIN
    CREATE INDEX [IX_PolicyListEntries_DepartmentId] ON [PolicyListEntries] ([DepartmentId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260611184153_InitialProductionSchema'
)
BEGIN
    EXEC(N'CREATE UNIQUE INDEX [IX_PolicyListEntries_ListType_EntryType_Value_DepartmentId] ON [PolicyListEntries] ([ListType], [EntryType], [Value], [DepartmentId]) WHERE [DepartmentId] IS NOT NULL');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260611184153_InitialProductionSchema'
)
BEGIN
    CREATE INDEX [IX_ScanReceipts_DeviceId] ON [ScanReceipts] ([DeviceId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260611184153_InitialProductionSchema'
)
BEGIN
    CREATE INDEX [IX_ScanReceipts_ExpiresAt] ON [ScanReceipts] ([ExpiresAt]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260611184153_InitialProductionSchema'
)
BEGIN
    CREATE INDEX [IX_SecurityPolicies_DepartmentId] ON [SecurityPolicies] ([DepartmentId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260611184153_InitialProductionSchema'
)
BEGIN
    CREATE INDEX [IX_Users_DepartmentId] ON [Users] ([DepartmentId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260611184153_InitialProductionSchema'
)
BEGIN
    CREATE UNIQUE INDEX [IX_Users_TenantCode_Email] ON [Users] ([TenantCode], [Email]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260611184153_InitialProductionSchema'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260611184153_InitialProductionSchema', N'10.0.6');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260611185444_AddDataScopeFilters'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260611185444_AddDataScopeFilters', N'10.0.6');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260612191203_InitialProductionGovernance'
)
BEGIN
    ALTER TABLE [Users] ADD [AuthProvider] nvarchar(50) NOT NULL DEFAULT N'';
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260612191203_InitialProductionGovernance'
)
BEGIN
    ALTER TABLE [Users] ADD [ExternalSubjectId] nvarchar(255) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260612191203_InitialProductionGovernance'
)
BEGIN
    ALTER TABLE [Users] ADD [LastLoginAt] datetime2 NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260612191203_InitialProductionGovernance'
)
BEGIN
    ALTER TABLE [Users] ADD [MfaRequired] bit NOT NULL DEFAULT CAST(0 AS bit);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260612191203_InitialProductionGovernance'
)
BEGIN
    ALTER TABLE [PolicyListEntries] ADD [ExpiresAt] datetime2 NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260612191203_InitialProductionGovernance'
)
BEGIN
    ALTER TABLE [PolicyListEntries] ADD [Source] nvarchar(255) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260612191203_InitialProductionGovernance'
)
BEGIN
    ALTER TABLE [Devices] ADD [AgentStatus] nvarchar(50) NOT NULL DEFAULT N'';
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260612191203_InitialProductionGovernance'
)
BEGIN
    ALTER TABLE [Devices] ADD [ExtensionLastSeenAt] datetime2 NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260612191203_InitialProductionGovernance'
)
BEGIN
    ALTER TABLE [Devices] ADD [IsQuarantined] bit NOT NULL DEFAULT CAST(0 AS bit);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260612191203_InitialProductionGovernance'
)
BEGIN
    ALTER TABLE [Devices] ADD [IsRemoteDisabled] bit NOT NULL DEFAULT CAST(0 AS bit);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260612191203_InitialProductionGovernance'
)
BEGIN
    ALTER TABLE [Devices] ADD [LastPolicySyncAt] datetime2 NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260612191203_InitialProductionGovernance'
)
BEGIN
    ALTER TABLE [Devices] ADD [QuarantineReason] nvarchar(1000) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260612191203_InitialProductionGovernance'
)
BEGIN
    ALTER TABLE [Devices] ADD [QuarantinedAt] datetime2 NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260612191203_InitialProductionGovernance'
)
BEGIN
    ALTER TABLE [Approvals] ADD [BusinessJustification] nvarchar(max) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260612191203_InitialProductionGovernance'
)
BEGIN
    ALTER TABLE [Approvals] ADD [ExpiresAt] datetime2 NOT NULL DEFAULT '0001-01-01T00:00:00.0000000';
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260612191203_InitialProductionGovernance'
)
BEGIN
    ALTER TABLE [Approvals] ADD [RevokedAt] datetime2 NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260612191203_InitialProductionGovernance'
)
BEGIN
    CREATE TABLE [ExactDataMatchRecords] (
        [Id] uniqueidentifier NOT NULL,
        [DataType] nvarchar(100) NOT NULL,
        [ValueHash] nvarchar(128) NOT NULL,
        [Label] nvarchar(255) NULL,
        [DepartmentId] uniqueidentifier NULL,
        [IsActive] bit NOT NULL,
        [ExpiresAt] datetime2 NULL,
        [CreatedAt] datetime2 NOT NULL,
        [TenantCode] nvarchar(100) NOT NULL,
        CONSTRAINT [PK_ExactDataMatchRecords] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_ExactDataMatchRecords_Departments_DepartmentId] FOREIGN KEY ([DepartmentId]) REFERENCES [Departments] ([Id]) ON DELETE SET NULL
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260612191203_InitialProductionGovernance'
)
BEGIN
    CREATE TABLE [FalsePositiveReports] (
        [Id] uniqueidentifier NOT NULL,
        [EndpointEventId] uniqueidentifier NOT NULL,
        [ReportedByEmail] nvarchar(255) NOT NULL,
        [DetectorName] nvarchar(255) NOT NULL,
        [Reason] nvarchar(2000) NOT NULL,
        [Status] nvarchar(50) NOT NULL,
        [ReviewedByUserId] uniqueidentifier NULL,
        [ReviewNote] nvarchar(max) NULL,
        [CreateWhitelist] bit NOT NULL,
        [WhitelistExpiresAt] datetime2 NULL,
        [CreatedAt] datetime2 NOT NULL,
        [ReviewedAt] datetime2 NULL,
        [TenantCode] nvarchar(100) NOT NULL,
        [DepartmentId] uniqueidentifier NULL,
        CONSTRAINT [PK_FalsePositiveReports] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_FalsePositiveReports_EndpointEvents_EndpointEventId] FOREIGN KEY ([EndpointEventId]) REFERENCES [EndpointEvents] ([Id]) ON DELETE CASCADE,
        CONSTRAINT [FK_FalsePositiveReports_Users_ReviewedByUserId] FOREIGN KEY ([ReviewedByUserId]) REFERENCES [Users] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260612191203_InitialProductionGovernance'
)
BEGIN
    CREATE TABLE [IncidentCases] (
        [Id] uniqueidentifier NOT NULL,
        [IncidentNumber] nvarchar(50) NOT NULL,
        [Title] nvarchar(255) NOT NULL,
        [Severity] nvarchar(50) NOT NULL,
        [Status] nvarchar(50) NOT NULL,
        [SourceType] nvarchar(50) NOT NULL,
        [EndpointEventId] uniqueidentifier NULL,
        [AgentActionLogId] uniqueidentifier NULL,
        [AssignedToUserId] uniqueidentifier NULL,
        [Summary] nvarchar(max) NULL,
        [Resolution] nvarchar(max) NULL,
        [CreatedAt] datetime2 NOT NULL,
        [UpdatedAt] datetime2 NOT NULL,
        [ResolvedAt] datetime2 NULL,
        [TenantCode] nvarchar(100) NOT NULL,
        [DepartmentId] uniqueidentifier NULL,
        CONSTRAINT [PK_IncidentCases] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_IncidentCases_AgentActionLogs_AgentActionLogId] FOREIGN KEY ([AgentActionLogId]) REFERENCES [AgentActionLogs] ([Id]),
        CONSTRAINT [FK_IncidentCases_EndpointEvents_EndpointEventId] FOREIGN KEY ([EndpointEventId]) REFERENCES [EndpointEvents] ([Id]),
        CONSTRAINT [FK_IncidentCases_Users_AssignedToUserId] FOREIGN KEY ([AssignedToUserId]) REFERENCES [Users] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260612191203_InitialProductionGovernance'
)
BEGIN
    CREATE TABLE [IntegrationEndpoints] (
        [Id] uniqueidentifier NOT NULL,
        [Name] nvarchar(100) NOT NULL,
        [Type] nvarchar(50) NOT NULL,
        [Endpoint] nvarchar(1000) NOT NULL,
        [ConfigurationJson] nvarchar(max) NULL,
        [SecretHash] nvarchar(128) NULL,
        [IsEnabled] bit NOT NULL,
        [LastSuccessAt] datetime2 NULL,
        [LastFailureAt] datetime2 NULL,
        [LastError] nvarchar(max) NULL,
        [CreatedAt] datetime2 NOT NULL,
        [TenantCode] nvarchar(100) NOT NULL,
        CONSTRAINT [PK_IntegrationEndpoints] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260612191203_InitialProductionGovernance'
)
BEGIN
    CREATE TABLE [PolicyRules] (
        [Id] uniqueidentifier NOT NULL,
        [Name] nvarchar(255) NOT NULL,
        [Priority] int NOT NULL,
        [DepartmentId] uniqueidentifier NULL,
        [DataType] nvarchar(255) NULL,
        [WebsitePattern] nvarchar(500) NULL,
        [UserEmail] nvarchar(255) NULL,
        [Hostname] nvarchar(100) NULL,
        [ActiveFrom] time NULL,
        [ActiveTo] time NULL,
        [Action] nvarchar(50) NOT NULL,
        [Status] nvarchar(50) NOT NULL,
        [Version] nvarchar(50) NOT NULL,
        [IsEnabled] bit NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [UpdatedAt] datetime2 NOT NULL,
        [PublishedAt] datetime2 NULL,
        [TenantCode] nvarchar(100) NOT NULL,
        CONSTRAINT [PK_PolicyRules] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_PolicyRules_Departments_DepartmentId] FOREIGN KEY ([DepartmentId]) REFERENCES [Departments] ([Id]) ON DELETE SET NULL
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260612191203_InitialProductionGovernance'
)
BEGIN
    CREATE TABLE [PolicyVersionSnapshots] (
        [Id] uniqueidentifier NOT NULL,
        [Version] nvarchar(50) NOT NULL,
        [Status] nvarchar(50) NOT NULL,
        [SnapshotJson] nvarchar(max) NOT NULL,
        [ChangeReason] nvarchar(2000) NULL,
        [CreatedByEmail] nvarchar(255) NULL,
        [CreatedAt] datetime2 NOT NULL,
        [TenantCode] nvarchar(100) NOT NULL,
        CONSTRAINT [PK_PolicyVersionSnapshots] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260612191203_InitialProductionGovernance'
)
BEGIN
    CREATE TABLE [RetentionPolicies] (
        [Id] uniqueidentifier NOT NULL,
        [EndpointEventDays] int NOT NULL,
        [AuditLogDays] int NOT NULL,
        [NotificationDays] int NOT NULL,
        [IncidentDays] int NOT NULL,
        [StoreOriginalContent] bit NOT NULL,
        [EncryptSensitivePreview] bit NOT NULL,
        [UpdatedAt] datetime2 NOT NULL,
        [UpdatedByEmail] nvarchar(255) NULL,
        [TenantCode] nvarchar(100) NOT NULL,
        CONSTRAINT [PK_RetentionPolicies] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260612191203_InitialProductionGovernance'
)
BEGIN
    CREATE TABLE [UserNotifications] (
        [Id] uniqueidentifier NOT NULL,
        [RecipientUserId] uniqueidentifier NULL,
        [RecipientEmail] nvarchar(255) NULL,
        [RecipientRole] nvarchar(50) NULL,
        [Type] nvarchar(100) NOT NULL,
        [Title] nvarchar(255) NOT NULL,
        [Message] nvarchar(2000) NOT NULL,
        [ActionUrl] nvarchar(500) NULL,
        [MetadataJson] nvarchar(max) NULL,
        [IsRead] bit NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [ReadAt] datetime2 NULL,
        [TenantCode] nvarchar(100) NOT NULL,
        [DepartmentId] uniqueidentifier NULL,
        CONSTRAINT [PK_UserNotifications] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_UserNotifications_Users_RecipientUserId] FOREIGN KEY ([RecipientUserId]) REFERENCES [Users] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260612191203_InitialProductionGovernance'
)
BEGIN
    CREATE INDEX [IX_ExactDataMatchRecords_DepartmentId] ON [ExactDataMatchRecords] ([DepartmentId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260612191203_InitialProductionGovernance'
)
BEGIN
    CREATE UNIQUE INDEX [IX_ExactDataMatchRecords_TenantCode_DataType_ValueHash] ON [ExactDataMatchRecords] ([TenantCode], [DataType], [ValueHash]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260612191203_InitialProductionGovernance'
)
BEGIN
    CREATE INDEX [IX_FalsePositiveReports_EndpointEventId] ON [FalsePositiveReports] ([EndpointEventId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260612191203_InitialProductionGovernance'
)
BEGIN
    CREATE INDEX [IX_FalsePositiveReports_ReviewedByUserId] ON [FalsePositiveReports] ([ReviewedByUserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260612191203_InitialProductionGovernance'
)
BEGIN
    CREATE INDEX [IX_FalsePositiveReports_Status_CreatedAt] ON [FalsePositiveReports] ([Status], [CreatedAt]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260612191203_InitialProductionGovernance'
)
BEGIN
    CREATE INDEX [IX_IncidentCases_AgentActionLogId] ON [IncidentCases] ([AgentActionLogId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260612191203_InitialProductionGovernance'
)
BEGIN
    CREATE INDEX [IX_IncidentCases_AssignedToUserId] ON [IncidentCases] ([AssignedToUserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260612191203_InitialProductionGovernance'
)
BEGIN
    CREATE INDEX [IX_IncidentCases_EndpointEventId] ON [IncidentCases] ([EndpointEventId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260612191203_InitialProductionGovernance'
)
BEGIN
    CREATE INDEX [IX_IncidentCases_Status_Severity_CreatedAt] ON [IncidentCases] ([Status], [Severity], [CreatedAt]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260612191203_InitialProductionGovernance'
)
BEGIN
    CREATE UNIQUE INDEX [IX_IncidentCases_TenantCode_IncidentNumber] ON [IncidentCases] ([TenantCode], [IncidentNumber]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260612191203_InitialProductionGovernance'
)
BEGIN
    CREATE UNIQUE INDEX [IX_IntegrationEndpoints_TenantCode_Name] ON [IntegrationEndpoints] ([TenantCode], [Name]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260612191203_InitialProductionGovernance'
)
BEGIN
    CREATE INDEX [IX_PolicyRules_DepartmentId] ON [PolicyRules] ([DepartmentId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260612191203_InitialProductionGovernance'
)
BEGIN
    CREATE INDEX [IX_PolicyRules_Status_Priority] ON [PolicyRules] ([Status], [Priority]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260612191203_InitialProductionGovernance'
)
BEGIN
    CREATE UNIQUE INDEX [IX_PolicyVersionSnapshots_TenantCode_Version] ON [PolicyVersionSnapshots] ([TenantCode], [Version]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260612191203_InitialProductionGovernance'
)
BEGIN
    CREATE UNIQUE INDEX [IX_RetentionPolicies_TenantCode] ON [RetentionPolicies] ([TenantCode]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260612191203_InitialProductionGovernance'
)
BEGIN
    CREATE INDEX [IX_UserNotifications_IsRead_CreatedAt] ON [UserNotifications] ([IsRead], [CreatedAt]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260612191203_InitialProductionGovernance'
)
BEGIN
    CREATE INDEX [IX_UserNotifications_RecipientUserId] ON [UserNotifications] ([RecipientUserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260612191203_InitialProductionGovernance'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260612191203_InitialProductionGovernance', N'10.0.6');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260612193825_IntegrationDeliveryAndProtectedSecrets'
)
BEGIN
    ALTER TABLE [IntegrationEndpoints] ADD [ProtectedSecret] nvarchar(max) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260612193825_IntegrationDeliveryAndProtectedSecrets'
)
BEGIN
    CREATE TABLE [IntegrationDeliveries] (
        [Id] uniqueidentifier NOT NULL,
        [IntegrationEndpointId] uniqueidentifier NOT NULL,
        [AuditLogId] uniqueidentifier NOT NULL,
        [Status] nvarchar(30) NOT NULL,
        [AttemptCount] int NOT NULL,
        [LastAttemptAt] datetime2 NULL,
        [NextAttemptAt] datetime2 NOT NULL,
        [LastError] nvarchar(2000) NULL,
        [CreatedAt] datetime2 NOT NULL,
        [DeliveredAt] datetime2 NULL,
        [TenantCode] nvarchar(100) NOT NULL,
        CONSTRAINT [PK_IntegrationDeliveries] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_IntegrationDeliveries_AuditLogs_AuditLogId] FOREIGN KEY ([AuditLogId]) REFERENCES [AuditLogs] ([Id]) ON DELETE CASCADE,
        CONSTRAINT [FK_IntegrationDeliveries_IntegrationEndpoints_IntegrationEndpointId] FOREIGN KEY ([IntegrationEndpointId]) REFERENCES [IntegrationEndpoints] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260612193825_IntegrationDeliveryAndProtectedSecrets'
)
BEGIN
    CREATE INDEX [IX_IntegrationDeliveries_AuditLogId] ON [IntegrationDeliveries] ([AuditLogId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260612193825_IntegrationDeliveryAndProtectedSecrets'
)
BEGIN
    CREATE UNIQUE INDEX [IX_IntegrationDeliveries_IntegrationEndpointId_AuditLogId] ON [IntegrationDeliveries] ([IntegrationEndpointId], [AuditLogId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260612193825_IntegrationDeliveryAndProtectedSecrets'
)
BEGIN
    CREATE INDEX [IX_IntegrationDeliveries_Status_NextAttemptAt] ON [IntegrationDeliveries] ([Status], [NextAttemptAt]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260612193825_IntegrationDeliveryAndProtectedSecrets'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260612193825_IntegrationDeliveryAndProtectedSecrets', N'10.0.6');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260612194236_ShadowAiDiscovery'
)
BEGIN
    CREATE TABLE [ShadowAiDiscoveryEvents] (
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
        CONSTRAINT [FK_ShadowAiDiscoveryEvents_Departments_DepartmentId] FOREIGN KEY ([DepartmentId]) REFERENCES [Departments] ([Id]),
        CONSTRAINT [FK_ShadowAiDiscoveryEvents_Devices_DeviceId] FOREIGN KEY ([DeviceId]) REFERENCES [Devices] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260612194236_ShadowAiDiscovery'
)
BEGIN
    CREATE INDEX [IX_ShadowAiDiscoveryEvents_DepartmentId] ON [ShadowAiDiscoveryEvents] ([DepartmentId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260612194236_ShadowAiDiscovery'
)
BEGIN
    CREATE INDEX [IX_ShadowAiDiscoveryEvents_DeviceId] ON [ShadowAiDiscoveryEvents] ([DeviceId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260612194236_ShadowAiDiscovery'
)
BEGIN
    CREATE INDEX [IX_ShadowAiDiscoveryEvents_LastSeenAt] ON [ShadowAiDiscoveryEvents] ([LastSeenAt]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260612194236_ShadowAiDiscovery'
)
BEGIN
    CREATE UNIQUE INDEX [IX_ShadowAiDiscoveryEvents_TenantCode_DeviceId_Domain] ON [ShadowAiDiscoveryEvents] ([TenantCode], [DeviceId], [Domain]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260612194236_ShadowAiDiscovery'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260612194236_ShadowAiDiscovery', N'10.0.6');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260612195031_EndpointTelemetry'
)
BEGIN
    CREATE TABLE [EndpointTelemetryEvents] (
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
        CONSTRAINT [FK_EndpointTelemetryEvents_Departments_DepartmentId] FOREIGN KEY ([DepartmentId]) REFERENCES [Departments] ([Id]),
        CONSTRAINT [FK_EndpointTelemetryEvents_Devices_DeviceId] FOREIGN KEY ([DeviceId]) REFERENCES [Devices] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260612195031_EndpointTelemetry'
)
BEGIN
    CREATE INDEX [IX_EndpointTelemetryEvents_Category_ReceivedAt] ON [EndpointTelemetryEvents] ([Category], [ReceivedAt]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260612195031_EndpointTelemetry'
)
BEGIN
    CREATE INDEX [IX_EndpointTelemetryEvents_DepartmentId] ON [EndpointTelemetryEvents] ([DepartmentId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260612195031_EndpointTelemetry'
)
BEGIN
    CREATE INDEX [IX_EndpointTelemetryEvents_DeviceId] ON [EndpointTelemetryEvents] ([DeviceId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260612195031_EndpointTelemetry'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260612195031_EndpointTelemetry', N'10.0.6');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260612202803_AddTotpMfa'
)
BEGIN
    ALTER TABLE [Users] ADD [MfaEnabled] bit NOT NULL DEFAULT CAST(0 AS bit);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260612202803_AddTotpMfa'
)
BEGIN
    ALTER TABLE [Users] ADD [MfaEnabledAt] datetime2 NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260612202803_AddTotpMfa'
)
BEGIN
    ALTER TABLE [Users] ADD [MfaSecretProtected] nvarchar(1000) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260612202803_AddTotpMfa'
)
BEGIN
    CREATE TABLE [MfaLoginChallenges] (
        [Id] uniqueidentifier NOT NULL,
        [UserId] uniqueidentifier NOT NULL,
        [ChallengeTokenHash] nvarchar(128) NOT NULL,
        [IsSetup] bit NOT NULL,
        [SetupSecretProtected] nvarchar(1000) NULL,
        [ExpiresAt] datetime2 NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [ConsumedAt] datetime2 NULL,
        CONSTRAINT [PK_MfaLoginChallenges] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_MfaLoginChallenges_Users_UserId] FOREIGN KEY ([UserId]) REFERENCES [Users] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260612202803_AddTotpMfa'
)
BEGIN
    CREATE UNIQUE INDEX [IX_MfaLoginChallenges_ChallengeTokenHash] ON [MfaLoginChallenges] ([ChallengeTokenHash]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260612202803_AddTotpMfa'
)
BEGIN
    CREATE INDEX [IX_MfaLoginChallenges_ExpiresAt] ON [MfaLoginChallenges] ([ExpiresAt]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260612202803_AddTotpMfa'
)
BEGIN
    CREATE INDEX [IX_MfaLoginChallenges_UserId] ON [MfaLoginChallenges] ([UserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260612202803_AddTotpMfa'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260612202803_AddTotpMfa', N'10.0.6');
END;

COMMIT;
GO

