using MediaServer.Application.DTOs;
using MediaServer.Application.Interfaces.Repositories;
using MediaServer.Application.Interfaces.Services;
using MediaServer.Application.Streaming.Queries;
using MediatR;
using OperationResult;

namespace MediaServer.Application.Streaming.Handlers;

public class GetTranscodeProgressQueryHandler : IRequestHandler<GetTranscodeProgressQuery, Result<TranscodeStatus>>
{
    private readonly ITranscodeProgressCache _cache;
    private readonly IMediaProfileRepository _mediaProfileRepository;

    public GetTranscodeProgressQueryHandler(ITranscodeProgressCache cache, IMediaProfileRepository mediaProfileRepository)
    {
        _cache = cache;
        _mediaProfileRepository = mediaProfileRepository;
    }

    public async Task<Result<TranscodeStatus>> Handle(GetTranscodeProgressQuery request, CancellationToken cancellationToken)
    {
        try
        {
            var cacheEntry = _cache.GetStatus(request.MediaId);
            if (cacheEntry.Status != "Pending or Not Found")
            {
                return Result.Success(cacheEntry);
            }

            var hasCompletedProfiles = await _mediaProfileRepository.GetMediaProfilesByMediaIdAsync(request.MediaId);
            
            if (hasCompletedProfiles.Any())
            {
                return Result.Success(new TranscodeStatus
                {
                    Status = "Completed",
                    PercentageStatus = 100
                });
            }
            
            return Result.Success(cacheEntry);
        }
        catch (Exception ex)
        {
            return Result.Error<TranscodeStatus>(ex);
        }
    }
}