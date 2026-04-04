using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace WkApi.Apps.LastTime.Entities;

public class LtiItemConfiguration : IEntityTypeConfiguration<LtiItem>
{
    public void Configure(EntityTypeBuilder<LtiItem> e)
    {
        const string schema = "lti";

        e.ToTable("tracked_items", schema);
        e.HasKey(x => x.Id);
        e.Property(x => x.Name).HasMaxLength(200).IsRequired();
        e.HasIndex(x => x.Name);
    }
}
