using MediaServer.Application.Common.Events;

namespace MediaServer.Application.Interfaces.Queues;

public interface ITranscodeQueue
{
    public ValueTask QueueJobAsync(MediaIngestedEvent job, CancellationToken cancellationToken);

    public ValueTask<MediaIngestedEvent> DequeueAsync(CancellationToken cancellationToken);
}