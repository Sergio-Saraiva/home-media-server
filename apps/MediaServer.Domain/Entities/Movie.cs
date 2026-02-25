namespace MediaServer.Domain.Entities;

public class Movie
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? PosterPath { get; set; }
    public DateTime CreatedAt { get; set; }
    public Guid MediaItemId { get; set; }
    public MediaItem MediaItem { get; set; } = null!;
}