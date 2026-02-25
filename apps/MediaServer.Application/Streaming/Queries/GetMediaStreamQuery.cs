using MediatR;
using OperationResult;

namespace MediaServer.Application.Streaming.Queries;

public record GetMediaStreamQuery(Guid MediaId) : IRequest<Result<MediaStreamResult>>;

public record MediaStreamResult(string FilePath, string ContentType);