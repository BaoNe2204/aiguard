using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace aiguard_api.Data.Migrations
{
    /// <inheritdoc />
    public partial class SignupTenantOwnerFlow : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "EmailVerifiedAt",
                table: "Users",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "PasswordChangedAt",
                table: "Users",
                type: "datetime2",
                nullable: true);

            migrationBuilder.Sql(
                "UPDATE [Users] SET [EmailVerifiedAt] = COALESCE([EmailVerifiedAt], SYSUTCDATETIME()), [PasswordChangedAt] = COALESCE([PasswordChangedAt], SYSUTCDATETIME()) WHERE [IsActive] = 1;");

            migrationBuilder.CreateTable(
                name: "TenantSignupVerificationTokens",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TenantId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TokenHash = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ExpiresAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UsedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    TenantCode = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TenantSignupVerificationTokens", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TenantSignupVerificationTokens_Tenants_TenantId",
                        column: x => x.TenantId,
                        principalTable: "Tenants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_TenantSignupVerificationTokens_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_TenantSignupVerificationTokens_ExpiresAt",
                table: "TenantSignupVerificationTokens",
                column: "ExpiresAt");

            migrationBuilder.CreateIndex(
                name: "IX_TenantSignupVerificationTokens_TenantId",
                table: "TenantSignupVerificationTokens",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_TenantSignupVerificationTokens_TokenHash",
                table: "TenantSignupVerificationTokens",
                column: "TokenHash",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_TenantSignupVerificationTokens_UserId",
                table: "TenantSignupVerificationTokens",
                column: "UserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "TenantSignupVerificationTokens");

            migrationBuilder.DropColumn(
                name: "EmailVerifiedAt",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "PasswordChangedAt",
                table: "Users");
        }
    }
}
