using MediaServer.Domain.Entities;

namespace MediaServer.Application.Interfaces.Repositories;

public interface IMovieRepository
{
    Task<Movie?> GetByIdAsync(Guid id);
    Task<List<Movie>> GetAllMoviesAsync();
    Task<Movie> AddMovieAsync(Movie movie);
}