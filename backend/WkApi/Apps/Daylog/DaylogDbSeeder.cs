using Microsoft.EntityFrameworkCore;
using WkApi.Apps.Daylog.Entities;
using WkApi.Core.Data;

namespace WkApi.Apps.Daylog;

/// <summary>Seeds default event types when the table is empty (e.g. new database).</summary>
public static class DaylogDbSeeder
{
    public static async Task EnsureDefaultsAsync(AppDbContext db, CancellationToken ct = default)
    {
        if (await db.DaylogEventTypeDefinitions.AnyAsync(ct)) {
            return;
        }

        var order = 0;
        foreach (var row in DefaultRows()) {
            row.SortOrder = order++;
            db.DaylogEventTypeDefinitions.Add(row);
        }

        await db.SaveChangesAsync(ct);
    }

    private static IEnumerable<DaylogEventTypeDefinition> DefaultRows()
    {
        yield return Row("a0000000-0000-4000-8000-000000000001", "sleep_start", "Sleep start", "#0000aa", "#eeeeee");
        yield return Row("a0000000-0000-4000-8000-000000000002", "sleep_end", "Sleep end", "#0000aa", "#eeeeee");
        yield return Row("a0000000-0000-4000-8000-000000000003", "workout", "Workout", "#ff5500", "#eeeeee");
        yield return Row("a0000000-0000-4000-8000-000000000004", "appointment", "Appointment", "#006600", "#eeeeee");
        yield return Row("a0000000-0000-4000-8000-000000000005", "chore", "Chore", "#005599", "#eeeeee");
        yield return Row("a0000000-0000-4000-8000-000000000006", "social", "Social", "#aa0000", "#eeeeee");
        yield return Row("a0000000-0000-4000-8000-000000000007", "custom", "Custom", "#995500", "#eeeeee");
    }

    private static DaylogEventTypeDefinition Row(string id, string code, string label, string bg, string? text) =>
        new() {
            Id = Guid.Parse(id),
            Code = code,
            Label = label,
            BackgroundColor = bg,
            TextColor = text,
            SortOrder = 0,
        };
}
