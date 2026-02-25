using MediatR;

namespace MediaServer.Application.Common.Events;

public class MediaIngestedEvent : INotification
{
    public Guid EventId { get; set; }
    public Guid MediaId { get; set; }
    public string FilePath { get; set; }
}