using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace aiguard_api.Data.Migrations
{
    /// <inheritdoc />
    public partial class MoveBlockedCodeAppsToTenantSettings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "BlockedCodeApps",
                table: "SecurityPolicies");

            migrationBuilder.AddColumn<string>(
                name: "AgentBlockedCodeApps",
                table: "TenantSettings",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AgentBlockedCodeApps",
                table: "TenantSettings");

            migrationBuilder.AddColumn<string>(
                name: "BlockedCodeApps",
                table: "SecurityPolicies",
                type: "nvarchar(1000)",
                maxLength: 1000,
                nullable: false,
                defaultValue: "");
        }
    }
}
