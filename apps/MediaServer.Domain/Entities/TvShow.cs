namespace MediaServer.Domain.Entities;

public class TvShow
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? PosterPath { get; set; }
    public DateTime CreatedAt { get; set; }
    public List<MediaItem> Episodes { get; set; } = new();
    
}