using MediaServer.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace MediaServer.Infrastructure.Persistence.Configuration;

public class MediaItemConfiguration : IEntityTypeConfiguration<MediaItem>
{
    public void Configure(EntityTypeBuilder<MediaItem> builder)
    {
        builder.HasKey(m => m.Id);
        builder.HasMany(m => m.Profiles)
            .WithOne()
            .HasForeignKey(p => p.MediaItemId)
            .OnDelete(DeleteBehavior.Cascade);
        builder.HasMany(m => m.Subtitles)
            .WithOne()
            .HasForeignKey(s => s.MediaItemId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}