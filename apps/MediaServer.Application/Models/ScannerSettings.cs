namespace MediaServer.Application.Models;

public class ScannerSettings
{
    public string[] LibraryPaths { get; set; } = Array.Empty<string>();
    public int ScanIntervalMinutes { get; set; } = 15;
    public string[] SupportedExtensions { get; set; } = { ".mkv", ".mp4" };
}