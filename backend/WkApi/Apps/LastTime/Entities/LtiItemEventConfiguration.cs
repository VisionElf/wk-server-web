using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace WkApi.Apps.LastTime.Entities;

public class LtiItemEventConfiguration : IEntityTypeConfiguration<LtiItemEvent>
{
    public void Configure(EntityTypeBuilder<LtiItemEvent> e)
    {
        const string schema = "lti";

        e.ToTable("item_events", schema);
        e.HasKey(x => x.Id);
        e.HasOne(x => x.Item)
            .WithMany(x => x.Events)
            .HasForeignKey(x => x.ItemId)
            .OnDelete(DeleteBehavior.Cascade);
        e.HasIndex(x => x.ItemId);
        e.HasIndex(x => x.OccurredAtUtc);
        e.HasIndex(x => new { x.ItemId, x.OccurredAtUtc }).IsUnique();
    }
}
