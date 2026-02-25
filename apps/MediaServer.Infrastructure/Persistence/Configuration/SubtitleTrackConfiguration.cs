using MediaServer.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace MediaServer.Infrastructure.Persistence.Configuration;

public class SubtitleTrackConfiguration : IEntityTypeConfiguration<SubtitleTrack>
{
    public void Configure(EntityTypeBuilder<SubtitleTrack> builder)
    {
        builder.HasKey(s => s.Id);
    }
}