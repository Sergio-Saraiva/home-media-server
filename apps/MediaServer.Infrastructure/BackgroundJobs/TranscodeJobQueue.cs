using System.Threading.Channels;
using MediaServer.Application.Common.Events;
using MediaServer.Application.Interfaces.Queues;

namespace MediaServer.Infrastructure.BackgroundJobs;

public class TranscodeJobQueue : ITranscodeQueue
{
    private readonly Channel<MediaIngestedEvent> _queue;

    public TranscodeJobQueue()
    {
        var options = new BoundedChannelOptions(100) { FullMode = BoundedChannelFullMode.Wait };
        _queue = Channel.CreateBounded<MediaIngestedEvent>(options);
    }
    
    public async ValueTask QueueJobAsync(MediaIngestedEvent job, CancellationToken cancellationToken) 
    {
        await _queue.Writer.WriteAsync(job, cancellationToken);
    }
    
    public async ValueTask<MediaIngestedEvent> DequeueAsync(CancellationToken cancellationToken)
    {
        return await _queue.Reader.ReadAsync(cancellationToken);
    }
}