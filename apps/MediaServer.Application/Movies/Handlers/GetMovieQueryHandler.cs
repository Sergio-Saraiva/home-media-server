using System.Net;
using MediaServer.Application.Common;
using MediaServer.Application.DTOs;
using MediaServer.Application.Interfaces.Repositories;
using MediaServer.Application.Movies.Queries;
using MediatR;
using OperationResult;

namespace MediaServer.Application.Movies.Handlers;

public class GetMovieQueryHandler : IRequestHandler<GetMovieQuery, Result<MovieDto>>
{
    private readonly IMovieRepository _movieRepository;

    public GetMovieQueryHandler(IMovieRepository movieRepository)
    {
        _movieRepository = movieRepository;
    }

    public async Task<Result<MovieDto>> Handle(GetMovieQuery request, CancellationToken cancellationToken)
    {
        try
        {
            var movie = await _movieRepository.GetByIdAsync(request.MovieId);

            if (movie == null)
            {
                throw new ApiErrorException(HttpStatusCode.BadRequest, "Movie not found");
            }

            return Result.Success(new MovieDto
            {
                Description = movie.Description,
                Id = movie.Id,
                PosterPath = movie.PosterPath,
                Title = movie.Title,
                MediaItem = new MediaItemDto
                {
                    Id = movie.MediaItemId,
                    DateAdded = movie.MediaItem.IngestedAt,
                    Title = movie.MediaItem.OriginalFileName
                }
            });
        }
        catch (Exception e)
        {
            return Result.Error<MovieDto>(e);
        }
    }
}