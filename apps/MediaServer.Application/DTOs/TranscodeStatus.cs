namespace MediaServer.Application.DTOs;

public class TranscodeStatus
{
    public double PercentageStatus { get; set; }
    public string Status { get; set; }
    public string? ErrorMessage { get; set; }
}