
using MediaServer.Application.DTOs;

namespace MediaServer.Application.Interfaces.Services;

public interface ITranscodeProgressCache
{
    void ReportProgress(Guid mediaId, double percentage);
    void ReportError(Guid mediaId, string errorMessage);
    void ClearProgress(Guid mediaId);
    TranscodeStatus GetStatus(Guid mediaId);
}