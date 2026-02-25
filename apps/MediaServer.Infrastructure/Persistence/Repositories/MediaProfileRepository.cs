using MediaServer.Application.Interfaces.Repositories;
using MediaServer.Domain.Entities;
using MediaServer.Infrastructure.Persistence.Context;
using Microsoft.EntityFrameworkCore;

namespace MediaServer.Infrastructure.Persistence.Repositories;

public class MediaProfileRepository : IMediaProfileRepository
{
    private readonly MediaDbContext _context;
    
    public MediaProfileRepository(MediaDbContext context)
    {
        _context = context;
    }
    
    public async Task<List<MediaProfile>> GetMediaProfilesByMediaIdAsync(Guid mediaId)
    {
        return await _context.MediaProfiles.Where(m => m.MediaItemId == mediaId).ToListAsync();
    }
}