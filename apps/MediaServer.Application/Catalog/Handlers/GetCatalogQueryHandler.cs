using MediaServer.Application.Catalog.Queries;
using MediaServer.Application.DTOs;
using MediaServer.Application.Interfaces.Repositories;
using MediaServer.Domain.Entities;
using MediaServer.Domain.Enums;
using MediatR;
using OperationResult;

namespace MediaServer.Application.Catalog.Handlers;

public class GetCatalogQueryHandler : IRequestHandler<GetCatalogQuery, Result<List<CatalogItemDTO>>>
{
    public GetCatalogQueryHandler(IMediaRepository mediaRepository, ITvShowRepository tvShowRepository, IMovieRepository movieRepository)
    {
        _mediaRepository = mediaRepository;
        _tvShowRepository = tvShowRepository;
        _movieRepository = movieRepository;
    }

    private readonly IMediaRepository _mediaRepository;
    private readonly ITvShowRepository _tvShowRepository;
    private readonly IMovieRepository _movieRepository;

    public async Task<Result<List<CatalogItemDTO>>> Handle(GetCatalogQuery request, CancellationToken cancellationToken)
    {
        try
        {
            var catalog = new List<CatalogItemDTO>();
            var movies = await _movieRepository.GetAllMoviesAsync();
            var shows = await _tvShowRepository.GetAllTvShowsAsync();
            
            catalog.AddRange(movies.Select(m => new CatalogItemDTO{ 
                Id = m.Id,
                Title = m.Title, 
                Type = "Movie", 
                PosterPath = m.PosterPath,
                DateAdded = m.CreatedAt
            }));
            
            catalog.AddRange(shows.Select(s => new CatalogItemDTO
            {
                Id = s.Id, 
                Title = s.Title, 
                Type = "Show", 
                PosterPath = s.PosterPath, 
                DateAdded = s.CreatedAt
            }));

            return Result.Success(catalog);
        }
        catch (Exception ex)
        {
            return Result.Error<List<CatalogItemDTO>>(ex);
        }
    }
}