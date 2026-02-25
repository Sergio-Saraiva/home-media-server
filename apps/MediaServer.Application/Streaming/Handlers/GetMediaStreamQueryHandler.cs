using System.Net;
using MediaServer.Application.Common;
using MediaServer.Application.Interfaces.Repositories;
using MediaServer.Application.Streaming.Queries;
using MediatR;
using OperationResult;

namespace MediaServer.Application.Streaming.Handlers;

public class GetMediaStreamQueryHandler : IRequestHandler<GetMediaStreamQuery, Result<MediaStreamResult>>
{
    private readonly IMediaRepository _mediaRepository;

    public GetMediaStreamQueryHandler(IMediaRepository mediaRepository)
    {
        _mediaRepository = mediaRepository;
    }

    public async Task<Result<MediaStreamResult>> Handle(GetMediaStreamQuery request, CancellationToken cancellationToken)
    {
        try
        {
            var mediaItem = await _mediaRepository.GetByIdAsync(request.MediaId);

            if (mediaItem == null)
            {
                throw new ApiErrorException(HttpStatusCode.BadRequest, $"Media item with id '{request.MediaId}' not found");
            }
            
            var extension = Path.GetExtension(mediaItem.FilePath).ToLowerInvariant();
            var contentType = extension switch
            {
                ".mp4" => "video/mp4",
                ".mkv" => "video/x-matroska",
                ".webm" => "video/webm",
                _ => "application/octet-stream"
            };
            
            return Result.Success(new MediaStreamResult(mediaItem.FilePath, contentType));
        }
        catch (Exception ex)
        {
            return Result.Error<MediaStreamResult>(ex);
        }
    }
}