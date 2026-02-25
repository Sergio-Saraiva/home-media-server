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
            {
                throw new ApiErrorException(HttpStatusCode.BadRequest, "Media item not found");
            }
            
            var movie = await _movieRepository.AddMovieAsync(new Movie
            {
                MediaItem = mediaItemExists,
                MediaItemId = request.MediaItemId,
                Id = Guid.CreateVersion7(),
                Title = request.Title,
                CreatedAt = DateTime.UtcNow,
                Description = request.Description,
                PosterPath = ""
            });

            await _unitOfWork.SaveChangesAsync(cancellationToken);
            return Result.Success(new MovieDto
            {
                PosterPath = movie.PosterPath,
                Title = movie.Title,
                Description = movie.Description,
            });
        }
        catch (Exception e)
        {
            return Result.Error<MovieDto>(e);
        }
    }
}