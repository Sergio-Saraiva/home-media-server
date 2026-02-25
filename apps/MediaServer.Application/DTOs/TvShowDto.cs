namespace MediaServer.Application.DTOs;

public class TvShowDto
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? PosterPath { get; set; }
    public DateTime CreatedAt { get; set; }
    public IList<MediaItemDto> Episodes { get; set; } = new List<MediaItemDto>();
}