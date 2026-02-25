using MediaServer.Application.DTOs;
using MediatR;
using OperationResult;

namespace MediaServer.Application.Catalog.Queries;

public class GetCatalogQuery : IRequest<Result<List<CatalogItemDTO>>>
{
    
}