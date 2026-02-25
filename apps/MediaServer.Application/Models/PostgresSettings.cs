namespace MediaServer.Application.Models;

public class PostgresSettings
{
    public string Host { get; set; }
    public int Port { get; set; }
    public string Database { get; set; }
    public string User { get; set; }
    public string Password { get; set; }

    public string ConnectionString()
    {
        return $"Host={this.Host};Port={this.Port};Database={this.Database};Username={this.User};Password={this.Password}";
    }
}