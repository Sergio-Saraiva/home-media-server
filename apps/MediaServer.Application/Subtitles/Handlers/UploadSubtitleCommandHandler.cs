using System.Net;
using System.Text;
using System.Text.RegularExpressions;
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

    private static string DecodeSubtitleBytes(byte[] bytes)
    {
        // UTF-16 LE (BOM: FF FE) — common from Windows Notepad and some subtitle editors
        if (bytes.Length >= 2 && bytes[0] == 0xFF && bytes[1] == 0xFE)
            return Encoding.Unicode.GetString(bytes);

        // UTF-16 BE (BOM: FE FF)
        if (bytes.Length >= 2 && bytes[0] == 0xFE && bytes[1] == 0xFF)
            return Encoding.BigEndianUnicode.GetString(bytes);

        // UTF-8 with BOM (EF BB BF) — strip BOM then decode
        if (bytes.Length >= 3 && bytes[0] == 0xEF && bytes[1] == 0xBB && bytes[2] == 0xBF)
            return Encoding.UTF8.GetString(bytes, 3, bytes.Length - 3);

        // Try strict UTF-8 — throws on any invalid byte sequence
        try
        {
            var strictUtf8 = new UTF8Encoding(encoderShouldEmitUTF8Identifier: false, throwOnInvalidBytes: true);
            return strictUtf8.GetString(bytes);
        }
        catch
        {
            // Fall back to Latin-1 (ISO-8859-1) — built-in on all platforms,
            // covers all standard PT-BR characters: ã, ê, ç, ó, é, í, ú, â, ô, à
            return Encoding.Latin1.GetString(bytes);
        }
    }
    
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

            bool isAss = request.FileName.EndsWith(".ass", StringComparison.OrdinalIgnoreCase)
                      || request.FileName.EndsWith(".ssa", StringComparison.OrdinalIgnoreCase);
            string ext = isAss ? "ass" : "vtt";
            string format = ext;

            var safeFileName = $"{Guid.NewGuid()}_{request.Language}.{ext}";
            var filePath = Path.Combine(outputDir, safeFileName);

            using var memoryStream = new MemoryStream();
            await request.Content.CopyToAsync(memoryStream, cancellationToken);
            var fileBytes = memoryStream.ToArray();

            if (isAss)
            {
                // Preserve ASS formatting exactly — write raw bytes
                await File.WriteAllBytesAsync(filePath, fileBytes, cancellationToken);
            }
            else
            {
                string content = DecodeSubtitleBytes(fileBytes);

                // Convert SRT to WebVTT: only replace commas in timestamp lines, not in dialogue
                if (request.FileName.EndsWith(".srt", StringComparison.OrdinalIgnoreCase))
                {
                    content = "WEBVTT\n\n" + Regex.Replace(
                        content,
                        @"(\d{2}:\d{2}:\d{2}),(\d{3})",
                        "$1.$2"
                    );
                }

                await File.WriteAllTextAsync(filePath, content, Encoding.UTF8, cancellationToken);
            }

            var subtitle = new SubtitleTrack
            {
                Id = Guid.CreateVersion7(),
                MediaItemId = request.MediaId,
                Language = request.Language,
                Label = request.Language,
                FilePath = filePath,
                Format = format
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