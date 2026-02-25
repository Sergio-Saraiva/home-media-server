using System.Net;
using MediaServer.Application.Common;
using MediaServer.Application.Interfaces.Repositories;
using MediaServer.Application.Interfaces.Services;
using MediaServer.Application.Streaming.Commands;
using MediatR;
using OperationResult;

namespace MediaServer.Application.Streaming.Handlers;

public class StartHlsStreamCommandHandler : IRequestHandler<StartHlsStreamCommand, Result<string>>
{
    private readonly IMediaRepository _mediaRepository;
    private readonly ITranscodeManager _transcodeManager;
    
    public StartHlsStreamCommandHandler(IMediaRepository mediaRepository, ITranscodeManager transcodeManager)
    {
        _mediaRepository = mediaRepository;
        _transcodeManager = transcodeManager;
    }


    public async Task<Result<string>> Handle(StartHlsStreamCommand request, CancellationToken cancellationToken)
    {
        try
        {
            var media = await _mediaRepository.GetByIdAsync(request.MediaId);

            if (media == null || !File.Exists(media.FilePath))
            {
                throw new ApiErrorException(HttpStatusCode.BadRequest, "Media item not found");
            }

            await _transcodeManager.StartTranscodingAsync(request.MediaId, media.FilePath, cancellationToken);
           
            return Result.Success($"/api/streaming/hls/{request.MediaId}/playlist.m3u8");
        } catch (Exception ex)
        {
            return Result.Error<string>(ex);
        }
    }
}