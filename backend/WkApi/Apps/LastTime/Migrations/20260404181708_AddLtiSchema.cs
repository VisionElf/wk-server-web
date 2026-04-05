using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WkApi.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddLtiSchema : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.EnsureSchema(
                name: "lti");

            migrationBuilder.CreateTable(
                name: "tracked_items",
                schema: "lti",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tracked_items", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "item_events",
                schema: "lti",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ItemId = table.Column<Guid>(type: "uuid", nullable: false),
                    OccurredAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_item_events", x => x.Id);
                    table.ForeignKey(
                        name: "FK_item_events_tracked_items_ItemId",
                        column: x => x.ItemId,
                        principalSchema: "lti",
                        principalTable: "tracked_items",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_item_events_ItemId",
                schema: "lti",
                table: "item_events",
                column: "ItemId");

            migrationBuilder.CreateIndex(
                name: "IX_item_events_ItemId_OccurredAtUtc",
                schema: "lti",
                table: "item_events",
                columns: new[] { "ItemId", "OccurredAtUtc" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_item_events_OccurredAtUtc",
                schema: "lti",
                table: "item_events",
                column: "OccurredAtUtc");

            migrationBuilder.CreateIndex(
                name: "IX_tracked_items_Name",
                schema: "lti",
                table: "tracked_items",
                column: "Name");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "item_events",
                schema: "lti");

            migrationBuilder.DropTable(
                name: "tracked_items",
                schema: "lti");
        }
    }
}
