using System.Net;
using System.Text;
using MediaServer.Application.Common;
using MediaServer.Application.Interfaces.Repositories;
using MediaServer.Application.Streaming.Queries;
using MediatR;
using OperationResult;

namespace MediaServer.Application.Streaming.Handlers;

public class GetDynamicMasterPlaylistQueryHandler : IRequestHandler<GetDynamicMasterPlaylistQuery, Result<string>>
{
    public GetDynamicMasterPlaylistQueryHandler(IMediaRepository mediaRepository, ISubtitleRepository subtitleRepository, IMediaProfileRepository mediaProfileRepository)
    {
        _mediaRepository = mediaRepository;
        _subtitleRepository = subtitleRepository;
        _mediaProfileRepository = mediaProfileRepository;
    }

    private readonly IMediaRepository _mediaRepository;
    private readonly ISubtitleRepository _subtitleRepository;
    private readonly IMediaProfileRepository _mediaProfileRepository;
    
    public async Task<Result<string>> Handle(GetDynamicMasterPlaylistQuery request, CancellationToken cancellationToken)
    {
        try
        {
            var profiles = await _mediaProfileRepository.GetMediaProfilesByMediaIdAsync(request.MediaId);

            if (!profiles.Any())
            {
                throw new ApiErrorException(HttpStatusCode.BadRequest, "No media profiles found for this media item");
            }

            var subtitles = await _subtitleRepository.GetSubtitlesByMediaIdAsync(request.MediaId);

            var manifestBuilder = new StringBuilder();
            manifestBuilder.AppendLine("#EXTM3U");
            manifestBuilder.AppendLine("#EXT-X-VERSION:4");

            foreach (var sub in subtitles)
            {
                var isDefault = sub.Language.ToLower() == "en" ? "YES" : "NO";
                var subUri = $"/api/streaming/hls/{request.MediaId}/subtitles/{sub.Id}";
                manifestBuilder.AppendLine(
                    $"#EXT-X-MEDIA:TYPE=SUBTITLES,GROUP-ID=\"subs\",NAME=\"{sub.Label}\",DEFAULT={isDefault},AUTOSELECT=YES,LANGUAGE=\"{sub.Language}\",URI=\"{subUri}\""
                );
            }
            
            foreach (var profile in profiles)
            {
                string hlsCodecs = profile.VideoCodec == "hevc" 
                    ? "hvc1.2.4.L153.B0,mp4a.40.2" 
                    : "avc1.640028,mp4a.40.2";

                long bandwidth = profile.VideoCodec == "hevc" ? 15000000 : 8000000;
                string subGroup = subtitles.Any() ? ",SUBTITLES=\"subs\"" : "";

                manifestBuilder.AppendLine($"#EXT-X-STREAM-INF:BANDWIDTH={bandwidth},RESOLUTION=3840x2160,CODECS=\"{hlsCodecs}\"{subGroup}");
            
                var playlistFileName = Path.GetFileName(profile.PlaylistFilePath);
                manifestBuilder.AppendLine($"/api/streaming/hls/{request.MediaId}/{playlistFileName}");
            }
            
            return Result.Success(manifestBuilder.ToString());
        }
        catch (Exception e)
        {
            return Result.Error<string>(e);
        }
    }
}