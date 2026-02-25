using System.Collections.Concurrent;
using MediaServer.Application.DTOs;
using MediaServer.Application.Interfaces.Services;

namespace MediaServer.Infrastructure.Media;

public class TranscodeProgressCache : ITranscodeProgressCache
{
    private readonly ConcurrentDictionary<Guid, TranscodeStatus> _cache = new();
    
    public void ReportProgress(Guid mediaId, double percentage)
    {
        percentage = Math.Clamp(percentage, 0, 100);
        _cache[mediaId] = new TranscodeStatus
        {
            PercentageStatus = percentage, 
            Status = percentage >= 100 ? "Completed" : "Processing", 
            ErrorMessage = null
        };
    }

    public void ReportError(Guid mediaId, string errorMessage)
    {
        _cache[mediaId] = new TranscodeStatus
        {
            PercentageStatus = 0, 
            Status = "Failed", 
            ErrorMessage = errorMessage
        };
    }

    public void ClearProgress(Guid mediaId)
    {
        _cache.TryRemove(mediaId, out _);
    }

    public TranscodeStatus GetStatus(Guid mediaId)
    {
        if (_cache.TryGetValue(mediaId, out var status))
        {
            return status;
        }
        return new TranscodeStatus
        {
            PercentageStatus = 0, 
            Status = "Pending or Not Found", 
            ErrorMessage = null
        };
    }
}