using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace aiguard_api.Data.Migrations
{
    /// <inheritdoc />
    public partial class SecurityIntegrityHardening : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_AgentActionLogs_AgentId",
                table: "AgentActionLogs");

            migrationBuilder.AddColumn<int>(
                name: "FailedLoginAttempts",
                table: "Users",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<DateTime>(
                name: "LastFailedLoginAt",
                table: "Users",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "LockoutEnd",
                table: "Users",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "AttemptCount",
                table: "MfaLoginChallenges",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<DateTime>(
                name: "LastAttemptAt",
                table: "BlockchainBatches",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "LastError",
                table: "BlockchainBatches",
                type: "nvarchar(2000)",
                maxLength: 2000,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "NextRetryAt",
                table: "BlockchainBatches",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "RetryCount",
                table: "BlockchainBatches",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<Guid>(
                name: "ConcurrencyToken",
                table: "Approvals",
                type: "uniqueidentifier",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.Sql(
                "UPDATE [Approvals] SET [ConcurrencyToken] = NEWID() WHERE [ConcurrencyToken] = '00000000-0000-0000-0000-000000000000';");

            migrationBuilder.AddColumn<bool>(
                name: "RequiresSandbox",
                table: "AgentToolPermissions",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "AllowAgentDelegation",
                table: "Agents",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<int>(
                name: "DailyCallLimit",
                table: "Agents",
                type: "int",
                nullable: false,
                defaultValue: 1000);

            migrationBuilder.AddColumn<int>(
                name: "DailyRecordLimit",
                table: "Agents",
                type: "int",
                nullable: false,
                defaultValue: 10000);

            migrationBuilder.AddColumn<int>(
                name: "MaxDelegationDepth",
                table: "Agents",
                type: "int",
                nullable: false,
                defaultValue: 1);

            migrationBuilder.AddColumn<decimal>(
                name: "MonthlyCostLimit",
                table: "Agents",
                type: "decimal(18,4)",
                precision: 18,
                scale: 4,
                nullable: false,
                defaultValue: 100m);

            migrationBuilder.AddColumn<int>(
                name: "DelegationDepth",
                table: "AgentActionLogs",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<decimal>(
                name: "EstimatedCost",
                table: "AgentActionLogs",
                type: "decimal(18,6)",
                precision: 18,
                scale: 6,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<Guid>(
                name: "ParentAgentId",
                table: "AgentActionLogs",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "RecordCount",
                table: "AgentActionLogs",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "RequestId",
                table: "AgentActionLogs",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "AgentCredentials",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    AgentId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    KeyPrefix = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    KeyHash = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false),
                    Status = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ExpiresAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    LastUsedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    RevokedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    TenantCode = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AgentCredentials", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AgentCredentials_Agents_AgentId",
                        column: x => x.AgentId,
                        principalTable: "Agents",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "MfaRecoveryCodes",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CodeHash = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UsedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    TenantCode = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MfaRecoveryCodes", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MfaRecoveryCodes_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "RefreshSessions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TokenHash = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false),
                    ReplacedByTokenHash = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: true),
                    IpAddress = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    UserAgent = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ExpiresAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    LastUsedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    RevokedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    RevokeReason = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    TenantCode = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RefreshSessions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RefreshSessions_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "SecurityPolicyVersions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    SecurityPolicyId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Version = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    SnapshotJson = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    ChangeReason = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    CreatedByEmail = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    TenantCode = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SecurityPolicyVersions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SecurityPolicyVersions_SecurityPolicies_SecurityPolicyId",
                        column: x => x.SecurityPolicyId,
                        principalTable: "SecurityPolicies",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_BlockchainBatches_Status_NextRetryAt",
                table: "BlockchainBatches",
                columns: new[] { "Status", "NextRetryAt" });

            migrationBuilder.CreateIndex(
                name: "IX_AgentActionLogs_AgentId_RequestId",
                table: "AgentActionLogs",
                columns: new[] { "AgentId", "RequestId" },
                unique: true,
                filter: "[RequestId] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_AgentCredentials_AgentId_Status_ExpiresAt",
                table: "AgentCredentials",
                columns: new[] { "AgentId", "Status", "ExpiresAt" });

            migrationBuilder.CreateIndex(
                name: "IX_AgentCredentials_KeyHash",
                table: "AgentCredentials",
                column: "KeyHash",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_MfaRecoveryCodes_CodeHash",
                table: "MfaRecoveryCodes",
                column: "CodeHash",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_MfaRecoveryCodes_UserId",
                table: "MfaRecoveryCodes",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_RefreshSessions_TokenHash",
                table: "RefreshSessions",
                column: "TokenHash",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_RefreshSessions_UserId_RevokedAt_ExpiresAt",
                table: "RefreshSessions",
                columns: new[] { "UserId", "RevokedAt", "ExpiresAt" });

            migrationBuilder.CreateIndex(
                name: "IX_SecurityPolicyVersions_SecurityPolicyId_Version",
                table: "SecurityPolicyVersions",
                columns: new[] { "SecurityPolicyId", "Version" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AgentCredentials");

            migrationBuilder.DropTable(
                name: "MfaRecoveryCodes");

            migrationBuilder.DropTable(
                name: "RefreshSessions");

            migrationBuilder.DropTable(
                name: "SecurityPolicyVersions");

            migrationBuilder.DropIndex(
                name: "IX_BlockchainBatches_Status_NextRetryAt",
                table: "BlockchainBatches");

            migrationBuilder.DropIndex(
                name: "IX_AgentActionLogs_AgentId_RequestId",
                table: "AgentActionLogs");

            migrationBuilder.DropColumn(
                name: "FailedLoginAttempts",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "LastFailedLoginAt",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "LockoutEnd",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "AttemptCount",
                table: "MfaLoginChallenges");

            migrationBuilder.DropColumn(
                name: "LastAttemptAt",
                table: "BlockchainBatches");

            migrationBuilder.DropColumn(
                name: "LastError",
                table: "BlockchainBatches");

            migrationBuilder.DropColumn(
                name: "NextRetryAt",
                table: "BlockchainBatches");

            migrationBuilder.DropColumn(
                name: "RetryCount",
                table: "BlockchainBatches");

            migrationBuilder.DropColumn(
                name: "ConcurrencyToken",
                table: "Approvals");

            migrationBuilder.DropColumn(
                name: "RequiresSandbox",
                table: "AgentToolPermissions");

            migrationBuilder.DropColumn(
                name: "AllowAgentDelegation",
                table: "Agents");

            migrationBuilder.DropColumn(
                name: "DailyCallLimit",
                table: "Agents");

            migrationBuilder.DropColumn(
                name: "DailyRecordLimit",
                table: "Agents");

            migrationBuilder.DropColumn(
                name: "MaxDelegationDepth",
                table: "Agents");

            migrationBuilder.DropColumn(
                name: "MonthlyCostLimit",
                table: "Agents");

            migrationBuilder.DropColumn(
                name: "DelegationDepth",
                table: "AgentActionLogs");

            migrationBuilder.DropColumn(
                name: "EstimatedCost",
                table: "AgentActionLogs");

            migrationBuilder.DropColumn(
                name: "ParentAgentId",
                table: "AgentActionLogs");

            migrationBuilder.DropColumn(
                name: "RecordCount",
                table: "AgentActionLogs");

            migrationBuilder.DropColumn(
                name: "RequestId",
                table: "AgentActionLogs");

            migrationBuilder.CreateIndex(
                name: "IX_AgentActionLogs_AgentId",
                table: "AgentActionLogs",
                column: "AgentId");
        }
    }
}
