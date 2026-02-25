using System.Net;
using MediaServer.Application.Common;
using MediaServer.Application.Interfaces.Repositories;
using MediaServer.Application.Streaming.Queries;
using MediatR;
using OperationResult;

namespace MediaServer.Application.Streaming.Handlers;

public class GetSubtitleTrackQueryHandler : IRequestHandler<GetSubtitleTrackQuery, Result<string>>
{
    private readonly ISubtitleRepository _subtitleRepository;

    public GetSubtitleTrackQueryHandler(ISubtitleRepository subtitleRepository)
    {
        _subtitleRepository = subtitleRepository;
    }

    public async Task<Result<string>> Handle(GetSubtitleTrackQuery request, CancellationToken cancellationToken)
    {
        try
        {
            var subtitle = await _subtitleRepository.GetByIdAsync(request.SubtitleId);
            if (subtitle == null)
            {
                throw new ApiErrorException(HttpStatusCode.BadRequest, "No subtitle found for this id");
            }
            
            return Result.Success(subtitle.FilePath);
        }
        catch (Exception e)
        {
            return Result.Error<string>(e);
        }
    }
}