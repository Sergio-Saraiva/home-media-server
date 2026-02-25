using MediaServer.Application.Streaming.Commands;
using MediaServer.Application.Streaming.Queries;
using MediaServer.Application.Subtitles.Commands;
using MediaServer.Application.Subtitles.Queries;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace MediaServer.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SubtitlesController : BaseController
{
    
    
    public SubtitlesController(IMediator mediator) : base(mediator)
    {
    }

    [HttpPost("{mediaId}/upload")]
    public async Task<IActionResult> UploadSubtitle(Guid mediaId, IFormFile file, [FromForm] string language)
    {
        if (file == null || file.Length == 0)
        {
            return BadRequest(new { ErrorMessage = "File is empty." });
        }

        using var stream = file.OpenReadStream();
        var command = new UploadSubtitleCommand { MediaId = mediaId, Language = language, Content = stream, FileName = file.FileName};
        return await SendRequest(command);
    }
    
    [HttpGet("{mediaId}")]
    public async Task<IActionResult> GetMediaSubtitles(Guid mediaId)
    {
        var query = new GetMediaSubtitlesQuery { MediaId = mediaId };
        return await SendRequest(query);
    }
}