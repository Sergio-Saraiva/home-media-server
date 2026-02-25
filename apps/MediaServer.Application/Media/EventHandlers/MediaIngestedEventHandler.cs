using MediaServer.Application.Common.Events;
using MediaServer.Application.Interfaces.Queues;
using MediatR;

namespace MediaServer.Application.Media.EventHandlers;

public class MediaIngestedEventHandler : INotificationHandler<MediaIngestedEvent>
{
    private readonly ITranscodeQueue _transcodeJobQueue;
    
    public MediaIngestedEventHandler(ITranscodeQueue transcodeJobQueue)
    {
        _transcodeJobQueue = transcodeJobQueue;
    }
    
    public async Task Handle(MediaIngestedEvent notification, CancellationToken cancellationToken)
    {
        await _transcodeJobQueue.QueueJobAsync(notification, cancellationToken);
    }
}