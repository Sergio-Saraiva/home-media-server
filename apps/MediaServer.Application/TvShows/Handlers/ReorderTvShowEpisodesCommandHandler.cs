using System.Net;
using MediaServer.Application.Common;
using MediaServer.Application.DTOs;
using MediaServer.Application.Interfaces.Repositories;
using MediaServer.Application.TvShows.Commands;
using MediatR;
using OperationResult;

namespace MediaServer.Application.TvShows.Handlers;

public class ReorderTvShowEpisodesCommandHandler : IRequestHandler<ReorderTvShowEpisodesCommand, Result<TvShowDto>>
{
    private readonly ITvShowRepository _tvShowRepository;
    private readonly IUnitOfWork _unitOfWork;

    public ReorderTvShowEpisodesCommandHandler(ITvShowRepository tvShowRepository, IUnitOfWork unitOfWork)
    {
        _tvShowRepository = tvShowRepository;
        _unitOfWork = unitOfWork;
    }

    public async Task<Result<TvShowDto>> Handle(ReorderTvShowEpisodesCommand request, CancellationToken cancellationToken)
    {
        try
        {
            var tvShow = await _tvShowRepository.GetByIdAsync(request.TvShowId);
            if (tvShow == null)
                throw new ApiErrorException(HttpStatusCode.NotFound, "TV show not found");

            var showEpisodeIds = tvShow.Episodes.Select(e => e.Id).ToHashSet();
            if (request.EpisodeIds.Count != tvShow.Episodes.Count || !request.EpisodeIds.All(id => showEpisodeIds.Contains(id)))
                throw new ApiErrorException(HttpStatusCode.BadRequest, "Episode IDs must exactly match all episodes of this show");

            var episodeMap = tvShow.Episodes.ToDictionary(e => e.Id);
            for (int i = 0; i < request.EpisodeIds.Count; i++)
            {
                var ep = episodeMap[request.EpisodeIds[i]];
                ep.LinkToShow(tvShow.Id, ep.SeasonNumber ?? 1, i + 1);
            }

            await _unitOfWork.SaveChangesAsync(cancellationToken);

            return Result.Success(new TvShowDto
            {
                Id = tvShow.Id,
                Title = tvShow.Title,
                Description = tvShow.Description,
                PosterPath = tvShow.PosterPath,
                CreatedAt = tvShow.CreatedAt,
                Episodes = tvShow.Episodes.OrderBy(ep => ep.EpisodeNumber).Select(ep => new MediaItemDto
                {
                    Id = ep.Id,
                    Title = ep.OriginalFileName,
                    DateAdded = ep.IngestedAt,
                    EpisodeNumber = ep.EpisodeNumber,
                    SeasonNumber = ep.SeasonNumber
                }).ToList()
            });
        }
        catch (Exception e)
        {
            return Result.Error<TvShowDto>(e);
        }
    }
}
