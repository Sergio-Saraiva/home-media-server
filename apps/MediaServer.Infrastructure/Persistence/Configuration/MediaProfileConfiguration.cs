using MediaServer.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace MediaServer.Infrastructure.Persistence.Configuration;

public class MediaProfileConfiguration : IEntityTypeConfiguration<MediaProfile>
{
    public void Configure(EntityTypeBuilder<MediaProfile> builder)
    {
        builder.HasKey(p => p.Id);
    }
}