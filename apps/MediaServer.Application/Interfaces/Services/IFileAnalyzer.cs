namespace MediaServer.Application.Interfaces.Services;

public interface IFileAnalyzer
{
    Task<(long SizeBytes, string VideoCodec)> AnalyzeFileAsync(string filePath);
    bool FileExists(string filePath);
}