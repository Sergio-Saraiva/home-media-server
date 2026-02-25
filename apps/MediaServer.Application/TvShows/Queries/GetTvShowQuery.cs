using MediaServer.Application.DTOs;
using MediatR;
using OperationResult;

namespace MediaServer.Application.TvShows.Queries;

public class GetTvShowQuery : IRequest<Result<TvShowDto>>
{
    public Guid TvShowId { get; set; }
}