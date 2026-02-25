using MediaServer.Domain.Entities;

namespace MediaServer.Application.Interfaces.Repositories;

public interface ISubtitleRepository
{
    Task<SubtitleTrack> AddSubtitleAsync(SubtitleTrack subtitle);
    Task<List<SubtitleTrack>> GetSubtitlesByMediaIdAsync(Guid mediaId);
    Task<SubtitleTrack?> GetByIdAsync(Guid id);
}