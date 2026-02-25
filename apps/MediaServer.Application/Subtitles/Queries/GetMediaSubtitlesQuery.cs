using MediaServer.Application.DTOs;
using MediatR;
using OperationResult;

namespace MediaServer.Application.Subtitles.Queries;

public class GetMediaSubtitlesQuery : IRequest<Result<List<SubtitleDto>>>
{
    public Guid MediaId { get; set; }
}