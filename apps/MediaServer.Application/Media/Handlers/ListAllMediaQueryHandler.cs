using MediaServer.Application.DTOs;
using MediaServer.Application.Interfaces.Repositories;
using MediaServer.Application.Media.Queries;
using MediatR;
using OperationResult;

namespace MediaServer.Application.Media.Handlers;

public class ListAllMediaQueryHandler : IRequestHandler<ListAllMediaQuery, Result<List<MediaItemDto>>>
{
    private readonly IMediaRepository _mediaRepository;

    public ListAllMediaQueryHandler(IMediaRepository mediaRepository)
    {
        _mediaRepository = mediaRepository;
    }

    public async Task<Result<List<MediaItemDto>>> Handle(ListAllMediaQuery request, CancellationToken cancellationToken)
    {
        try
        {
            var mediaItems = await _mediaRepository.GetAllMediaItemsAsync();
            return Result.Success(mediaItems.Select(item => new MediaItemDto
            {
                Id = item.Id,
                Title = item.OriginalFileName,
                DateAdded = item.IngestedAt
            }).ToList());
        }
        catch (Exception e)
        {
            return Result.Error<List<MediaItemDto>>(e);
        }
    }
}