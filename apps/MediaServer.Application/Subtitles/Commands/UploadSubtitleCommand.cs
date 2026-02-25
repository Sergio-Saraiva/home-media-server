using MediatR;
using OperationResult;

namespace MediaServer.Application.Subtitles.Commands;

public class UploadSubtitleCommand : IRequest<Result<Guid>>
{
    public Guid MediaId { get; set; }
    public string FileName { get; set; }
    public Stream Content { get; set; }
    public string Language { get; set; }
}