using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace aiguard_api.Data.Migrations
{
    /// <inheritdoc />
    public partial class ShadowAiDiscovery : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ShadowAiDiscoveryEvents",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    DeviceId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Domain = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                    Url = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    PageTitle = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    Browser = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    IsApproved = table.Column<bool>(type: "bit", nullable: false),
                    Decision = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    VisitCount = table.Column<int>(type: "int", nullable: false),
                    FirstSeenAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    LastSeenAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    TenantCode = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    DepartmentId = table.Column<Guid>(type: "uniqueidentifier", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ShadowAiDiscoveryEvents", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ShadowAiDiscoveryEvents_Departments_DepartmentId",
                        column: x => x.DepartmentId,
                        principalTable: "Departments",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_ShadowAiDiscoveryEvents_Devices_DeviceId",
                        column: x => x.DeviceId,
                        principalTable: "Devices",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ShadowAiDiscoveryEvents_DepartmentId",
                table: "ShadowAiDiscoveryEvents",
                column: "DepartmentId");

            migrationBuilder.CreateIndex(
                name: "IX_ShadowAiDiscoveryEvents_DeviceId",
                table: "ShadowAiDiscoveryEvents",
                column: "DeviceId");

            migrationBuilder.CreateIndex(
                name: "IX_ShadowAiDiscoveryEvents_LastSeenAt",
                table: "ShadowAiDiscoveryEvents",
                column: "LastSeenAt");

            migrationBuilder.CreateIndex(
                name: "IX_ShadowAiDiscoveryEvents_TenantCode_DeviceId_Domain",
                table: "ShadowAiDiscoveryEvents",
                columns: new[] { "TenantCode", "DeviceId", "Domain" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ShadowAiDiscoveryEvents");
        }
    }
}
