using Microsoft.EntityFrameworkCore;
using WkApi.Apps.LastTime.Entities;
using WkApi.Data;

namespace WkApi.Apps.LastTime;

public static class LtiDbSeeder
{
    private static readonly string[] DefaultNames =
    [
        "Bed Sheets",
        "Bath Towel",
        "Kitchen Sponge",
        "Bathroom Sponge",
        "Kitchen Towels",
    ];

    public static async Task SeedDefaultsAsync(AppDbContext db, CancellationToken ct = default)
    {
        if (await db.LtiItems.AnyAsync(ct)) {
            return;
        }

        var now = DateTime.UtcNow;
        foreach (var name in DefaultNames) {
            db.LtiItems.Add(new LtiItem {
                Id = Guid.NewGuid(),
                Name = name,
                CreatedAtUtc = now,
            });
        }

        await db.SaveChangesAsync(ct);
    }
}
