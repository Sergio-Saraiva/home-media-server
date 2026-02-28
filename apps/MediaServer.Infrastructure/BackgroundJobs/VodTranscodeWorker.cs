using System.Diagnostics;
using System.Text.Json;
using MediaServer.Application.Common.Events;
using MediaServer.Application.Interfaces.Queues;
using MediaServer.Application.Interfaces.Repositories;
using MediaServer.Application.Interfaces.Services;
using MediaServer.Domain.Entities;
using MediaServer.Infrastructure.Media;
using MediaServer.Infrastructure.Persistence.Context;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace MediaServer.Infrastructure.BackgroundJobs;

public class VodTranscodeWorker : BackgroundService
{
    public VodTranscodeWorker(ITranscodeQueue transcodeQueue, ILogger<VodTranscodeWorker> logger, IServiceScopeFactory serviceScopeFactory, ITranscodeProgressCache progressCache)
    {
        _transcodeQueue = transcodeQueue;
        _logger = logger;
        _serviceScopeFactory = serviceScopeFactory;
        _progressCache = progressCache;
    }

    private readonly ITranscodeQueue _transcodeQueue;
    private readonly ILogger<VodTranscodeWorker> _logger;
    private readonly IServiceScopeFactory _serviceScopeFactory;
    private readonly ITranscodeProgressCache _progressCache;
    
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("VOD Transcode Worker Started.");

        while (!stoppingToken.IsCancellationRequested)
        {
            var job = await _transcodeQueue.DequeueAsync(stoppingToken);

            try
            {
                await ProcessTranscodeAsync(job, stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing transcode job: {JobId}", job.EventId);
            }
        }
        
    }
    
    private async Task ProcessTranscodeAsync(MediaIngestedEvent job, CancellationToken cancellationToken)
    {
        _logger.LogInformation("Starting Multi-Profile VOD Transcode for {Id}", job.MediaId);
        _progressCache.ReportProgress(job.MediaId, 0);
        var elapsedTime = Stopwatch.StartNew();
        var originalDirectory = Path.GetDirectoryName(job.FilePath);
        if (string.IsNullOrEmpty(originalDirectory))
        {
            throw new InvalidOperationException($"Could not determine directory for file: {job.FilePath}");
        }
        
        string sourceCodec = await GetInputVideoCodecAsync(job.FilePath, cancellationToken);
        _logger.LogInformation("Detected source codec: {Codec} for Media ID {Id}", sourceCodec, job.MediaId);
        
        var outputDir = Path.Combine(originalDirectory, $".transcoded_{job.MediaId}");
        if (!Directory.Exists(outputDir)) 
        {
            Directory.CreateDirectory(outputDir);
        }
        
        string hardwareDecoderArg = sourceCodec switch
        {
            "hevc" => "-c:v hevc_cuvid",
            "h264" => "-c:v h264_cuvid",
            "vp9"  => "-c:v vp9_cuvid",
            "av1"  => "-c:v av1_cuvid",
            _      => ""
        };
        
        
        _logger.LogInformation("Output directory created: {OutputDir}", outputDir);

        var arguments = $"-nostats {hardwareDecoderArg} -i \"{job.FilePath}\" " +
                        $"-map 0:v:0 -map 0:v:0 -map 0:a:0 -map 0:a:0 " +
                
                        // Profile 0: HEVC HDR (High Quality Preset + HDR Color Space Tags)
                        $"-c:v:0 hevc_nvenc -preset p7 -multipass 2 -profile:v:0 main10 -pix_fmt:v:0 p010le " +
                        $"-color_primaries:v:0 bt2020 -color_trc:v:0 smpte2084 -colorspace:v:0 bt2020nc -b:v:0 15M " +
                
                        // Profile 1: H.264 SDR (High Quality Preset)
                        $"-c:v:1 h264_nvenc -preset p7 -multipass 2 -pix_fmt:v:1 yuv420p -b:v:1 8M " +
                
                        // Audio: 5.1 Surround Sound Downmix at 640kbps
                        $"-c:a:0 aac -ac:a:0 6 -b:a:0 640k " +
                        $"-c:a:1 aac -ac:a:1 6 -b:a:1 640k " +
                
                        $"-f hls -hls_time 4 -hls_playlist_type vod " +
                        $"-master_pl_name master.m3u8 " +
                        $"-var_stream_map \"v:0,a:0,name:hdr_hevc v:1,a:1,name:sdr_h264\" " +
                        $"-progress pipe:1 " + 
                        $"-hls_segment_filename \"{outputDir}/%v_%03d.ts\" \"{outputDir}/%v_playlist.m3u8\"";

        var processInfo = new ProcessStartInfo
        {
            FileName = "ffmpeg",
            Arguments = arguments,
            RedirectStandardError = true,
            RedirectStandardOutput = true,
            UseShellExecute = false,
            CreateNoWindow = true
        };

        using var process = Process.Start(processInfo);
        TimeSpan totalDuration = TimeSpan.Zero;
        

        var stderrTask = Task.Run(async () =>
        {
            var errorLog = new System.Text.StringBuilder();
            using var reader = process!.StandardError;
            while (!reader.EndOfStream)
            {
                var line = await reader.ReadLineAsync(cancellationToken);
                if (line == null) continue;
                
                errorLog.AppendLine(line);

                // Parse "Duration: 00:58:41.15"
                if (totalDuration == TimeSpan.Zero && line.Contains("Duration:"))
                {
                    var durationString = line.Split("Duration:")[1].Split(',')[0].Trim();
                    TimeSpan.TryParse(durationString, out totalDuration);
                }
            }
            return errorLog.ToString();
        }, cancellationToken);

        // Task 2: Read StandardOutput to track the real-time progress
        var stdoutTask = Task.Run(async () =>
        {
            using var reader = process!.StandardOutput;
            while (!reader.EndOfStream)
            {
                var line = await reader.ReadLineAsync(cancellationToken);
                if (line != null && line.StartsWith("out_time=") && totalDuration.TotalSeconds > 0)
                {
                    // Parse "out_time=00:14:23.050000"
                    var timeString = line.Split('=')[1].Trim();
                    if (TimeSpan.TryParse(timeString, out TimeSpan currentTime))
                    {
                        double percentage = (currentTime.TotalSeconds / totalDuration.TotalSeconds) * 100;
                        _progressCache.ReportProgress(job.MediaId, percentage);
                    }
                }
            }
        }, cancellationToken);

        await Task.WhenAll(stderrTask, stdoutTask, process!.WaitForExitAsync(cancellationToken));

        if (process.ExitCode == 0)
        {
            elapsedTime.Stop();
            _progressCache.ReportProgress(job.MediaId, 100);
            _logger.LogInformation("VOD Transcode SUCCESS for {Id}.", job.MediaId);
            _logger.LogInformation($"Elapsed time {elapsedTime.ElapsedMilliseconds} ms");
            await SaveProfilesToDatabaseAsync(job.MediaId, outputDir, cancellationToken);
            await ExtractEmbeddedSubtitlesAsync(job.FilePath, outputDir, job.MediaId, cancellationToken);
        }
        else
        {
            elapsedTime.Stop();
            var errors = stderrTask.Result;
            _progressCache.ReportError(job.MediaId, "FFmpeg Process Failed. Exit Code: " + process.ExitCode);
            _logger.LogError("VOD Transcode FAILED for {Id}. Logs:\n{Logs}", job.MediaId, errors);
            _logger.LogInformation($"Elapsed time {elapsedTime.ElapsedMilliseconds} ms");
        }
    }
    
    private async Task<string> GetInputVideoCodecAsync(string filePath, CancellationToken cancellationToken)
    {
        var processInfo = new ProcessStartInfo
        {
            FileName = "ffprobe",
            Arguments = $"-v error -select_streams v:0 -show_entries stream=codec_name -of default=noprint_wrappers=1:nokey=1 \"{filePath}\"",
            RedirectStandardOutput = true,
            CreateNoWindow = true,
            UseShellExecute = false
        };

        using var process = Process.Start(processInfo);
        var codec = await process!.StandardOutput.ReadLineAsync(cancellationToken);
        await process.WaitForExitAsync(cancellationToken);

        return codec?.Trim().ToLower() ?? string.Empty;
    }
    
    private async Task SaveProfilesToDatabaseAsync(Guid mediaId, string outputDir, CancellationToken cancellationToken)
    {
        using var scope = _serviceScopeFactory.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<MediaDbContext>();
        var unitOfWork = scope.ServiceProvider.GetRequiredService<IUnitOfWork>();

        var hevcProfile = new MediaProfile { Id = Guid.CreateVersion7(), MediaItemId = mediaId, VideoCodec = "hevc", Resolution = "4K", IsHdr = true, PlaylistFilePath = Path.Combine(outputDir, "hdr_hevc_playlist.m3u8") };
        var h264Profile = new MediaProfile { Id = Guid.CreateVersion7(),MediaItemId = mediaId, VideoCodec = "h264", Resolution = "4K", IsHdr = false, PlaylistFilePath = Path.Combine(outputDir, "sdr_h264_playlist.m3u8")};

        dbContext.MediaProfiles.AddRange(hevcProfile, h264Profile);
        await unitOfWork.SaveChangesAsync(cancellationToken);
    }
    
    private static readonly HashSet<string> AssCodecs = new(StringComparer.OrdinalIgnoreCase) { "ass", "ssa" };
    private static readonly HashSet<string> TextCodecs = new(StringComparer.OrdinalIgnoreCase) { "subrip", "srt", "webvtt", "mov_text" };
    private static readonly HashSet<string> ImageCodecs = new(StringComparer.OrdinalIgnoreCase) { "hdmv_pgs_subtitle", "pgssub", "dvd_subtitle", "dvdsub", "dvbsub" };

    private async Task<List<FfProbeStream>> GetSubtitleStreamsAsync(string filePath, CancellationToken cancellationToken)
    {
        var processInfo = new ProcessStartInfo
        {
            FileName = "ffprobe",
            Arguments = $"-v quiet -print_format json -show_streams -select_streams s \"{filePath}\"",
            RedirectStandardOutput = true,
            CreateNoWindow = true,
            UseShellExecute = false
        };

        using var process = Process.Start(processInfo);
        var json = await process!.StandardOutput.ReadToEndAsync(cancellationToken);
        await process.WaitForExitAsync(cancellationToken);

        if (process.ExitCode != 0) return [];

        var output = JsonSerializer.Deserialize<FfProbeOutput>(json);
        return output?.Streams ?? [];
    }

    private async Task ExtractEmbeddedSubtitlesAsync(string sourceFile, string outputDir, Guid mediaId, CancellationToken cancellationToken)
    {
        var subtitleStreams = await GetSubtitleStreamsAsync(sourceFile, cancellationToken);

        if (subtitleStreams.Count == 0)
        {
            _logger.LogInformation("No subtitle streams found in {Id}.", mediaId);
            return;
        }

        _logger.LogInformation("Found {Count} subtitle stream(s) in {Id}.", subtitleStreams.Count, mediaId);

        var extractedTracks = new List<SubtitleTrack>();

        foreach (var stream in subtitleStreams)
        {
            var codecName = stream.CodecName?.ToLowerInvariant() ?? "";

            if (ImageCodecs.Contains(codecName))
            {
                _logger.LogInformation("Skipping image-based subtitle stream {Index} (codec: {Codec}) for {Id}.", stream.Index, codecName, mediaId);
                continue;
            }

            bool isAss = AssCodecs.Contains(codecName);
            bool isText = TextCodecs.Contains(codecName);

            if (!isAss && !isText)
            {
                _logger.LogWarning("Unknown subtitle codec '{Codec}' at stream {Index} for {Id}, skipping.", codecName, stream.Index, mediaId);
                continue;
            }

            string ext = isAss ? "ass" : "vtt";
            string ffmpegCodec = isAss ? "ass" : "webvtt";
            string lang = stream.Tags?.Language ?? "und";
            string label = stream.Tags?.Title ?? lang;
            string fileName = $"sub_{stream.Index}_{lang}.{ext}";
            string outPath = Path.Combine(outputDir, fileName);

            var args = $"-i \"{sourceFile}\" -map 0:{stream.Index} -c:s {ffmpegCodec} \"{outPath}\"";

            var processInfo = new ProcessStartInfo
            {
                FileName = "ffmpeg",
                Arguments = args,
                RedirectStandardError = true,
                CreateNoWindow = true,
                UseShellExecute = false
            };

            using var process = Process.Start(processInfo);
            var stdErrTask = process!.StandardError.ReadToEndAsync(cancellationToken);
            await process.WaitForExitAsync(cancellationToken);
            var errorOutput = await stdErrTask;

            if (process.ExitCode == 0 && File.Exists(outPath))
            {
                _logger.LogInformation("Extracted subtitle stream {Index} ({Lang}, {Codec}) for {Id}.", stream.Index, lang, codecName, mediaId);
                extractedTracks.Add(new SubtitleTrack
                {
                    Id = Guid.CreateVersion7(),
                    MediaItemId = mediaId,
                    Language = lang,
                    Label = label,
                    FilePath = outPath,
                    Format = ext
                });
            }
            else
            {
                _logger.LogWarning("Failed to extract subtitle stream {Index} for {Id}. Log:\n{Log}", stream.Index, mediaId, errorOutput);
            }
        }

        if (extractedTracks.Count > 0)
        {
            using var scope = _serviceScopeFactory.CreateScope();
            var dbContext = scope.ServiceProvider.GetRequiredService<MediaDbContext>();
            var unitOfWork = scope.ServiceProvider.GetRequiredService<IUnitOfWork>();

            dbContext.SubtitleTracks.AddRange(extractedTracks);
            await unitOfWork.SaveChangesAsync(cancellationToken);
            _logger.LogInformation("Saved {Count} subtitle track(s) for {Id}.", extractedTracks.Count, mediaId);
        }
    }
}