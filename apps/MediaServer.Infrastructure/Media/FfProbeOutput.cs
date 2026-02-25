using System.Text.Json.Serialization;

namespace MediaServer.Infrastructure.Media;

public class FfProbeOutput
{
    [JsonPropertyName("streams")]
    public List<FfProbeStream> Streams { get; set; }
}