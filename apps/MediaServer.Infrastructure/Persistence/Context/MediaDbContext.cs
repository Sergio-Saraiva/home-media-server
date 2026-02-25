using System.Reflection;
using MediaServer.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace MediaServer.Infrastructure.Persistence.Context;

public class MediaDbContext : DbContext
{
    public MediaDbContext(DbContextOptions<MediaDbContext> options) : base(options)
    {
    }
    
    public DbSet<MediaItem> MediaItems { get; set; }
    public DbSet<MediaProfile> MediaProfiles { get; set; }
    public DbSet<SubtitleTrack> SubtitleTracks { get; set; }
    public DbSet<Movie> Movies { get; set; }
    public DbSet<TvShow> TvShows { get; set; }
    
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(Assembly.GetExecutingAssembly());
        base.OnModelCreating(modelBuilder);
    }
}