using System.Text.Json.Serialization;

namespace MediaServer.Infrastructure.Media;

public class FfProbeStream
{
    [JsonPropertyName("codec_type")]
    public string CodecType { get; set; }
    
    [JsonPropertyName("codec_name")]
    public string CodecName { get; set; }
}