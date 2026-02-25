using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Text.Json;
using MediaServer.Application.Interfaces.Services;

namespace MediaServer.Infrastructure.Media;

public class FfProbeFileAnalyzer : IFileAnalyzer
{
    public async Task<(long SizeBytes, string VideoCodec)> AnalyzeFileAsync(string filePath)
    {
        var fileInfo = new FileInfo(filePath);
        long sizeBytes = fileInfo.Length;
        
        bool isWindows = RuntimeInformation.IsOSPlatform(OSPlatform.Windows);
        string executable = isWindows ? "ffprobe.exe" : "/usr/bin/ffprobe";

        var processStartInfo = new ProcessStartInfo
        {
            FileName = executable,
            Arguments = $"-v quiet -print_format json -show_streams \"{filePath}\"",
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false,
            CreateNoWindow = true
        };
        
        using var process = new Process { StartInfo = processStartInfo };

        process.Start();
        var outputTask = process.StandardOutput.ReadToEndAsync();
        
        await process.WaitForExitAsync();

        if (process.ExitCode != 0)
        {
            var error = await process.StandardError.ReadToEndAsync();
            throw new InvalidOperationException($"ffprobe failed with exit code {process.ExitCode}: {error}");
        }

        var jsonOutput = await outputTask;

        var ffprobeData = JsonSerializer.Deserialize<FfProbeOutput>(jsonOutput);
        
        var videoStream = ffprobeData?.Streams.FirstOrDefault(s => s.CodecType == "video");
        var videoCodec = videoStream?.CodecName ?? "Unknown";
        
        return (sizeBytes, videoCodec);
    }

    public bool FileExists(string filePath)
    {
        return File.Exists(filePath);
    }
}