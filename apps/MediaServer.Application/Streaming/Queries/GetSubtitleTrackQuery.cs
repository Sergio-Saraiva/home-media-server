using MediatR;
using OperationResult;

namespace MediaServer.Application.Streaming.Queries;

public class GetSubtitleTrackQuery : IRequest<Result<string>>
{
    public Guid SubtitleId { get; set; }
}