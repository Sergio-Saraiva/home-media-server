using MediatR;
using OperationResult;

namespace MediaServer.Application.TvShows.Commands;

public class DeleteTvShowCommand : IRequest<Result<bool>>
{
    public Guid TvShowId { get; set; }
}
