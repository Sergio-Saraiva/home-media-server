using System.Net;
using MediaServer.Application.Common;
using MediaServer.Application.DTOs;
using MediaServer.Application.Interfaces.Repositories;
using MediaServer.Application.TvShows.Queries;
using MediatR;
using OperationResult;

namespace MediaServer.Application.TvShows.Handlers;

public class GetTvShowQueryHandler : IRequestHandler<GetTvShowQuery, Result<TvShowDto>>
{
    private readonly ITvShowRepository _tvShowRepository;

    public GetTvShowQueryHandler(ITvShowRepository tvShowRepository)
    {
        _tvShowRepository = tvShowRepository;
    }

    public async Task<Result<TvShowDto>> Handle(GetTvShowQuery request, CancellationToken cancellationToken)
    {
        try
        {
            var tvShow = await _tvShowRepository.GetByIdAsync(request.TvShowId);
            if (tvShow == null)
            {
                throw new ApiErrorException(HttpStatusCode.BadRequest, "Tv show not found");
            }
            
            return Result.Success(new TvShowDto
            {
                Id = tvShow.Id,
                Title = tvShow.Title,
                CreatedAt = tvShow.CreatedAt,
                Episodes = tvShow.Episodes.Select(ep => new MediaItemDto
                {
                    Id = ep.Id,
                    Title = ep.OriginalFileName,
                    DateAdded = ep.IngestedAt
                }).ToList()
            });
        }
        catch (Exception e)
        {
            return Result.Error<TvShowDto>(e);
        }
    }
}