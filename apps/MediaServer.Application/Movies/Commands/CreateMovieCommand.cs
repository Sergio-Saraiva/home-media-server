using MediaServer.Application.DTOs;
using MediatR;
using OperationResult;

namespace MediaServer.Application.Movies.Commands;

public class CreateMovieCommand : IRequest<Result<MovieDto>>
{
    public Guid MediaItemId { get; set; }
    public string Title { get; set; }
    public string Description { get; set; }
    public string PosterPath { get; set; } = string.Empty;
}