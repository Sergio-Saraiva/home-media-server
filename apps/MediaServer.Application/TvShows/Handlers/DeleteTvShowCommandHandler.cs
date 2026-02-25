using System.Net;
using MediaServer.Application.Common;
using MediaServer.Application.Interfaces.Repositories;
using MediaServer.Application.TvShows.Commands;
using MediatR;
using OperationResult;

namespace MediaServer.Application.TvShows.Handlers;

public class DeleteTvShowCommandHandler : IRequestHandler<DeleteTvShowCommand, Result<bool>>
{
    private readonly ITvShowRepository _tvShowRepository;
    private readonly IUnitOfWork _unitOfWork;

    public DeleteTvShowCommandHandler(ITvShowRepository tvShowRepository, IUnitOfWork unitOfWork)
    {
        _tvShowRepository = tvShowRepository;
        _unitOfWork = unitOfWork;
    }

    public async Task<Result<bool>> Handle(DeleteTvShowCommand request, CancellationToken cancellationToken)
    {
        try
        {
            var tvShow = await _tvShowRepository.GetByIdAsync(request.TvShowId);
            if (tvShow == null)
                throw new ApiErrorException(HttpStatusCode.NotFound, "TV show not found");

            await _tvShowRepository.DeleteAsync(tvShow);
            await _unitOfWork.SaveChangesAsync(cancellationToken);
            return Result.Success(true);
        }
        catch (Exception e)
        {
            return Result.Error<bool>(e);
        }
    }
}
