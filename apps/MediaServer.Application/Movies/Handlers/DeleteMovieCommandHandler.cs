using System.Net;
using MediaServer.Application.Common;
using MediaServer.Application.Interfaces.Repositories;
using MediaServer.Application.Movies.Commands;
using MediatR;
using OperationResult;

namespace MediaServer.Application.Movies.Handlers;

public class DeleteMovieCommandHandler : IRequestHandler<DeleteMovieCommand, Result<bool>>
{
    private readonly IMovieRepository _movieRepository;
    private readonly IUnitOfWork _unitOfWork;

    public DeleteMovieCommandHandler(IMovieRepository movieRepository, IUnitOfWork unitOfWork)
    {
        _movieRepository = movieRepository;
        _unitOfWork = unitOfWork;
    }

    public async Task<Result<bool>> Handle(DeleteMovieCommand request, CancellationToken cancellationToken)
    {
        try
        {
            var movie = await _movieRepository.GetByIdAsync(request.MovieId);
            if (movie == null)
                throw new ApiErrorException(HttpStatusCode.NotFound, "Movie not found");

            await _movieRepository.DeleteAsync(movie);
            await _unitOfWork.SaveChangesAsync(cancellationToken);
            return Result.Success(true);
        }
        catch (Exception e)
        {
            return Result.Error<bool>(e);
        }
    }
}
