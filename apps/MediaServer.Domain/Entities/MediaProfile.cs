namespace MediaServer.Domain.Entities;

public class MediaProfile
{
    public Guid Id { get; set; }
    public Guid MediaItemId { get; set; }
    public string VideoCodec { get; set; } = string.Empty;
    public string Resolution { get; set; } = string.Empty;
    public bool IsHdr { get; set; }
    public string PlaylistFilePath { get; set; } = string.Empty;
}