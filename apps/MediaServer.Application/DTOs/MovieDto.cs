namespace MediaServer.Application.DTOs;

public class MovieDto
{
    public Guid Id { get; set; }
    public string Title { get; set; }
    public string Description { get; set; }
    public string PosterPath { get; set; } = string.Empty;
    public MediaItemDto MediaItem { get; set; }
    
}