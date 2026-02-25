using MediaServer.Domain.Entities;

namespace MediaServer.Application.Interfaces.Repositories;

public interface IMediaProfileRepository
{
    Task<List<MediaProfile>> GetMediaProfilesByMediaIdAsync(Guid mediaId);
}