using MediaServer.Application.Interfaces.Repositories;
using MediaServer.Domain.Entities;
using MediaServer.Infrastructure.Persistence.Context;
using Microsoft.EntityFrameworkCore;

namespace MediaServer.Infrastructure.Persistence.Repositories;

public class SubtitleRepository : ISubtitleRepository
{
    private readonly MediaDbContext _context;

    public SubtitleRepository(MediaDbContext context)
    {
        _context = context;
    }

    public async Task<SubtitleTrack> AddSubtitleAsync(SubtitleTrack subtitle)
    {
        await _context.SubtitleTracks.AddAsync(subtitle);
        return subtitle;
    }

    public async Task<List<SubtitleTrack>> GetSubtitlesByMediaIdAsync(Guid mediaId)
    {
        return await _context.SubtitleTracks.Where(s => s.MediaItemId == mediaId).ToListAsync();
    }

    public async Task<SubtitleTrack?> GetByIdAsync(Guid id)
    {
        return await _context.SubtitleTracks.FirstOrDefaultAsync(x => x.Id == id);
    }
}