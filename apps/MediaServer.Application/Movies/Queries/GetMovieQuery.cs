using MediaServer.Application.DTOs;
using MediaServer.Domain.Entities;
using MediatR;
using OperationResult;

namespace MediaServer.Application.Movies.Queries;

public class GetMovieQuery : IRequest<Result<MovieDto>>
{
    public Guid MovieId { get; set; }
}