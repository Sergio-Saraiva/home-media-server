using MediatR;
using OperationResult;

namespace MediaServer.Application.Streaming.Queries;

public class GetDynamicMasterPlaylistQuery : IRequest<Result<string>>
{
    public Guid MediaId { get; set; }
}