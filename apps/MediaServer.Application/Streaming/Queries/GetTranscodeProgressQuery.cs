using MediaServer.Application.DTOs;
using MediatR;
using OperationResult;

namespace MediaServer.Application.Streaming.Queries;

public class GetTranscodeProgressQuery : IRequest<Result<TranscodeStatus>>
{
    public Guid MediaId { get; set; }
}