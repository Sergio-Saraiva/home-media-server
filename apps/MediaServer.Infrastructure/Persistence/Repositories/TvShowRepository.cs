using MediaServer.Application.Interfaces.Repositories;
using MediaServer.Domain.Entities;
using MediaServer.Infrastructure.Persistence.Context;
using Microsoft.EntityFrameworkCore;

namespace MediaServer.Infrastructure.Persistence.Repositories;

public class TvShowRepository : ITvShowRepository
{
    private readonly MediaDbContext _dbContext;

    public TvShowRepository(MediaDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<TvShow?> GetByIdAsync(Guid id)
    {
        return await _dbContext.TvShows.Include(x => x.Episodes).FirstOrDefaultAsync(x => x.Id == id);
    }

    public async Task<TvShow> AddTvShowAsync(TvShow tvShow)
    {
        await _dbContext.TvShows.AddAsync(tvShow);
        return tvShow;
    }

    public async Task<List<TvShow>> GetAllTvShowsAsync()
    {
        return await _dbContext.TvShows.ToListAsync();
    }
}