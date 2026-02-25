using MediaServer.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace MediaServer.Infrastructure.Persistence.Configuration;

public class TvShowConfiguration : IEntityTypeConfiguration<TvShow>
{
    public void Configure(EntityTypeBuilder<TvShow> builder)
    {
        builder.HasKey(t => t.Id);

        builder.HasMany(t => t.Episodes)
            .WithOne(mi => mi.TvShow)
            .HasForeignKey(mi => mi.TvShowId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}