using MediaServer.Application.DTOs;
using MediatR;
using OperationResult;

namespace MediaServer.Application.TvShows.Commands;

public class ReorderTvShowEpisodesCommand : IRequest<Result<TvShowDto>>
{
    public Guid TvShowId { get; set; }
    public IList<Guid> EpisodeIds { get; set; } = new List<Guid>();
}
