namespace MediaServer.Domain.Entities;

public class SubtitleTrack
{
    public Guid Id { get; set; }
    public Guid MediaItemId { get; set; }
    public string Language { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
    public string FilePath { get; set; } = string.Empty;
}