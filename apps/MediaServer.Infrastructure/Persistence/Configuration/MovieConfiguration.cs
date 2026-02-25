using MediaServer.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace MediaServer.Infrastructure.Persistence.Configuration;

public class MovieConfiguration : IEntityTypeConfiguration<Movie>
{
    public void Configure(EntityTypeBuilder<Movie> builder)
    {
        builder.HasKey(m => m.Id);

        builder.HasOne(m => m.MediaItem)
            .WithOne(mi => mi.Movie)
            .HasForeignKey<Movie>(m => m.MediaItemId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}