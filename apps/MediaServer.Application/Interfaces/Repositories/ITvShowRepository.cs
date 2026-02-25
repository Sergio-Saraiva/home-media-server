using MediaServer.Domain.Entities;

namespace MediaServer.Application.Interfaces.Repositories;

public interface ITvShowRepository
{
    Task<TvShow?> GetByIdAsync(Guid id);
    Task<TvShow> AddTvShowAsync(TvShow tvShow);
    Task<List<TvShow>> GetAllTvShowsAsync();
}