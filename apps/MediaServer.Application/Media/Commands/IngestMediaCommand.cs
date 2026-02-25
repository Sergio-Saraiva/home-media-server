using MediaServer.Application.Media.Responses;
using MediatR;
using OperationResult;

namespace MediaServer.Application.Media.Commands;

public class IngestMediaCommand : IRequest<Result<IngestMediaResponse>>
{
    public string Title { get; set; } = string.Empty;
    public string FilePath { get; set; } = string.Empty;
}