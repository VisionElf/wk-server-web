using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WkApi.Apps.Daylog.Migrations
{
    /// <inheritdoc />
    public partial class AddDaylogEventTypeDefinitions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "DaylogEventTypeDefinitions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Code = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    Label = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    BackgroundColor = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    TextColor = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: true),
                    SortOrder = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DaylogEventTypeDefinitions", x => x.Id);
                    table.UniqueConstraint("AK_DaylogEventTypeDefinitions_Code", x => x.Code);
                });

            migrationBuilder.CreateIndex(
                name: "IX_DaylogEvents_EventType",
                table: "DaylogEvents",
                column: "EventType");

            migrationBuilder.CreateIndex(
                name: "IX_DaylogEventTypeDefinitions_Code",
                table: "DaylogEventTypeDefinitions",
                column: "Code",
                unique: true);

            // Required before FK: existing DaylogEvents rows must reference these codes.
            migrationBuilder.InsertData(
                table: "DaylogEventTypeDefinitions",
                columns: new[] { "Id", "Code", "Label", "BackgroundColor", "TextColor", "SortOrder" },
                values: new object[,]
                {
                    { new Guid("a0000000-0000-4000-8000-000000000001"), "sleep_start", "Sleep start", "#0000aa", "#eeeeee", 0 },
                    { new Guid("a0000000-0000-4000-8000-000000000002"), "sleep_end", "Sleep end", "#0000aa", "#eeeeee", 1 },
                    { new Guid("a0000000-0000-4000-8000-000000000003"), "workout", "Workout", "#ff5500", "#eeeeee", 2 },
                    { new Guid("a0000000-0000-4000-8000-000000000004"), "appointment", "Appointment", "#006600", "#eeeeee", 3 },
                    { new Guid("a0000000-0000-4000-8000-000000000005"), "chore", "Chore", "#005599", "#eeeeee", 4 },
                    { new Guid("a0000000-0000-4000-8000-000000000006"), "social", "Social", "#aa0000", "#eeeeee", 5 },
                    { new Guid("a0000000-0000-4000-8000-000000000007"), "custom", "Custom", "#995500", "#eeeeee", 6 },
                });

            migrationBuilder.AddForeignKey(
                name: "FK_DaylogEvents_DaylogEventTypeDefinitions_EventType",
                table: "DaylogEvents",
                column: "EventType",
                principalTable: "DaylogEventTypeDefinitions",
                principalColumn: "Code",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_DaylogEvents_DaylogEventTypeDefinitions_EventType",
                table: "DaylogEvents");

            migrationBuilder.DropTable(
                name: "DaylogEventTypeDefinitions");

            migrationBuilder.DropIndex(
                name: "IX_DaylogEvents_EventType",
                table: "DaylogEvents");
        }
    }
}
