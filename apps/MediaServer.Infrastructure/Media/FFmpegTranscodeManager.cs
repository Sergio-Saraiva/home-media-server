using System.Collections.Concurrent;
using System.Diagnostics;
using System.Runtime.InteropServices;
using MediaServer.Application.Interfaces.Services;
using Microsoft.Extensions.Logging;

namespace MediaServer.Infrastructure.Media;

public class FFmpegTranscodeManager : ITranscodeManager, IDisposable
{
    public FFmpegTranscodeManager(ILogger<FFmpegTranscodeManager> logger)
    {
        _logger = logger;
        _transcodingDirectory = Path.Combine(Directory.GetCurrentDirectory(), "TempTranscodes");
        if (!Directory.Exists(_transcodingDirectory))
        {
            Directory.CreateDirectory(_transcodingDirectory);
        }
    }

    private readonly ILogger<FFmpegTranscodeManager> _logger;
    private readonly ConcurrentDictionary<Guid, Process> _activeProcesses = new();
    private readonly string _transcodingDirectory;
    
    public async Task<string> StartTranscodingAsync(Guid mediaId, string inputFilePath, CancellationToken cancellationToken)
    {
        var outputDir = Path.Combine(_transcodingDirectory, mediaId.ToString());
        var playlistPath = Path.Combine(outputDir, "playlist.m3u8");

        if (_activeProcesses.ContainsKey(mediaId) && File.Exists(playlistPath))
        {
            return playlistPath;
        }

        if (!Directory.Exists(outputDir))
        {
            Directory.CreateDirectory(outputDir);
        }

        bool isWindows = RuntimeInformation.IsOSPlatform(OSPlatform.Windows);
        string executable = isWindows ? "ffmpeg.exe" : "/usr/bin/ffmpeg";
        
        var arguments = $"-i \"{inputFilePath}\" -pix_fmt p010le -c:v hevc_nvenc -preset p4 -profile:v main10 -b:v 8M -c:a aac -b:a 192k -f hls -hls_time 4 -hls_list_size 0 -hls_segment_filename \"{outputDir}/%03d.ts\" \"{playlistPath}\"";
        
        var processStartInfo = new ProcessStartInfo
        {
            FileName = executable,
            Arguments = arguments,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false,
            CreateNoWindow = true
        };
        
        var process = new Process { StartInfo = processStartInfo };

        process.Exited += (sender, args) => 
        {
            _activeProcesses.TryRemove(mediaId, out _);
            _logger.LogInformation("Transcoding finished or stopped for Media ID: {MediaId}", mediaId);
        };
        process.EnableRaisingEvents = true;

        process.Start();
        _activeProcesses.TryAdd(mediaId, process);
        
        _ = Task.Run(async () => 
        {
            var errorOutput = await process.StandardError.ReadToEndAsync();
            if (!string.IsNullOrWhiteSpace(errorOutput) && process.ExitCode != 0)
            {
                _logger.LogError("FFmpeg failed for {MediaId}. Exit Code {Code}. Details: {Error}", mediaId, process.ExitCode, errorOutput);
            }
        });

        _logger.LogInformation("Started NVENC HLS Transcoding for {MediaId}", mediaId);
        
        await WaitForPlaylistAsync(playlistPath, cancellationToken);

        return playlistPath;
    }
    
    private async Task WaitForPlaylistAsync(string playlistPath, CancellationToken cancellationToken)
    {
        for (int i = 0; i < 50; i++)
        {
            if (File.Exists(playlistPath)) return;
            await Task.Delay(200, cancellationToken);
        }
        throw new TimeoutException("FFmpeg failed to generate the HLS playlist in time.");
    }

    public bool IsTranscoding(Guid mediaId) => _activeProcesses.ContainsKey(mediaId);

    public void StopTranscoding(Guid mediaId)
    {
        if (_activeProcesses.TryRemove(mediaId, out var process))
        {
            if (!process.HasExited)
            {
                process.Kill();
            }
            process.Dispose();
        }
    }

    public void Dispose()
    {
        foreach (var process in _activeProcesses.Values)
        {
            if (!process.HasExited) process.Kill();
            process.Dispose();
        }
    }
}