using MediaServer.Application.DTOs;
using MediatR;
using OperationResult;

namespace MediaServer.Application.TvShows.Commands;

public class UpdateTvShowCommand : IRequest<Result<TvShowDto>>
{
    public Guid TvShowId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? PosterPath { get; set; }
    public IList<Guid>? EpisodeIds { get; set; }
}
