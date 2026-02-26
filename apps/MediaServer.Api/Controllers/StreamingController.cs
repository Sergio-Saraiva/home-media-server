using MediaServer.Application.Streaming.Commands;
using MediaServer.Application.Streaming.Queries;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace MediaServer.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class StreamingController : ControllerBase
{
    private readonly IMediator _mediator;
    
    
    public StreamingController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> StreamMedia(Guid id)
    {
        var query = new GetMediaStreamQuery(id);
        var result = await _mediator.Send(query);

        if (!result.IsSuccess || result.Value == null)
        {
            return NotFound();
        }
        
        return PhysicalFile(physicalPath: result.Value.FilePath, contentType: result.Value.ContentType, enableRangeProcessing: true);   
    }
    
    [HttpPost("hls/start/{id}")]
    public async Task<IActionResult> StartHls(Guid id)
    {
        var command = new StartHlsStreamCommand
        {
            MediaId = id
        };
        var result = await _mediator.Send(command);

        if (!result.IsSuccess) return BadRequest(result.Exception?.Message);

        return Ok(new { playlistUrl = result.Value }); 
    }
    
    [HttpGet("hls/master/{mediaId}.m3u8")]
    public async Task<IActionResult> GetMasterPlaylist(Guid mediaId)
    {
        var query = new GetDynamicMasterPlaylistQuery { MediaId = mediaId };
        var result = await _mediator.Send(query);

        if (!result.IsSuccess || string.IsNullOrEmpty(result.Value))
        {
            return NotFound(result.Exception?.Message);
        }

        // Return the dynamically generated string as an active M3U8 file
        var bytes = System.Text.Encoding.UTF8.GetBytes(result.Value);
        return File(bytes, "application/vnd.apple.mpegurl", "master.m3u8");
    }

    [HttpGet("hls/{mediaId}/subtitles/{subtitleId}")]
    public async Task<IActionResult> GetSubtitleFile(Guid mediaId, Guid subtitleId)
    {
        var query = new GetSubtitleTrackQuery {SubtitleId = subtitleId };
        var result = await _mediator.Send(query);

        if (!result.IsSuccess || string.IsNullOrEmpty(result.Value))
        {
            return NotFound();
        }

        return PhysicalFile(result.Value, "text/vtt; charset=utf-8");
    }
    
    // Make sure your previous GetHlsSegment endpoint is updated to point to the new VOD directory!
    [HttpGet("hls/{mediaId}/{fileName}")]
    public async Task<IActionResult> GetHlsSegment(Guid mediaId, string fileName)
    {
        var dirQuery = new GetTranscodeDirectoryQuery {MediaId = mediaId };
        var dirResult = await _mediator.Send(dirQuery);

        if (!dirResult.IsSuccess || string.IsNullOrEmpty(dirResult.Value))
        {
            return NotFound(dirResult.Exception?.Message);
        }

        // 2. Construct the full path to the .ts chunk or .m3u8 playlist
        var filePath = Path.Combine(dirResult.Value, fileName);

        if (!System.IO.File.Exists(filePath)) 
        {
            return NotFound();
        }

        var contentType = fileName.EndsWith(".m3u8") ? "application/vnd.apple.mpegurl" :
            fileName.EndsWith(".vtt") ? "text/vtt" : "video/MP2T";

        return PhysicalFile(filePath, contentType, enableRangeProcessing: true);
    }
}