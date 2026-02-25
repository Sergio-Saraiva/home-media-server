namespace MediaServer.Application.DTOs;

public record MediaItemDto
{
    public Guid Id { get; init; }
    public string Title { get; init; }
    public DateTime DateAdded { get; init; }
    public int? EpisodeNumber { get; init; }
    public int? SeasonNumber { get; init; }
}