using MediaServer.Application.DTOs;
using MediatR;
using OperationResult;

namespace MediaServer.Application.Media.Queries;

public class ListAllMediaQuery : IRequest<Result<List<MediaItemDto>>>
{
    
}