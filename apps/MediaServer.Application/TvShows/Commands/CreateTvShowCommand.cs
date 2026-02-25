using MediaServer.Application.DTOs;
using MediatR;
using OperationResult;

namespace MediaServer.Application.TvShows.Commands;

public class CreateTvShowCommand : IRequest<Result<TvShowDto>>
{
    public string Title { get; set; }
    public string Description { get; set; } = string.Empty;
    public string PosterPath { get; set; } = string.Empty;
    public IList<Guid> Episodes { get; set; } = new List<Guid>();
}