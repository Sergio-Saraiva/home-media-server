using MediaServer.Domain.Enums;

namespace MediaServer.Domain.Entities;

public class MediaItem
{
    public Guid Id { get; private set; }
    public string OriginalFileName { get; private set; } = string.Empty;
    public string FilePath { get; private set; } = string.Empty;
    public DateTime IngestedAt { get; private set; }

    // 1-to-N relationships: A file has many profiles and subtitles
    private readonly List<MediaProfile> _profiles = new();
    public IReadOnlyCollection<MediaProfile> Profiles => _profiles.AsReadOnly();

    private readonly List<SubtitleTrack> _subtitles = new();
    public IReadOnlyCollection<SubtitleTrack> Subtitles => _subtitles.AsReadOnly();

    // Logical Relationship: 1-to-1 with a Movie
    public Movie? Movie { get; private set; }

    // Logical Relationship: 1-to-N with a TvShow (This acts as an Episode)
    public Guid? TvShowId { get; private set; }
    public TvShow? TvShow { get; private set; }
    public int? SeasonNumber { get; private set; }
    public int? EpisodeNumber { get; private set; }

    private MediaItem() { }

    public static MediaItem Create(string fileName, string filePath)
    {
        return new MediaItem 
        { 
            Id = Guid.NewGuid(), 
            OriginalFileName = fileName, 
            FilePath = filePath, 
            IngestedAt = DateTime.UtcNow 
        };
    }

    public void LinkToShow(Guid showId, int season, int episode)
    {
        TvShowId = showId;
        SeasonNumber = season;
        EpisodeNumber = episode;
    }

    public void UnlinkFromShow()
    {
        TvShowId = null;
        TvShow = null;
        SeasonNumber = null;
        EpisodeNumber = null;
    }
}