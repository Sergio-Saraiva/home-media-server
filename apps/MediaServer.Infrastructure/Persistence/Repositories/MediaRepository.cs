using MediaServer.Application.Interfaces.Repositories;
using MediaServer.Domain.Entities;
using MediaServer.Infrastructure.Persistence.Context;
using Microsoft.EntityFrameworkCore;

namespace MediaServer.Infrastructure.Persistence.Repositories;

public class MediaRepository : IMediaRepository
{
    private readonly MediaDbContext _context;
    
    public MediaRepository(MediaDbContext context)
    {
        _context = context;
    }
    
    public async Task<MediaItem> AddMediaAsync(MediaItem mediaItem)
    {
        _context.MediaItems.Add(mediaItem);
        return mediaItem;
    }

    public async Task<bool> ExistsByPathAsync(string filePath)
    {
        return await _context.MediaItems.AnyAsync(m => m.FilePath == filePath);
    }

    public async Task<List<MediaItem>> GetAllMediaItemsAsync()
    {
        return await _context.MediaItems.ToListAsync();
    }

    public async Task<MediaItem?> GetByIdAsync(Guid id)
    {
        return await _context.MediaItems.Include(x => x.Subtitles).FirstOrDefaultAsync(x => x.Id == id);
    }
}