using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ReservationService.Migrations
{
    /// <inheritdoc />
    public partial class AddBranchPhone : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Phone",
                table: "Branches",
                type: "character varying(30)",
                maxLength: 30,
                nullable: true);

            migrationBuilder.UpdateData(
                table: "Branches",
                keyColumn: "Id",
                keyValue: 1,
                columns: new[] { "CreatedAt", "Phone" },
                values: new object[] { new DateTime(2025, 12, 30, 13, 11, 52, 484, DateTimeKind.Utc).AddTicks(4935), null });

            migrationBuilder.UpdateData(
                table: "Branches",
                keyColumn: "Id",
                keyValue: 2,
                columns: new[] { "CreatedAt", "Phone" },
                values: new object[] { new DateTime(2025, 12, 30, 13, 11, 52, 484, DateTimeKind.Utc).AddTicks(4939), null });

            migrationBuilder.UpdateData(
                table: "Branches",
                keyColumn: "Id",
                keyValue: 3,
                columns: new[] { "CreatedAt", "Phone" },
                values: new object[] { new DateTime(2025, 12, 30, 13, 11, 52, 484, DateTimeKind.Utc).AddTicks(4941), null });

            migrationBuilder.UpdateData(
                table: "Branches",
                keyColumn: "Id",
                keyValue: 4,
                columns: new[] { "CreatedAt", "Phone" },
                values: new object[] { new DateTime(2025, 12, 30, 13, 11, 52, 484, DateTimeKind.Utc).AddTicks(4942), null });

            migrationBuilder.UpdateData(
                table: "Branches",
                keyColumn: "Id",
                keyValue: 5,
                columns: new[] { "CreatedAt", "Phone" },
                values: new object[] { new DateTime(2025, 12, 30, 13, 11, 52, 484, DateTimeKind.Utc).AddTicks(4944), null });

            migrationBuilder.UpdateData(
                table: "Branches",
                keyColumn: "Id",
                keyValue: 6,
                columns: new[] { "CreatedAt", "Phone" },
                values: new object[] { new DateTime(2025, 12, 30, 13, 11, 52, 484, DateTimeKind.Utc).AddTicks(4946), null });

            migrationBuilder.UpdateData(
                table: "Branches",
                keyColumn: "Id",
                keyValue: 7,
                columns: new[] { "CreatedAt", "Phone" },
                values: new object[] { new DateTime(2025, 12, 30, 13, 11, 52, 484, DateTimeKind.Utc).AddTicks(4947), null });

            migrationBuilder.UpdateData(
                table: "Branches",
                keyColumn: "Id",
                keyValue: 8,
                columns: new[] { "CreatedAt", "Phone" },
                values: new object[] { new DateTime(2025, 12, 30, 13, 11, 52, 484, DateTimeKind.Utc).AddTicks(4949), null });

            migrationBuilder.UpdateData(
                table: "Branches",
                keyColumn: "Id",
                keyValue: 9,
                columns: new[] { "CreatedAt", "Phone" },
                values: new object[] { new DateTime(2025, 12, 30, 13, 11, 52, 484, DateTimeKind.Utc).AddTicks(4951), null });

            migrationBuilder.UpdateData(
                table: "Branches",
                keyColumn: "Id",
                keyValue: 11,
                columns: new[] { "CreatedAt", "Phone" },
                values: new object[] { new DateTime(2025, 12, 30, 13, 11, 52, 484, DateTimeKind.Utc).AddTicks(4953), null });

            migrationBuilder.UpdateData(
                table: "Branches",
                keyColumn: "Id",
                keyValue: 12,
                columns: new[] { "CreatedAt", "Phone" },
                values: new object[] { new DateTime(2025, 12, 30, 13, 11, 52, 484, DateTimeKind.Utc).AddTicks(4955), null });

            migrationBuilder.UpdateData(
                table: "Companies",
                keyColumn: "Id",
                keyValue: 1,
                columns: new[] { "Phone", "RegistrationDate" },
                values: new object[] { "+48123456789", new DateTime(2025, 12, 30, 13, 11, 52, 484, DateTimeKind.Utc).AddTicks(4517) });

            migrationBuilder.UpdateData(
                table: "Companies",
                keyColumn: "Id",
                keyValue: 2,
                columns: new[] { "Phone", "RegistrationDate" },
                values: new object[] { "+48222333444", new DateTime(2025, 12, 30, 13, 11, 52, 484, DateTimeKind.Utc).AddTicks(4521) });

            migrationBuilder.UpdateData(
                table: "Companies",
                keyColumn: "Id",
                keyValue: 3,
                columns: new[] { "Phone", "RegistrationDate" },
                values: new object[] { "+48333444555", new DateTime(2025, 12, 30, 13, 11, 52, 484, DateTimeKind.Utc).AddTicks(4524) });

            migrationBuilder.UpdateData(
                table: "Companies",
                keyColumn: "Id",
                keyValue: 4,
                columns: new[] { "Phone", "RegistrationDate" },
                values: new object[] { "+48444555666", new DateTime(2025, 12, 30, 13, 11, 52, 484, DateTimeKind.Utc).AddTicks(4526) });

            migrationBuilder.UpdateData(
                table: "Companies",
                keyColumn: "Id",
                keyValue: 5,
                columns: new[] { "Phone", "RegistrationDate" },
                values: new object[] { "+48555666777", new DateTime(2025, 12, 30, 13, 11, 52, 484, DateTimeKind.Utc).AddTicks(4528) });

            migrationBuilder.UpdateData(
                table: "Companies",
                keyColumn: "Id",
                keyValue: 6,
                columns: new[] { "Phone", "RegistrationDate" },
                values: new object[] { "+48666777888", new DateTime(2025, 12, 30, 13, 11, 52, 484, DateTimeKind.Utc).AddTicks(4531) });

            migrationBuilder.UpdateData(
                table: "Companies",
                keyColumn: "Id",
                keyValue: 7,
                columns: new[] { "Phone", "RegistrationDate" },
                values: new object[] { "+48777888999", new DateTime(2025, 12, 30, 13, 11, 52, 484, DateTimeKind.Utc).AddTicks(4533) });

            migrationBuilder.UpdateData(
                table: "Companies",
                keyColumn: "Id",
                keyValue: 8,
                columns: new[] { "Phone", "RegistrationDate" },
                values: new object[] { "+48888999000", new DateTime(2025, 12, 30, 13, 11, 52, 484, DateTimeKind.Utc).AddTicks(4536) });

            migrationBuilder.UpdateData(
                table: "Companies",
                keyColumn: "Id",
                keyValue: 9,
                columns: new[] { "Phone", "RegistrationDate" },
                values: new object[] { "+48999000111", new DateTime(2025, 12, 30, 13, 11, 52, 484, DateTimeKind.Utc).AddTicks(4538) });

            migrationBuilder.UpdateData(
                table: "Companies",
                keyColumn: "Id",
                keyValue: 11,
                columns: new[] { "Phone", "RegistrationDate" },
                values: new object[] { "+48171234567", new DateTime(2025, 12, 30, 13, 11, 52, 484, DateTimeKind.Utc).AddTicks(4541) });

            migrationBuilder.UpdateData(
                table: "Companies",
                keyColumn: "Id",
                keyValue: 12,
                columns: new[] { "Phone", "RegistrationDate" },
                values: new object[] { "+48172345678", new DateTime(2025, 12, 30, 13, 11, 52, 484, DateTimeKind.Utc).AddTicks(4543) });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Phone",
                table: "Branches");

            migrationBuilder.UpdateData(
                table: "Branches",
                keyColumn: "Id",
                keyValue: 1,
                column: "CreatedAt",
                value: new DateTime(2025, 12, 30, 9, 39, 19, 675, DateTimeKind.Utc).AddTicks(4485));

            migrationBuilder.UpdateData(
                table: "Branches",
                keyColumn: "Id",
                keyValue: 2,
                column: "CreatedAt",
                value: new DateTime(2025, 12, 30, 9, 39, 19, 675, DateTimeKind.Utc).AddTicks(4487));

            migrationBuilder.UpdateData(
                table: "Branches",
                keyColumn: "Id",
                keyValue: 3,
                column: "CreatedAt",
                value: new DateTime(2025, 12, 30, 9, 39, 19, 675, DateTimeKind.Utc).AddTicks(4488));

            migrationBuilder.UpdateData(
                table: "Branches",
                keyColumn: "Id",
                keyValue: 4,
                column: "CreatedAt",
                value: new DateTime(2025, 12, 30, 9, 39, 19, 675, DateTimeKind.Utc).AddTicks(4489));

            migrationBuilder.UpdateData(
                table: "Branches",
                keyColumn: "Id",
                keyValue: 5,
                column: "CreatedAt",
                value: new DateTime(2025, 12, 30, 9, 39, 19, 675, DateTimeKind.Utc).AddTicks(4490));

            migrationBuilder.UpdateData(
                table: "Branches",
                keyColumn: "Id",
                keyValue: 6,
                column: "CreatedAt",
                value: new DateTime(2025, 12, 30, 9, 39, 19, 675, DateTimeKind.Utc).AddTicks(4492));

            migrationBuilder.UpdateData(
                table: "Branches",
                keyColumn: "Id",
                keyValue: 7,
                column: "CreatedAt",
                value: new DateTime(2025, 12, 30, 9, 39, 19, 675, DateTimeKind.Utc).AddTicks(4493));

            migrationBuilder.UpdateData(
                table: "Branches",
                keyColumn: "Id",
                keyValue: 8,
                column: "CreatedAt",
                value: new DateTime(2025, 12, 30, 9, 39, 19, 675, DateTimeKind.Utc).AddTicks(4494));

            migrationBuilder.UpdateData(
                table: "Branches",
                keyColumn: "Id",
                keyValue: 9,
                column: "CreatedAt",
                value: new DateTime(2025, 12, 30, 9, 39, 19, 675, DateTimeKind.Utc).AddTicks(4495));

            migrationBuilder.UpdateData(
                table: "Branches",
                keyColumn: "Id",
                keyValue: 11,
                column: "CreatedAt",
                value: new DateTime(2025, 12, 30, 9, 39, 19, 675, DateTimeKind.Utc).AddTicks(4497));

            migrationBuilder.UpdateData(
                table: "Branches",
                keyColumn: "Id",
                keyValue: 12,
                column: "CreatedAt",
                value: new DateTime(2025, 12, 30, 9, 39, 19, 675, DateTimeKind.Utc).AddTicks(4499));

            migrationBuilder.UpdateData(
                table: "Companies",
                keyColumn: "Id",
                keyValue: 1,
                columns: new[] { "Phone", "RegistrationDate" },
                values: new object[] { "123456789", new DateTime(2025, 12, 30, 9, 39, 19, 675, DateTimeKind.Utc).AddTicks(4187) });

            migrationBuilder.UpdateData(
                table: "Companies",
                keyColumn: "Id",
                keyValue: 2,
                columns: new[] { "Phone", "RegistrationDate" },
                values: new object[] { "222333444", new DateTime(2025, 12, 30, 9, 39, 19, 675, DateTimeKind.Utc).AddTicks(4190) });

            migrationBuilder.UpdateData(
                table: "Companies",
                keyColumn: "Id",
                keyValue: 3,
                columns: new[] { "Phone", "RegistrationDate" },
                values: new object[] { "333444555", new DateTime(2025, 12, 30, 9, 39, 19, 675, DateTimeKind.Utc).AddTicks(4192) });

            migrationBuilder.UpdateData(
                table: "Companies",
                keyColumn: "Id",
                keyValue: 4,
                columns: new[] { "Phone", "RegistrationDate" },
                values: new object[] { "444555666", new DateTime(2025, 12, 30, 9, 39, 19, 675, DateTimeKind.Utc).AddTicks(4194) });

            migrationBuilder.UpdateData(
                table: "Companies",
                keyColumn: "Id",
                keyValue: 5,
                columns: new[] { "Phone", "RegistrationDate" },
                values: new object[] { "555666777", new DateTime(2025, 12, 30, 9, 39, 19, 675, DateTimeKind.Utc).AddTicks(4196) });

            migrationBuilder.UpdateData(
                table: "Companies",
                keyColumn: "Id",
                keyValue: 6,
                columns: new[] { "Phone", "RegistrationDate" },
                values: new object[] { "666777888", new DateTime(2025, 12, 30, 9, 39, 19, 675, DateTimeKind.Utc).AddTicks(4198) });

            migrationBuilder.UpdateData(
                table: "Companies",
                keyColumn: "Id",
                keyValue: 7,
                columns: new[] { "Phone", "RegistrationDate" },
                values: new object[] { "777888999", new DateTime(2025, 12, 30, 9, 39, 19, 675, DateTimeKind.Utc).AddTicks(4200) });

            migrationBuilder.UpdateData(
                table: "Companies",
                keyColumn: "Id",
                keyValue: 8,
                columns: new[] { "Phone", "RegistrationDate" },
                values: new object[] { "888999000", new DateTime(2025, 12, 30, 9, 39, 19, 675, DateTimeKind.Utc).AddTicks(4201) });

            migrationBuilder.UpdateData(
                table: "Companies",
                keyColumn: "Id",
                keyValue: 9,
                columns: new[] { "Phone", "RegistrationDate" },
                values: new object[] { "999000111", new DateTime(2025, 12, 30, 9, 39, 19, 675, DateTimeKind.Utc).AddTicks(4203) });

            migrationBuilder.UpdateData(
                table: "Companies",
                keyColumn: "Id",
                keyValue: 11,
                columns: new[] { "Phone", "RegistrationDate" },
                values: new object[] { "171234567", new DateTime(2025, 12, 30, 9, 39, 19, 675, DateTimeKind.Utc).AddTicks(4205) });

            migrationBuilder.UpdateData(
                table: "Companies",
                keyColumn: "Id",
                keyValue: 12,
                columns: new[] { "Phone", "RegistrationDate" },
                values: new object[] { "172345678", new DateTime(2025, 12, 30, 9, 39, 19, 675, DateTimeKind.Utc).AddTicks(4207) });
        }
    }
}
