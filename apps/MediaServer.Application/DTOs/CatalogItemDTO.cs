namespace MediaServer.Application.DTOs;

public class CatalogItemDTO
{
    public Guid Id { get; set; }
    public string Title { get; set; }
    public string Type { get; set; }
    public string? PosterPath { get; set; }
    public DateTime DateAdded { get; set; }
}