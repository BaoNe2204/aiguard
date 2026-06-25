using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace aiguard_api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddBlockedCodeAppsToSecurityPolicy : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "BlockedCodeApps",
                table: "SecurityPolicies",
                type: "nvarchar(1000)",
                maxLength: 1000,
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "BlockedCodeApps",
                table: "SecurityPolicies");
        }
    }
}
