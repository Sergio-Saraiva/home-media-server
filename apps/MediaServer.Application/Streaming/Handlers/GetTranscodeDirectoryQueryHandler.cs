using System.Net;
using MediaServer.Application.Common;
using MediaServer.Application.Interfaces.Repositories;
using MediaServer.Application.Streaming.Queries;
using MediatR;
using Microsoft.Extensions.Caching.Memory;
using OperationResult;

namespace MediaServer.Application.Streaming.Handlers;

public class GetTranscodeDirectoryQueryHandler : IRequestHandler<GetTranscodeDirectoryQuery, Result<string>>
{
    public GetTranscodeDirectoryQueryHandler(IMediaRepository mediaRepository, IMemoryCache cache)
    {
        _mediaRepository = mediaRepository;
        _cache = cache;
    }

    private readonly IMediaRepository _mediaRepository;
    private readonly IMemoryCache _cache;
    
    public async Task<Result<string>> Handle(GetTranscodeDirectoryQuery request, CancellationToken cancellationToken)
    {
        try
        {
            var cacheKey = $"TranscodeDir_{request.MediaId}";
            
            if(!_cache.TryGetValue(cacheKey, out string? outputDir))
            {
                var media = await _mediaRepository.GetByIdAsync(request.MediaId);
                if (media == null)
                {
                    throw new ApiErrorException(HttpStatusCode.BadRequest, "Media not found");
                }

                var originalDirectory = Path.GetDirectoryName(media.FilePath);
                outputDir = Path.Combine(originalDirectory!, $".transcoded_{request.MediaId}");
                _cache.Set(cacheKey, outputDir, TimeSpan.FromHours(2));
            }

            return Result.Success(outputDir);
            
        } catch (Exception ex)
        {
            return Result.Error<string>(ex);
        }
    }
}