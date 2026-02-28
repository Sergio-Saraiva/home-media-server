using System.Text.Json.Serialization;

namespace MediaServer.Infrastructure.Media;

public class FfProbeStream
{
    [JsonPropertyName("index")]
    public int Index { get; set; }

    [JsonPropertyName("codec_type")]
    public string CodecType { get; set; }

    [JsonPropertyName("codec_name")]
    public string CodecName { get; set; }

    [JsonPropertyName("color_transfer")]
    public string? ColorTransfer { get; set; }

    [JsonPropertyName("color_primaries")]
    public string? ColorPrimaries { get; set; }

    [JsonPropertyName("color_space")]
    public string? ColorSpace { get; set; }

    [JsonPropertyName("pix_fmt")]
    public string? PixFmt { get; set; }

    [JsonPropertyName("tags")]
    public FfProbeStreamTags? Tags { get; set; }
}