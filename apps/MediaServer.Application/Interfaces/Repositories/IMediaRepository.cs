using MediaServer.Domain.Entities;

namespace MediaServer.Application.Interfaces.Repositories;

public interface IMediaRepository
{
    Task<MediaItem> AddMediaAsync(MediaItem mediaItem);
    Task<bool> ExistsByPathAsync(string filePath);
    Task<MediaItem?> GetByPathAsync(string filePath);
    Task<List<MediaItem>> GetAllMediaItemsAsync();
    Task<MediaItem?> GetByIdAsync(Guid id);
}