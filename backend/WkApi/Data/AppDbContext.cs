using Microsoft.EntityFrameworkCore;
using WkApi.Data.Lti;

namespace WkApi.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<LtiItem> LtiItems => Set<LtiItem>();
    public DbSet<LtiItemEvent> LtiItemEvents => Set<LtiItemEvent>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        const string schema = "lti";

        modelBuilder.Entity<LtiItem>(e => {
            e.ToTable("tracked_items", schema);
            e.HasKey(x => x.Id);
            e.Property(x => x.Name).HasMaxLength(200).IsRequired();
            e.HasIndex(x => x.Name);
        });

        modelBuilder.Entity<LtiItemEvent>(e => {
            e.ToTable("item_events", schema);
            e.HasKey(x => x.Id);
            e.HasOne(x => x.Item)
                .WithMany(x => x.Events)
                .HasForeignKey(x => x.ItemId)
                .OnDelete(DeleteBehavior.Cascade);
            e.HasIndex(x => x.ItemId);
            e.HasIndex(x => x.OccurredAtUtc);
            e.HasIndex(x => new { x.ItemId, x.OccurredAtUtc }).IsUnique();
        });
    }
}
