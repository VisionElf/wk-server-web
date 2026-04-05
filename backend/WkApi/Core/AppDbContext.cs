using System.Reflection;
using Microsoft.EntityFrameworkCore;
using WkApi.Apps.LastTime.Entities;
using WkApi.Apps.Health.Entities;

namespace WkApi.Core.Data;

/// <summary>
/// Single EF Core database session for this API (PostgreSQL). Not a plugin: it maps C# entities to tables
/// and is required as long as the API uses Entity Framework. Table mapping for each app lives with that app
/// (e.g. <see cref="LtiItemConfiguration"/>); this class only exposes <see cref="DbSet{TEntity}"/> properties
/// and applies those configurations. Schema changes are tracked as <c>Migrations/*</c> (see Program.cs).
/// </summary>
public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<LtiItem> LtiItems => Set<LtiItem>();
    public DbSet<LtiItemEvent> LtiItemEvents => Set<LtiItemEvent>();

    public DbSet<WeightInfo> WeightInfos => Set<WeightInfo>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(Assembly.GetExecutingAssembly());
    }
}
