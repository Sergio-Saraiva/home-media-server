using System.Net;
using MediaServer.Application.Common;
using MediaServer.Application.DTOs;
using MediaServer.Application.Interfaces.Repositories;
using MediaServer.Application.Movies.Commands;
using MediaServer.Domain.Entities;
using MediatR;
using OperationResult;

namespace MediaServer.Application.Movies.Handlers;

public class CreateMovieCommandHandler : IRequestHandler<CreateMovieCommand, Result<MovieDto>>
{
    private readonly IMovieRepository _movieRepository;
    private readonly IMediaRepository _mediaRepository;
    private readonly IUnitOfWork _unitOfWork;
    
    public CreateMovieCommandHandler(IMovieRepository movieRepository, IUnitOfWork unitOfWork, IMediaRepository mediaRepository)
    {
        _movieRepository = movieRepository;
        _mediaRepository = mediaRepository;
        _unitOfWork = unitOfWork;
    }
    
    public async Task<Result<MovieDto>> Handle(CreateMovieCommand request, CancellationToken cancellationToken)
    {
        try
        {
            var mediaItemExists = await _mediaRepository.GetByIdAsync(request.MediaItemId);
            if (mediaItemExists == null)
                throw new ApiErrorException(HttpStatusCode.BadRequest, "Media item not found");

            var existing = await _movieRepository.GetByMediaItemIdAsync(request.MediaItemId);
            if (existing != null)
                throw new ApiErrorException(HttpStatusCode.Conflict, "This media file is already linked to a movie");

            var movie = await _movieRepository.AddMovieAsync(new Movie
            {
                Id = Guid.CreateVersion7(),
                MediaItem = mediaItemExists,
                MediaItemId = request.MediaItemId,
                Title = request.Title,
                CreatedAt = DateTime.UtcNow,
                Description = request.Description,
                PosterPath = request.PosterPath
            });

            await _unitOfWork.SaveChangesAsync(cancellationToken);
            return Result.Success(new MovieDto
            {
                Id = movie.Id,
                Title = movie.Title,
                Description = movie.Description,
                PosterPath = movie.PosterPath,
            });
        }
        catch (Exception e)
        {
            return Result.Error<MovieDto>(e);
        }
    }
}