using System.Net;
using System.Text;
using MediaServer.Application.Common;
using MediaServer.Application.Interfaces.Repositories;
using MediaServer.Application.Interfaces.Services;
using MediaServer.Application.Subtitles.Commands;
using MediaServer.Domain.Entities;
using MediatR;
using OperationResult;

namespace MediaServer.Application.Subtitles.Handlers;

public class UploadSubtitleCommandHandler : IRequestHandler<UploadSubtitleCommand, Result<Guid>>
{
    public UploadSubtitleCommandHandler(IUnitOfWork unitOfWork, IMediaRepository mediaRepository, ISubtitleRepository subtitleRepository)
    {
        _unitOfWork = unitOfWork;
        _mediaRepository = mediaRepository;
        _subtitleRepository = subtitleRepository;
    }

    private readonly IUnitOfWork _unitOfWork;
    private readonly IMediaRepository _mediaRepository;
    private readonly ISubtitleRepository _subtitleRepository;
    
    public async Task<Result<Guid>> Handle(UploadSubtitleCommand request, CancellationToken cancellationToken)
    {
        try
        {
            var mediaExits = await _mediaRepository.GetByIdAsync(request.MediaId);
            if (mediaExits == null)
            {
                throw new ApiErrorException(HttpStatusCode.BadRequest, "Media item not found");
            }
            
            var originalDirectory = Path.GetDirectoryName(mediaExits.FilePath);
            var outputDir = Path.Combine(originalDirectory!, $".transcoded_{request.MediaId}");
            if (!Directory.Exists(outputDir)) Directory.CreateDirectory(outputDir);

            var safeFileName = $"{Guid.NewGuid()}_{request.Language}.vtt";
            var filePath = Path.Combine(outputDir, safeFileName);

            using var memoryStream = new MemoryStream();
            await request.Content.CopyToAsync(memoryStream, cancellationToken);
            var fileBytes = memoryStream.ToArray();


            // 2. Attempt to decode as UTF-8
            var content = Encoding.UTF8.GetString(fileBytes);

            // 3. If UTF-8 fails (produces the \uFFFD replacement character), fallback to Latin-1
            if (content.Contains('\uFFFD'))
            {
                content = Encoding.Latin1.GetString(fileBytes);
            }

            // 4. Convert SRT to WebVTT
            if (request.FileName.EndsWith(".srt", StringComparison.OrdinalIgnoreCase))
            {
                content = "WEBVTT\n\n" + content.Replace(",", ".");
            }
            
            await File.WriteAllTextAsync(filePath, content, Encoding.UTF8, cancellationToken);

            var subtitle = new SubtitleTrack
            {
                Id = Guid.CreateVersion7(),
                
                MediaItemId = request.MediaId, 
                Language = request.Language, 
                Label = request.Language, 
                FilePath = safeFileName
            };
            
            await _subtitleRepository.AddSubtitleAsync(subtitle);
            await _unitOfWork.SaveChangesAsync(cancellationToken);
            
            return Result.Success(subtitle.Id);
        } catch (Exception ex)
        {
            return Result.Error<Guid>(ex);
        }
    }
}