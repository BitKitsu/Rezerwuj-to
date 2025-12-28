using IdentityService.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace IdentityService.Migrations
{
    [DbContext(typeof(ApplicationDbContext))]
    [Migration("20251227193000_RemovePhoneAndAuditLogDeleteBehavior")]
    public partial class RemovePhoneAndAuditLogDeleteBehavior : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                WITH candidates AS (
                    SELECT "Id",
                           regexp_replace("Phone", '[^0-9+]', '', 'g') AS normalized
                    FROM "AspNetUsers"
                    WHERE ("PhoneNumber" IS NULL OR "PhoneNumber" = '')
                      AND "Phone" IS NOT NULL AND "Phone" <> ''
                ),
                unique_candidates AS (
                    SELECT normalized
                    FROM candidates
                    WHERE normalized IS NOT NULL AND normalized <> ''
                    GROUP BY normalized
                    HAVING COUNT(*) = 1
                ),
                final AS (
                    SELECT c."Id", c.normalized
                    FROM candidates c
                    JOIN unique_candidates u ON u.normalized = c.normalized
                    WHERE c.normalized IS NOT NULL AND c.normalized <> ''
                      AND NOT EXISTS (
                        SELECT 1 FROM "AspNetUsers" u2
                        WHERE u2."PhoneNumber" = c.normalized
                          AND u2."Id" <> c."Id"
                      )
                )
                UPDATE "AspNetUsers" u
                SET "PhoneNumber" = final.normalized
                FROM final
                WHERE u."Id" = final."Id";
                """);

            migrationBuilder.DropForeignKey(
                name: "FK_AuditLogs_AspNetUsers_UserId",
                table: "AuditLogs");

            migrationBuilder.AddForeignKey(
                name: "FK_AuditLogs_AspNetUsers_UserId",
                table: "AuditLogs",
                column: "UserId",
                principalTable: "AspNetUsers",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.DropColumn(
                name: "Phone",
                table: "AspNetUsers");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Phone",
                table: "AspNetUsers",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.Sql(
                """
                UPDATE "AspNetUsers"
                SET "Phone" = "PhoneNumber"
                WHERE "Phone" = '' AND "PhoneNumber" IS NOT NULL AND "PhoneNumber" <> '';
                """);

            migrationBuilder.DropForeignKey(
                name: "FK_AuditLogs_AspNetUsers_UserId",
                table: "AuditLogs");

            migrationBuilder.AddForeignKey(
                name: "FK_AuditLogs_AspNetUsers_UserId",
                table: "AuditLogs",
                column: "UserId",
                principalTable: "AspNetUsers",
                principalColumn: "Id");
        }
    }
}
