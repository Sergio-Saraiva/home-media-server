using System.Net;
using MediaServer.Application.Common;
using MediaServer.Application.DTOs;
using MediaServer.Application.Interfaces.Repositories;
using MediaServer.Application.TvShows.Commands;
using MediaServer.Domain.Entities;
using MediatR;
using OperationResult;

namespace MediaServer.Application.TvShows.Handlers;

public class UpdateTvShowCommandHandler : IRequestHandler<UpdateTvShowCommand, Result<TvShowDto>>
{
    private readonly ITvShowRepository _tvShowRepository;
    private readonly IMediaRepository _mediaRepository;
    private readonly IUnitOfWork _unitOfWork;

    public UpdateTvShowCommandHandler(
        ITvShowRepository tvShowRepository,
        IMediaRepository mediaRepository,
        IUnitOfWork unitOfWork)
    {
        _tvShowRepository = tvShowRepository;
        _mediaRepository = mediaRepository;
        _unitOfWork = unitOfWork;
    }

    public async Task<Result<TvShowDto>> Handle(UpdateTvShowCommand request, CancellationToken cancellationToken)
    {
        try
        {
            var tvShow = await _tvShowRepository.GetByIdAsync(request.TvShowId);
            if (tvShow == null)
                throw new ApiErrorException(HttpStatusCode.NotFound, "TV show not found");

            tvShow.Title = request.Title;
            tvShow.Description = request.Description;
            tvShow.PosterPath = request.PosterPath;

            var newIds = request.EpisodeIds ?? new List<Guid>();
            var newIdSet = newIds.ToHashSet();

            // Unlink episodes that are no longer in the list
            foreach (var ep in tvShow.Episodes.Where(e => !newIdSet.Contains(e.Id)).ToList())
                ep.UnlinkFromShow();

            // Resolve each requested episode in order
            var currentMap = tvShow.Episodes.ToDictionary(e => e.Id);
            var resolvedEpisodes = new List<MediaItem>();
            foreach (var episodeId in newIds)
            {
                if (currentMap.TryGetValue(episodeId, out var existing))
                {
                    resolvedEpisodes.Add(existing);
                }
                else
                {
                    var media = await _mediaRepository.GetByIdAsync(episodeId);
                    if (media == null)
                        throw new ApiErrorException(HttpStatusCode.BadRequest, $"Media with id '{episodeId}' not found");
                    resolvedEpisodes.Add(media);
                }
            }

            // Assign episode numbers in order
            for (int i = 0; i < resolvedEpisodes.Count; i++)
                resolvedEpisodes[i].LinkToShow(tvShow.Id, season: 1, episode: i + 1);

            await _unitOfWork.SaveChangesAsync(cancellationToken);

            return Result.Success(new TvShowDto
            {
                Id = tvShow.Id,
                Title = tvShow.Title,
                Description = tvShow.Description,
                PosterPath = tvShow.PosterPath,
                CreatedAt = tvShow.CreatedAt,
                Episodes = resolvedEpisodes.Select((ep, i) => new MediaItemDto
                {
                    Id = ep.Id,
                    Title = ep.OriginalFileName,
                    DateAdded = ep.IngestedAt,
                    EpisodeNumber = i + 1,
                    SeasonNumber = 1
                }).ToList()
            });
        }
        catch (Exception e)
        {
            return Result.Error<TvShowDto>(e);
        }
    }
}
