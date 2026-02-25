namespace MediaServer.Application.Interfaces.Services;

public interface ITranscodeManager
{
    Task<string> StartTranscodingAsync(Guid mediaId, string inputFilePath, CancellationToken cancellationToken);
    bool IsTranscoding(Guid mediaId);
    void StopTranscoding(Guid mediaId);
}