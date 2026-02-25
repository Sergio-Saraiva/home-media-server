using MediatR;
using OperationResult;

namespace MediaServer.Application.Movies.Commands;

public class DeleteMovieCommand : IRequest<Result<bool>>
{
    public Guid MovieId { get; set; }
}
