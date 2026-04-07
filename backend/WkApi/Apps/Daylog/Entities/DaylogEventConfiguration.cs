using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace WkApi.Apps.Daylog.Entities;

public class DaylogEventConfiguration : IEntityTypeConfiguration<DaylogEvent>
{
    public void Configure(EntityTypeBuilder<DaylogEvent> builder)
    {
        builder.ToTable("DaylogEvents");
        builder.HasKey(e => e.Id);
        builder.Property(e => e.EventType).HasMaxLength(64).IsRequired();
        builder.Property(e => e.CustomText).HasMaxLength(4000);
    }
}
