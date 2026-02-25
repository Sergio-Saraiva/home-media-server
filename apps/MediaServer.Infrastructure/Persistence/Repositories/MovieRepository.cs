using MediaServer.Application.Interfaces.Repositories;
using MediaServer.Domain.Entities;
using MediaServer.Infrastructure.Persistence.Context;
using Microsoft.EntityFrameworkCore;

namespace MediaServer.Infrastructure.Persistence.Repositories;

public class MovieRepository : IMovieRepository
{
    private readonly MediaDbContext _context;

    public MovieRepository(MediaDbContext context)
    {
        _context = context;
    }

    public async Task<Movie?> GetByIdAsync(Guid id)
    {
        return await _context.Movies.Include(x => x.MediaItem).FirstOrDefaultAsync(m => m.Id == id);
    }

    public async Task<Movie?> GetByMediaItemIdAsync(Guid mediaItemId)
    {
        return await _context.Movies.FirstOrDefaultAsync(m => m.MediaItemId == mediaItemId);
    }

    public async Task<List<Movie>> GetAllMoviesAsync()
    {
        return await _context.Movies.ToListAsync();
    }

    public async Task<Movie> AddMovieAsync(Movie movie)
    {
        await _context.Movies.AddAsync(movie);
        return movie;
    }

    public Task DeleteAsync(Movie movie)
    {
        _context.Movies.Remove(movie);
        return Task.CompletedTask;
    }
}