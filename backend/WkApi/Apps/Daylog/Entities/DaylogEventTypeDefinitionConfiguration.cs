using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace WkApi.Apps.Daylog.Entities;

public class DaylogEventTypeDefinitionConfiguration : IEntityTypeConfiguration<DaylogEventTypeDefinition>
{
    public void Configure(EntityTypeBuilder<DaylogEventTypeDefinition> builder)
    {
        builder.ToTable("DaylogEventTypeDefinitions");
        builder.HasKey(e => e.Id);
        builder.HasIndex(e => e.Code).IsUnique();
        builder.Property(e => e.Code).HasMaxLength(64).IsRequired();
        builder.Property(e => e.Label).HasMaxLength(200).IsRequired();
        builder.Property(e => e.BackgroundColor).HasMaxLength(32).IsRequired();
        builder.Property(e => e.TextColor).HasMaxLength(32);
    }
}
