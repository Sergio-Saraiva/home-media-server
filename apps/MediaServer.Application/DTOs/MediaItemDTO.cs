namespace MediaServer.Application.DTOs;

public record MediaItemDto
{
    public Guid Id { get; init; }
    public string Title { get; init; }
    public DateTime DateAdded { get; init; }
}