using MediatR;
using OperationResult;

namespace MediaServer.Application.Streaming.Commands;

public class StartHlsStreamCommand : IRequest<Result<string>>
{
    public Guid MediaId { get; set; }
}