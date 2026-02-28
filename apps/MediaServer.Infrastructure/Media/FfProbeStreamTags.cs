using System.Text.Json.Serialization;

namespace MediaServer.Infrastructure.Media;

public class FfProbeStreamTags
{
    [JsonPropertyName("language")]
    public string? Language { get; set; }

    [JsonPropertyName("title")]
    public string? Title { get; set; }
}
