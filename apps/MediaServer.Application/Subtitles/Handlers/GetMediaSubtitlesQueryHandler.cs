using System.Net;
using MediaServer.Application.Common;
using MediaServer.Application.DTOs;
using MediaServer.Application.Interfaces.Repositories;
using MediaServer.Application.Subtitles.Queries;
using MediatR;
using OperationResult;

namespace MediaServer.Application.Subtitles.Handlers;

public class GetMediaSubtitlesQueryHandler : IRequestHandler<GetMediaSubtitlesQuery, Result<List<SubtitleDto>>>
{
    public GetMediaSubtitlesQueryHandler(ISubtitleRepository subtitleRepository, IMediaRepository mediaRepository)
    {
        _mediaRepository = mediaRepository;
    }

    private readonly IMediaRepository _mediaRepository;
    
    public async Task<Result<List<SubtitleDto>>> Handle(GetMediaSubtitlesQuery request, CancellationToken cancellationToken)
    {
        try
        {
            var media = await _mediaRepository.GetByIdAsync(request.MediaId);
            if (media == null)
            {
                throw new ApiErrorException(HttpStatusCode.BadRequest, "Media item not found");
            }
            
            return Result.Success(media.Subtitles.Select(x => new SubtitleDto
            {
                Id = x.Id,
                Language = x.Language,
                FilePath = x.FilePath,
                Label = x.Label
            }).ToList());
        }
        catch (Exception e)
        {
            return Result.Error<List<SubtitleDto>>(e);
        }
    }
}