using System.Net;
using MediaServer.Application.Common;
using MediaServer.Application.Common.Events;
using MediaServer.Application.Interfaces.Repositories;
using MediaServer.Application.Interfaces.Services;
using MediaServer.Application.Media.Commands;
using MediaServer.Application.Media.Responses;
using MediaServer.Domain.Entities;
using MediatR;
using OperationResult;

namespace MediaServer.Application.Media.Handlers;

public class IngestMediaCommandHandler : IRequestHandler<IngestMediaCommand, Result<IngestMediaResponse>>
{
    private readonly IFileAnalyzer _fileAnalyzer;
    private readonly IMediaRepository _mediaRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IMediator _mediator;

    public IngestMediaCommandHandler(IFileAnalyzer fileAnalyzer, IMediaRepository mediaRepository, IUnitOfWork unitOfWork, IMediator mediator)
    {
        _fileAnalyzer = fileAnalyzer;
        _mediaRepository = mediaRepository;
        _unitOfWork = unitOfWork;
        _mediator = mediator;
    }

    public async Task<Result<IngestMediaResponse>> Handle(IngestMediaCommand request, CancellationToken cancellationToken)
    {
        try
        {
            if (!_fileAnalyzer.FileExists(request.FilePath))
            {
                throw new ApiErrorException(HttpStatusCode.BadRequest, $"Media file not found at '{request.FilePath}'");
            }

            var (sizeBytes, codec) = await _fileAnalyzer.AnalyzeFileAsync(request.FilePath);

            var fileName = Path.GetFileNameWithoutExtension(request.FilePath);
            var mediaItem = MediaItem.Create(fileName, request.FilePath);

            await _mediaRepository.AddMediaAsync(mediaItem);
            await _unitOfWork.SaveChangesAsync(cancellationToken);
            await _mediator.Publish(new MediaIngestedEvent
            {
                EventId = Guid.CreateVersion7(),
                FilePath = mediaItem.FilePath,
                MediaId = mediaItem.Id
            });

            return Result.Success(new IngestMediaResponse
            {
                Id = mediaItem.Id,
                Title = mediaItem.OriginalFileName,
                CreateAt = DateTime.UtcNow
            });
        }
        catch (Exception ex)
        {
            return Result.Error<IngestMediaResponse>(ex);
        }
    }
}