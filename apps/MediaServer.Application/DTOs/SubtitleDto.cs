namespace MediaServer.Application.DTOs;

public class SubtitleDto
{
    public Guid Id { get; set; }
    public string Language { get; set; }
    public string Label { get; set; }
    public string FilePath { get; set; }
}