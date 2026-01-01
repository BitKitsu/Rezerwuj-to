using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace ReservationService.Migrations
{
    /// <inheritdoc />
    public partial class AddServiceBufferAndStaffBreakAndScheduleIndex : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Schedules_CompanyId_BranchId_ServiceId_DayOfWeek",
                table: "Schedules");

            migrationBuilder.AddColumn<int>(
                name: "BufferMinutesAfter",
                table: "Services",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateTable(
                name: "StaffBreaks",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    CompanyId = table.Column<int>(type: "integer", nullable: false),
                    BranchId = table.Column<int>(type: "integer", nullable: false),
                    StaffId = table.Column<string>(type: "text", nullable: false),
                    DayOfWeek = table.Column<int>(type: "integer", nullable: false),
                    StartTime = table.Column<TimeOnly>(type: "time without time zone", nullable: false),
                    EndTime = table.Column<TimeOnly>(type: "time without time zone", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_StaffBreaks", x => x.Id);
                    table.ForeignKey(
                        name: "FK_StaffBreaks_Branches_BranchId",
                        column: x => x.BranchId,
                        principalTable: "Branches",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_StaffBreaks_Companies_CompanyId",
                        column: x => x.CompanyId,
                        principalTable: "Companies",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.UpdateData(
                table: "Branches",
                keyColumn: "Id",
                keyValue: 1,
                columns: new[] { "CreatedAt", "StreetName", "StreetNumber" },
                values: new object[] { new DateTime(2025, 12, 31, 18, 25, 39, 237, DateTimeKind.Utc).AddTicks(7705), "ul. Główna", "15" });

            migrationBuilder.UpdateData(
                table: "Branches",
                keyColumn: "Id",
                keyValue: 2,
                columns: new[] { "CreatedAt", "StreetName", "StreetNumber" },
                values: new object[] { new DateTime(2025, 12, 31, 18, 25, 39, 237, DateTimeKind.Utc).AddTicks(7707), "ul. Męska", "10" });

            migrationBuilder.UpdateData(
                table: "Branches",
                keyColumn: "Id",
                keyValue: 3,
                columns: new[] { "CreatedAt", "StreetName", "StreetNumber" },
                values: new object[] { new DateTime(2025, 12, 31, 18, 25, 39, 237, DateTimeKind.Utc).AddTicks(7708), "ul. Piękna", "5" });

            migrationBuilder.UpdateData(
                table: "Branches",
                keyColumn: "Id",
                keyValue: 4,
                columns: new[] { "CreatedAt", "StreetName", "StreetNumber" },
                values: new object[] { new DateTime(2025, 12, 31, 18, 25, 39, 237, DateTimeKind.Utc).AddTicks(7710), "ul. Leśna", "8" });

            migrationBuilder.UpdateData(
                table: "Branches",
                keyColumn: "Id",
                keyValue: 5,
                columns: new[] { "CreatedAt", "StreetName", "StreetNumber" },
                values: new object[] { new DateTime(2025, 12, 31, 18, 25, 39, 237, DateTimeKind.Utc).AddTicks(7711), "ul. Dłonie", "2" });

            migrationBuilder.UpdateData(
                table: "Branches",
                keyColumn: "Id",
                keyValue: 6,
                columns: new[] { "CreatedAt", "StreetName", "StreetNumber" },
                values: new object[] { new DateTime(2025, 12, 31, 18, 25, 39, 237, DateTimeKind.Utc).AddTicks(7712), "ul. Relaksu", "21" });

            migrationBuilder.UpdateData(
                table: "Branches",
                keyColumn: "Id",
                keyValue: 7,
                columns: new[] { "CreatedAt", "StreetName", "StreetNumber" },
                values: new object[] { new DateTime(2025, 12, 31, 18, 25, 39, 237, DateTimeKind.Utc).AddTicks(7713), "ul. Kawowa", "7" });

            migrationBuilder.UpdateData(
                table: "Branches",
                keyColumn: "Id",
                keyValue: 8,
                columns: new[] { "CreatedAt", "StreetName", "StreetNumber" },
                values: new object[] { new DateTime(2025, 12, 31, 18, 25, 39, 237, DateTimeKind.Utc).AddTicks(7714), "ul. Luksusowa", "1" });

            migrationBuilder.UpdateData(
                table: "Branches",
                keyColumn: "Id",
                keyValue: 9,
                columns: new[] { "CreatedAt", "StreetName", "StreetNumber" },
                values: new object[] { new DateTime(2025, 12, 31, 18, 25, 39, 237, DateTimeKind.Utc).AddTicks(7716), "ul. Miejska", "11" });

            migrationBuilder.UpdateData(
                table: "Branches",
                keyColumn: "Id",
                keyValue: 11,
                columns: new[] { "CreatedAt", "StreetName", "StreetNumber" },
                values: new object[] { new DateTime(2025, 12, 31, 18, 25, 39, 237, DateTimeKind.Utc).AddTicks(7717), "ul. Rzeszowska", "14" });

            migrationBuilder.UpdateData(
                table: "Branches",
                keyColumn: "Id",
                keyValue: 12,
                columns: new[] { "CreatedAt", "StreetName", "StreetNumber" },
                values: new object[] { new DateTime(2025, 12, 31, 18, 25, 39, 237, DateTimeKind.Utc).AddTicks(7719), "ul. Piłsudskiego", "22" });

            migrationBuilder.UpdateData(
                table: "Companies",
                keyColumn: "Id",
                keyValue: 1,
                columns: new[] { "RegistrationDate", "StreetName", "StreetNumber" },
                values: new object[] { new DateTime(2025, 12, 31, 18, 25, 39, 237, DateTimeKind.Utc).AddTicks(7447), "ul. Główna", "15" });

            migrationBuilder.UpdateData(
                table: "Companies",
                keyColumn: "Id",
                keyValue: 2,
                columns: new[] { "RegistrationDate", "StreetName", "StreetNumber" },
                values: new object[] { new DateTime(2025, 12, 31, 18, 25, 39, 237, DateTimeKind.Utc).AddTicks(7452), "ul. Męska", "10" });

            migrationBuilder.UpdateData(
                table: "Companies",
                keyColumn: "Id",
                keyValue: 3,
                columns: new[] { "RegistrationDate", "StreetName", "StreetNumber" },
                values: new object[] { new DateTime(2025, 12, 31, 18, 25, 39, 237, DateTimeKind.Utc).AddTicks(7454), "ul. Piękna", "5" });

            migrationBuilder.UpdateData(
                table: "Companies",
                keyColumn: "Id",
                keyValue: 4,
                columns: new[] { "RegistrationDate", "StreetName", "StreetNumber" },
                values: new object[] { new DateTime(2025, 12, 31, 18, 25, 39, 237, DateTimeKind.Utc).AddTicks(7457), "ul. Leśna", "8" });

            migrationBuilder.UpdateData(
                table: "Companies",
                keyColumn: "Id",
                keyValue: 5,
                columns: new[] { "RegistrationDate", "StreetName", "StreetNumber" },
                values: new object[] { new DateTime(2025, 12, 31, 18, 25, 39, 237, DateTimeKind.Utc).AddTicks(7459), "ul. Dłonie", "2" });

            migrationBuilder.UpdateData(
                table: "Companies",
                keyColumn: "Id",
                keyValue: 6,
                columns: new[] { "RegistrationDate", "StreetName", "StreetNumber" },
                values: new object[] { new DateTime(2025, 12, 31, 18, 25, 39, 237, DateTimeKind.Utc).AddTicks(7464), "ul. Relaksu", "21" });

            migrationBuilder.UpdateData(
                table: "Companies",
                keyColumn: "Id",
                keyValue: 7,
                columns: new[] { "RegistrationDate", "StreetName", "StreetNumber" },
                values: new object[] { new DateTime(2025, 12, 31, 18, 25, 39, 237, DateTimeKind.Utc).AddTicks(7466), "ul. Kawowa", "7" });

            migrationBuilder.UpdateData(
                table: "Companies",
                keyColumn: "Id",
                keyValue: 8,
                columns: new[] { "RegistrationDate", "StreetName", "StreetNumber" },
                values: new object[] { new DateTime(2025, 12, 31, 18, 25, 39, 237, DateTimeKind.Utc).AddTicks(7468), "ul. Luksusowa", "1" });

            migrationBuilder.UpdateData(
                table: "Companies",
                keyColumn: "Id",
                keyValue: 9,
                columns: new[] { "RegistrationDate", "StreetName", "StreetNumber" },
                values: new object[] { new DateTime(2025, 12, 31, 18, 25, 39, 237, DateTimeKind.Utc).AddTicks(7470), "ul. Miejska", "11" });

            migrationBuilder.UpdateData(
                table: "Companies",
                keyColumn: "Id",
                keyValue: 11,
                columns: new[] { "RegistrationDate", "StreetName", "StreetNumber" },
                values: new object[] { new DateTime(2025, 12, 31, 18, 25, 39, 237, DateTimeKind.Utc).AddTicks(7472), "ul. Rzeszowska", "14" });

            migrationBuilder.UpdateData(
                table: "Companies",
                keyColumn: "Id",
                keyValue: 12,
                columns: new[] { "RegistrationDate", "StreetName", "StreetNumber" },
                values: new object[] { new DateTime(2025, 12, 31, 18, 25, 39, 237, DateTimeKind.Utc).AddTicks(7474), "ul. Piłsudskiego", "22" });

            migrationBuilder.UpdateData(
                table: "Services",
                keyColumn: "Id",
                keyValue: 1,
                column: "BufferMinutesAfter",
                value: 0);

            migrationBuilder.UpdateData(
                table: "Services",
                keyColumn: "Id",
                keyValue: 2,
                column: "BufferMinutesAfter",
                value: 0);

            migrationBuilder.UpdateData(
                table: "Services",
                keyColumn: "Id",
                keyValue: 3,
                column: "BufferMinutesAfter",
                value: 0);

            migrationBuilder.UpdateData(
                table: "Services",
                keyColumn: "Id",
                keyValue: 4,
                column: "BufferMinutesAfter",
                value: 0);

            migrationBuilder.UpdateData(
                table: "Services",
                keyColumn: "Id",
                keyValue: 5,
                column: "BufferMinutesAfter",
                value: 0);

            migrationBuilder.UpdateData(
                table: "Services",
                keyColumn: "Id",
                keyValue: 6,
                column: "BufferMinutesAfter",
                value: 0);

            migrationBuilder.UpdateData(
                table: "Services",
                keyColumn: "Id",
                keyValue: 7,
                column: "BufferMinutesAfter",
                value: 0);

            migrationBuilder.UpdateData(
                table: "Services",
                keyColumn: "Id",
                keyValue: 8,
                column: "BufferMinutesAfter",
                value: 0);

            migrationBuilder.UpdateData(
                table: "Services",
                keyColumn: "Id",
                keyValue: 9,
                column: "BufferMinutesAfter",
                value: 0);

            migrationBuilder.UpdateData(
                table: "Services",
                keyColumn: "Id",
                keyValue: 10,
                column: "BufferMinutesAfter",
                value: 0);

            migrationBuilder.UpdateData(
                table: "Services",
                keyColumn: "Id",
                keyValue: 11,
                column: "BufferMinutesAfter",
                value: 0);

            migrationBuilder.UpdateData(
                table: "Services",
                keyColumn: "Id",
                keyValue: 12,
                column: "BufferMinutesAfter",
                value: 0);

            migrationBuilder.UpdateData(
                table: "Services",
                keyColumn: "Id",
                keyValue: 13,
                column: "BufferMinutesAfter",
                value: 0);

            migrationBuilder.UpdateData(
                table: "Services",
                keyColumn: "Id",
                keyValue: 14,
                column: "BufferMinutesAfter",
                value: 0);

            migrationBuilder.UpdateData(
                table: "Services",
                keyColumn: "Id",
                keyValue: 15,
                column: "BufferMinutesAfter",
                value: 0);

            migrationBuilder.UpdateData(
                table: "Services",
                keyColumn: "Id",
                keyValue: 16,
                column: "BufferMinutesAfter",
                value: 0);

            migrationBuilder.UpdateData(
                table: "Services",
                keyColumn: "Id",
                keyValue: 17,
                column: "BufferMinutesAfter",
                value: 0);

            migrationBuilder.UpdateData(
                table: "Services",
                keyColumn: "Id",
                keyValue: 18,
                column: "BufferMinutesAfter",
                value: 0);

            migrationBuilder.UpdateData(
                table: "Services",
                keyColumn: "Id",
                keyValue: 19,
                column: "BufferMinutesAfter",
                value: 0);

            migrationBuilder.UpdateData(
                table: "Services",
                keyColumn: "Id",
                keyValue: 20,
                column: "BufferMinutesAfter",
                value: 0);

            migrationBuilder.UpdateData(
                table: "Services",
                keyColumn: "Id",
                keyValue: 21,
                column: "BufferMinutesAfter",
                value: 0);

            migrationBuilder.UpdateData(
                table: "Services",
                keyColumn: "Id",
                keyValue: 22,
                column: "BufferMinutesAfter",
                value: 0);

            migrationBuilder.UpdateData(
                table: "Services",
                keyColumn: "Id",
                keyValue: 23,
                column: "BufferMinutesAfter",
                value: 0);

            migrationBuilder.UpdateData(
                table: "Services",
                keyColumn: "Id",
                keyValue: 24,
                column: "BufferMinutesAfter",
                value: 0);

            migrationBuilder.UpdateData(
                table: "Services",
                keyColumn: "Id",
                keyValue: 25,
                column: "BufferMinutesAfter",
                value: 0);

            migrationBuilder.UpdateData(
                table: "Services",
                keyColumn: "Id",
                keyValue: 26,
                column: "BufferMinutesAfter",
                value: 0);

            migrationBuilder.UpdateData(
                table: "Services",
                keyColumn: "Id",
                keyValue: 27,
                column: "BufferMinutesAfter",
                value: 0);

            migrationBuilder.UpdateData(
                table: "Services",
                keyColumn: "Id",
                keyValue: 28,
                column: "BufferMinutesAfter",
                value: 0);

            migrationBuilder.UpdateData(
                table: "Services",
                keyColumn: "Id",
                keyValue: 29,
                column: "BufferMinutesAfter",
                value: 0);

            migrationBuilder.UpdateData(
                table: "Services",
                keyColumn: "Id",
                keyValue: 30,
                column: "BufferMinutesAfter",
                value: 0);

            migrationBuilder.UpdateData(
                table: "Services",
                keyColumn: "Id",
                keyValue: 31,
                column: "BufferMinutesAfter",
                value: 0);

            migrationBuilder.UpdateData(
                table: "Services",
                keyColumn: "Id",
                keyValue: 32,
                column: "BufferMinutesAfter",
                value: 0);

            migrationBuilder.UpdateData(
                table: "Services",
                keyColumn: "Id",
                keyValue: 33,
                column: "BufferMinutesAfter",
                value: 0);

            migrationBuilder.UpdateData(
                table: "Services",
                keyColumn: "Id",
                keyValue: 34,
                column: "BufferMinutesAfter",
                value: 0);

            migrationBuilder.UpdateData(
                table: "Services",
                keyColumn: "Id",
                keyValue: 35,
                column: "BufferMinutesAfter",
                value: 0);

            migrationBuilder.UpdateData(
                table: "Services",
                keyColumn: "Id",
                keyValue: 36,
                column: "BufferMinutesAfter",
                value: 0);

            migrationBuilder.UpdateData(
                table: "Services",
                keyColumn: "Id",
                keyValue: 37,
                column: "BufferMinutesAfter",
                value: 0);

            migrationBuilder.UpdateData(
                table: "Services",
                keyColumn: "Id",
                keyValue: 38,
                column: "BufferMinutesAfter",
                value: 0);

            migrationBuilder.UpdateData(
                table: "Services",
                keyColumn: "Id",
                keyValue: 39,
                column: "BufferMinutesAfter",
                value: 0);

            migrationBuilder.UpdateData(
                table: "Services",
                keyColumn: "Id",
                keyValue: 40,
                column: "BufferMinutesAfter",
                value: 0);

            migrationBuilder.UpdateData(
                table: "Services",
                keyColumn: "Id",
                keyValue: 41,
                column: "BufferMinutesAfter",
                value: 0);

            migrationBuilder.UpdateData(
                table: "Services",
                keyColumn: "Id",
                keyValue: 42,
                column: "BufferMinutesAfter",
                value: 0);

            migrationBuilder.UpdateData(
                table: "Services",
                keyColumn: "Id",
                keyValue: 43,
                column: "BufferMinutesAfter",
                value: 0);

            migrationBuilder.UpdateData(
                table: "Services",
                keyColumn: "Id",
                keyValue: 44,
                column: "BufferMinutesAfter",
                value: 0);

            migrationBuilder.UpdateData(
                table: "Services",
                keyColumn: "Id",
                keyValue: 45,
                column: "BufferMinutesAfter",
                value: 0);

            migrationBuilder.UpdateData(
                table: "Services",
                keyColumn: "Id",
                keyValue: 51,
                column: "BufferMinutesAfter",
                value: 0);

            migrationBuilder.UpdateData(
                table: "Services",
                keyColumn: "Id",
                keyValue: 52,
                column: "BufferMinutesAfter",
                value: 0);

            migrationBuilder.UpdateData(
                table: "Services",
                keyColumn: "Id",
                keyValue: 53,
                column: "BufferMinutesAfter",
                value: 0);

            migrationBuilder.UpdateData(
                table: "Services",
                keyColumn: "Id",
                keyValue: 54,
                column: "BufferMinutesAfter",
                value: 0);

            migrationBuilder.UpdateData(
                table: "Services",
                keyColumn: "Id",
                keyValue: 55,
                column: "BufferMinutesAfter",
                value: 0);

            migrationBuilder.UpdateData(
                table: "Services",
                keyColumn: "Id",
                keyValue: 56,
                column: "BufferMinutesAfter",
                value: 0);

            migrationBuilder.UpdateData(
                table: "Services",
                keyColumn: "Id",
                keyValue: 57,
                column: "BufferMinutesAfter",
                value: 0);

            migrationBuilder.UpdateData(
                table: "Services",
                keyColumn: "Id",
                keyValue: 58,
                column: "BufferMinutesAfter",
                value: 0);

            migrationBuilder.UpdateData(
                table: "Services",
                keyColumn: "Id",
                keyValue: 59,
                column: "BufferMinutesAfter",
                value: 0);

            migrationBuilder.UpdateData(
                table: "Services",
                keyColumn: "Id",
                keyValue: 60,
                column: "BufferMinutesAfter",
                value: 0);

            migrationBuilder.CreateIndex(
                name: "IX_Schedules_CompanyId_BranchId_ServiceId_StaffId_DayOfWeek",
                table: "Schedules",
                columns: new[] { "CompanyId", "BranchId", "ServiceId", "StaffId", "DayOfWeek" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_StaffBreaks_BranchId",
                table: "StaffBreaks",
                column: "BranchId");

            migrationBuilder.CreateIndex(
                name: "IX_StaffBreaks_CompanyId_BranchId_StaffId_DayOfWeek_IsActive",
                table: "StaffBreaks",
                columns: new[] { "CompanyId", "BranchId", "StaffId", "DayOfWeek", "IsActive" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "StaffBreaks");

            migrationBuilder.DropIndex(
                name: "IX_Schedules_CompanyId_BranchId_ServiceId_StaffId_DayOfWeek",
                table: "Schedules");

            migrationBuilder.DropColumn(
                name: "BufferMinutesAfter",
                table: "Services");

            migrationBuilder.UpdateData(
                table: "Branches",
                keyColumn: "Id",
                keyValue: 1,
                columns: new[] { "CreatedAt", "StreetName", "StreetNumber" },
                values: new object[] { new DateTime(2025, 12, 30, 13, 11, 52, 484, DateTimeKind.Utc).AddTicks(4935), "ul. Główna 15", null });

            migrationBuilder.UpdateData(
                table: "Branches",
                keyColumn: "Id",
                keyValue: 2,
                columns: new[] { "CreatedAt", "StreetName", "StreetNumber" },
                values: new object[] { new DateTime(2025, 12, 30, 13, 11, 52, 484, DateTimeKind.Utc).AddTicks(4939), "ul. Męska 10", null });

            migrationBuilder.UpdateData(
                table: "Branches",
                keyColumn: "Id",
                keyValue: 3,
                columns: new[] { "CreatedAt", "StreetName", "StreetNumber" },
                values: new object[] { new DateTime(2025, 12, 30, 13, 11, 52, 484, DateTimeKind.Utc).AddTicks(4941), "ul. Piękna 5", null });

            migrationBuilder.UpdateData(
                table: "Branches",
                keyColumn: "Id",
                keyValue: 4,
                columns: new[] { "CreatedAt", "StreetName", "StreetNumber" },
                values: new object[] { new DateTime(2025, 12, 30, 13, 11, 52, 484, DateTimeKind.Utc).AddTicks(4942), "ul. Leśna 8", null });

            migrationBuilder.UpdateData(
                table: "Branches",
                keyColumn: "Id",
                keyValue: 5,
                columns: new[] { "CreatedAt", "StreetName", "StreetNumber" },
                values: new object[] { new DateTime(2025, 12, 30, 13, 11, 52, 484, DateTimeKind.Utc).AddTicks(4944), "ul. Dłonie 2", null });

            migrationBuilder.UpdateData(
                table: "Branches",
                keyColumn: "Id",
                keyValue: 6,
                columns: new[] { "CreatedAt", "StreetName", "StreetNumber" },
                values: new object[] { new DateTime(2025, 12, 30, 13, 11, 52, 484, DateTimeKind.Utc).AddTicks(4946), "ul. Relaksu 21", null });

            migrationBuilder.UpdateData(
                table: "Branches",
                keyColumn: "Id",
                keyValue: 7,
                columns: new[] { "CreatedAt", "StreetName", "StreetNumber" },
                values: new object[] { new DateTime(2025, 12, 30, 13, 11, 52, 484, DateTimeKind.Utc).AddTicks(4947), "ul. Kawowa 7", null });

            migrationBuilder.UpdateData(
                table: "Branches",
                keyColumn: "Id",
                keyValue: 8,
                columns: new[] { "CreatedAt", "StreetName", "StreetNumber" },
                values: new object[] { new DateTime(2025, 12, 30, 13, 11, 52, 484, DateTimeKind.Utc).AddTicks(4949), "ul. Luksusowa 1", null });

            migrationBuilder.UpdateData(
                table: "Branches",
                keyColumn: "Id",
                keyValue: 9,
                columns: new[] { "CreatedAt", "StreetName", "StreetNumber" },
                values: new object[] { new DateTime(2025, 12, 30, 13, 11, 52, 484, DateTimeKind.Utc).AddTicks(4951), "ul. Miejska 11", null });

            migrationBuilder.UpdateData(
                table: "Branches",
                keyColumn: "Id",
                keyValue: 11,
                columns: new[] { "CreatedAt", "StreetName", "StreetNumber" },
                values: new object[] { new DateTime(2025, 12, 30, 13, 11, 52, 484, DateTimeKind.Utc).AddTicks(4953), "ul. Rzeszowska 14", null });

            migrationBuilder.UpdateData(
                table: "Branches",
                keyColumn: "Id",
                keyValue: 12,
                columns: new[] { "CreatedAt", "StreetName", "StreetNumber" },
                values: new object[] { new DateTime(2025, 12, 30, 13, 11, 52, 484, DateTimeKind.Utc).AddTicks(4955), "ul. Piłsudskiego 22", null });

            migrationBuilder.UpdateData(
                table: "Companies",
                keyColumn: "Id",
                keyValue: 1,
                columns: new[] { "RegistrationDate", "StreetName", "StreetNumber" },
                values: new object[] { new DateTime(2025, 12, 30, 13, 11, 52, 484, DateTimeKind.Utc).AddTicks(4517), "ul. Główna 15", null });

            migrationBuilder.UpdateData(
                table: "Companies",
                keyColumn: "Id",
                keyValue: 2,
                columns: new[] { "RegistrationDate", "StreetName", "StreetNumber" },
                values: new object[] { new DateTime(2025, 12, 30, 13, 11, 52, 484, DateTimeKind.Utc).AddTicks(4521), "ul. Męska 10", null });

            migrationBuilder.UpdateData(
                table: "Companies",
                keyColumn: "Id",
                keyValue: 3,
                columns: new[] { "RegistrationDate", "StreetName", "StreetNumber" },
                values: new object[] { new DateTime(2025, 12, 30, 13, 11, 52, 484, DateTimeKind.Utc).AddTicks(4524), "ul. Piękna 5", null });

            migrationBuilder.UpdateData(
                table: "Companies",
                keyColumn: "Id",
                keyValue: 4,
                columns: new[] { "RegistrationDate", "StreetName", "StreetNumber" },
                values: new object[] { new DateTime(2025, 12, 30, 13, 11, 52, 484, DateTimeKind.Utc).AddTicks(4526), "ul. Leśna 8", null });

            migrationBuilder.UpdateData(
                table: "Companies",
                keyColumn: "Id",
                keyValue: 5,
                columns: new[] { "RegistrationDate", "StreetName", "StreetNumber" },
                values: new object[] { new DateTime(2025, 12, 30, 13, 11, 52, 484, DateTimeKind.Utc).AddTicks(4528), "ul. Dłonie 2", null });

            migrationBuilder.UpdateData(
                table: "Companies",
                keyColumn: "Id",
                keyValue: 6,
                columns: new[] { "RegistrationDate", "StreetName", "StreetNumber" },
                values: new object[] { new DateTime(2025, 12, 30, 13, 11, 52, 484, DateTimeKind.Utc).AddTicks(4531), "ul. Relaksu 21", null });

            migrationBuilder.UpdateData(
                table: "Companies",
                keyColumn: "Id",
                keyValue: 7,
                columns: new[] { "RegistrationDate", "StreetName", "StreetNumber" },
                values: new object[] { new DateTime(2025, 12, 30, 13, 11, 52, 484, DateTimeKind.Utc).AddTicks(4533), "ul. Kawowa 7", null });

            migrationBuilder.UpdateData(
                table: "Companies",
                keyColumn: "Id",
                keyValue: 8,
                columns: new[] { "RegistrationDate", "StreetName", "StreetNumber" },
                values: new object[] { new DateTime(2025, 12, 30, 13, 11, 52, 484, DateTimeKind.Utc).AddTicks(4536), "ul. Luksusowa 1", null });

            migrationBuilder.UpdateData(
                table: "Companies",
                keyColumn: "Id",
                keyValue: 9,
                columns: new[] { "RegistrationDate", "StreetName", "StreetNumber" },
                values: new object[] { new DateTime(2025, 12, 30, 13, 11, 52, 484, DateTimeKind.Utc).AddTicks(4538), "ul. Miejska 11", null });

            migrationBuilder.UpdateData(
                table: "Companies",
                keyColumn: "Id",
                keyValue: 11,
                columns: new[] { "RegistrationDate", "StreetName", "StreetNumber" },
                values: new object[] { new DateTime(2025, 12, 30, 13, 11, 52, 484, DateTimeKind.Utc).AddTicks(4541), "ul. Rzeszowska 14", null });

            migrationBuilder.UpdateData(
                table: "Companies",
                keyColumn: "Id",
                keyValue: 12,
                columns: new[] { "RegistrationDate", "StreetName", "StreetNumber" },
                values: new object[] { new DateTime(2025, 12, 30, 13, 11, 52, 484, DateTimeKind.Utc).AddTicks(4543), "ul. Piłsudskiego 22", null });

            migrationBuilder.CreateIndex(
                name: "IX_Schedules_CompanyId_BranchId_ServiceId_DayOfWeek",
                table: "Schedules",
                columns: new[] { "CompanyId", "BranchId", "ServiceId", "DayOfWeek" },
                unique: true);
        }
    }
}
