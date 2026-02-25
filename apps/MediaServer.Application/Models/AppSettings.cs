namespace MediaServer.Application.Models;

public class AppSettings
{
    public PostgresSettings PostgresSettings { get; set; } = new();
    public ScannerSettings ScannerSettings { get; set; } = new();
}