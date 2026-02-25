using System.Net;
using MediaServer.Application.Common;
using MediaServer.Application.DTOs;
using MediaServer.Application.Interfaces.Repositories;
using MediaServer.Application.TvShows.Commands;
using MediaServer.Domain.Entities;
using MediatR;
using OperationResult;

namespace MediaServer.Application.TvShows.Handlers;

public class CreateTvShowCommandHandler : IRequestHandler<CreateTvShowCommand, Result<TvShowDto>>
{
    public CreateTvShowCommandHandler(ITvShowRepository tvShowRepository, IUnitOfWork unitOfWork, IMediaRepository mediaRepository)
    {
        _tvShowRepository = tvShowRepository;
        _unitOfWork = unitOfWork;
        _mediaRepository = mediaRepository;
    }

    private readonly ITvShowRepository _tvShowRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IMediaRepository _mediaRepository;
    
    public async Task<Result<TvShowDto>> Handle(CreateTvShowCommand request, CancellationToken cancellationToken)
    {
        try
        {
            var episodes = new List<MediaItem>();
            foreach (var episodeId in request.Episodes)
            {
                var episodeExists = await _mediaRepository.GetByIdAsync(episodeId);
                if(episodeExists == null)
                {
                    throw new ApiErrorException(HttpStatusCode.BadRequest, $"Media with id '{episodeId}' not found");
                }
                episodes.Add(episodeExists);
            }

            if (episodes.Count == 0)
            {
                throw new ApiErrorException(HttpStatusCode.BadRequest, "No episodes provided for TV show creation");
            }

            var showId = Guid.CreateVersion7();
            for (int i = 0; i < episodes.Count; i++)
                episodes[i].LinkToShow(showId, season: 1, episode: i + 1);

            var tvShow = await _tvShowRepository.AddTvShowAsync(new TvShow
            {
                Id = showId,
                PosterPath = request.PosterPath,
                Title = request.Title,
                Episodes = episodes,
                Description = request.Description,
                CreatedAt = DateTime.UtcNow
            });
            
            await _unitOfWork.SaveChangesAsync(cancellationToken);

            return Result.Success(new TvShowDto
            {
                PosterPath = tvShow.PosterPath,
                Title = tvShow.Title,
                Description = tvShow.Description,
                CreatedAt = tvShow.CreatedAt,
                Id = tvShow.Id,
                Episodes = tvShow.Episodes.OrderBy(e => e.EpisodeNumber).Select(e => new MediaItemDto
                {
                    Id = e.Id,
                    Title = e.OriginalFileName,
                    DateAdded = e.IngestedAt,
                    EpisodeNumber = e.EpisodeNumber,
                    SeasonNumber = e.SeasonNumber
                }).ToList()
            });
        }catch(Exception e)
        {
            return Result.Error<TvShowDto>(e);
        }
    }
}