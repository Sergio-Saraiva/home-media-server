using MediaServer.Application.Catalog.Queries;
using MediaServer.Application.Common;
using MediaServer.Application.DTOs;
using MediaServer.Application.Media.Commands;
using MediaServer.Application.Media.Queries;
using MediaServer.Application.Movies.Commands;
using MediaServer.Application.Movies.Queries;
using MediaServer.Application.TvShows.Commands;
using MediaServer.Application.TvShows.Queries;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace MediaServer.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class CatalogController : BaseController
{
    public CatalogController(IMediator mediator) : base(mediator)
    {
    }
    
    [HttpGet("list-media")]
    [ProducesResponseType(200, Type = typeof(ResponseMessage<MediaItemDto>))]
    public async Task<IActionResult> ListMedias()
    {
        var query = new ListAllMediaQuery();
        return await SendRequest(query);
    }

    [HttpPost("create-movie")]
    [ProducesResponseType(200, Type = typeof(ResponseMessage<MovieDto>))]
    public async Task<IActionResult> CreateMovie([FromBody] CreateMovieCommand command)
    {
        return await SendRequest(command);
    }

    [HttpGet("movie/{id}")]
    [ProducesResponseType(200, Type = typeof(ResponseMessage<MovieDto>))]
    public async Task<IActionResult> GetMovie(Guid id)
    {
        var query = new GetMovieQuery
        {
            MovieId = id
        };
        return await SendRequest(query);
    }
    
    [HttpPost("create-tv-show")]
    [ProducesResponseType(200, Type = typeof(ResponseMessage<TvShowDto>))]
    public async Task<IActionResult> CreateTvShow([FromBody] CreateTvShowCommand command)
    {
        return await SendRequest(command);
    }

    [HttpGet("tv-show/{id}")]
    [ProducesResponseType(200, Type = typeof(ResponseMessage<TvShowDto>))]
    public async Task<IActionResult> GetTvShow(Guid id)
    {
        var query = new GetTvShowQuery
        {
            TvShowId = id
        };
        return await SendRequest(query);
    }
    
    [HttpDelete("movie/{id}")]
    [ProducesResponseType(200, Type = typeof(ResponseMessage<bool>))]
    public async Task<IActionResult> DeleteMovie(Guid id)
        => await SendRequest(new DeleteMovieCommand { MovieId = id });

    [HttpDelete("tv-show/{id}")]
    [ProducesResponseType(200, Type = typeof(ResponseMessage<bool>))]
    public async Task<IActionResult> DeleteTvShow(Guid id)
        => await SendRequest(new DeleteTvShowCommand { TvShowId = id });

    [HttpGet]
    [ProducesResponseType(200, Type = typeof(ResponseMessage<List<CatalogItemDTO>>))]
    public async Task<IActionResult> GetCatalog()
    {
        var query = new GetCatalogQuery();
        return await SendRequest(query);
    }
}