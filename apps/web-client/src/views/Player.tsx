import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import shaka from 'shaka-player/dist/shaka-player.ui';
import { api, BASE_URL, type SubtitleDto } from '../api';

type ControlMode = 'playback' | 'controls' | 'subtitle-menu';

// Control bar button indices
const CTRL_BACK = 0;
const CTRL_SEEK_BACK = 1;
const CTRL_PLAY = 2;
const CTRL_SEEK_FWD = 3;
const CTRL_CC = 4;
const CTRL_MUTE = 5;
const CTRL_FULLSCREEN = 6;
const CTRL_COUNT = 7;

const formatTime = (seconds: number): string => {
  if (!isFinite(seconds) || isNaN(seconds)) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
};

export const Player = () => {
  const { mediaId } = useParams<{ mediaId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { title } = (location.state ?? {}) as { title?: string };

  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<shaka.Player | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [bufferedPercent, setBufferedPercent] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // UI / navigation state
  const [controlsVisible, setControlsVisible] = useState(true);
  const [controlMode, setControlMode] = useState<ControlMode>('playback');
  const [controlFocusIndex, setControlFocusIndex] = useState(CTRL_PLAY);
  const [subtitleMenuOpen, setSubtitleMenuOpen] = useState(false);
  const [subtitleFocusIndex, setSubtitleFocusIndex] = useState(0); // 0=Off, 1..n=tracks

  // Subtitle data
  const [subtitles, setSubtitles] = useState<SubtitleDto[]>([]);
  const [activeSubtitleId, setActiveSubtitleId] = useState<string | null>(null);

  // --- Auto-hide controls ---
  const showControls = useCallback(() => {
    setControlsVisible(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      setControlsVisible(false);
      setControlMode('playback');
      setSubtitleMenuOpen(false);
    }, 4000);
  }, []);

  // Keep controls visible while in controls or subtitle-menu mode
  const showControlsPersist = useCallback(() => {
    setControlsVisible(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    // Don't start auto-hide timer while user is navigating controls
  }, []);

  // --- Shaka Player init ---
  useEffect(() => {
    if (!videoRef.current || !mediaId) return;
    shaka.polyfill.installAll();
    const player = new shaka.Player(videoRef.current);
    playerRef.current = player;

    player.load(`${BASE_URL}/Streaming/hls/master/${mediaId}.m3u8`)
      .catch(err => console.error('Shaka load error:', err));

    api.getSubtitles(mediaId).then(setSubtitles);

    return () => {
      player.destroy();
      playerRef.current = null;
    };
  }, [mediaId]);

  // --- Video event listeners ---
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onTimeUpdate = () => setCurrentTime(video.currentTime);
    const onDuration = () => setDuration(video.duration);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onVolumeChange = () => { setVolume(video.volume); setIsMuted(video.muted); };
    const onProgress = () => {
      if (video.duration > 0 && video.buffered.length > 0)
        setBufferedPercent((video.buffered.end(video.buffered.length - 1) / video.duration) * 100);
    };

    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('durationchange', onDuration);
    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('volumechange', onVolumeChange);
    video.addEventListener('progress', onProgress);
    return () => {
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('durationchange', onDuration);
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('volumechange', onVolumeChange);
      video.removeEventListener('progress', onProgress);
    };
  }, []);

  // --- Fullscreen listener ---
  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  // --- Actions ---
  const togglePlayPause = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    v.paused ? v.play() : v.pause();
  }, []);

  const seekBy = useCallback((delta: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Math.max(0, Math.min(v.duration || 0, v.currentTime + delta));
  }, []);

  const toggleMute = useCallback(() => {
    if (videoRef.current) videoRef.current.muted = !videoRef.current.muted;
  }, []);

  const toggleFullscreen = useCallback(() => {
    const container = document.getElementById('player-container');
    if (!document.fullscreenElement) container?.requestFullscreen();
    else document.exitFullscreen();
  }, []);

  const activateControl = useCallback((index: number) => {
    switch (index) {
      case CTRL_BACK:       navigate(-1); break;
      case CTRL_SEEK_BACK:  seekBy(-10); break;
      case CTRL_PLAY:       togglePlayPause(); break;
      case CTRL_SEEK_FWD:   seekBy(10); break;
      case CTRL_CC:
        setSubtitleMenuOpen(true);
        setControlMode('subtitle-menu');
        setSubtitleFocusIndex(0);
        break;
      case CTRL_MUTE:       toggleMute(); break;
      case CTRL_FULLSCREEN: toggleFullscreen(); break;
    }
  }, [navigate, seekBy, togglePlayPause, toggleMute, toggleFullscreen]);

  const handleSubtitleSelect = useCallback(async (sub: SubtitleDto | null) => {
    const player = playerRef.current;
    if (!player) return;

    if (!sub) {
      (player as any).setTextTrackVisibility(false);
      setActiveSubtitleId(null);
    } else {
      const fileName = sub.filePath.split('/').pop()?.split('\\').pop();
      if (!fileName) return;
      const trackUrl = `${BASE_URL}/Streaming/hls/${mediaId}/${fileName}`;
      try {
        await player.addTextTrackAsync(trackUrl, sub.language, 'subtitle', 'text/vtt');
        const tracks = player.getTextTracks();
        const track = tracks.find(t => t.language === sub.language);
        if (track) {
          player.selectTextTrack(track);
          (player as any).setTextTrackVisibility(true);
        }
        setActiveSubtitleId(sub.id);
      } catch (err) {
        console.error('Failed to load subtitle track', err);
      }
    }
    setSubtitleMenuOpen(false);
    setControlMode('controls');
    showControlsPersist();
  }, [mediaId, showControlsPersist]);

  // --- Keyboard handler (state machine) ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key;
      const isBack = key === 'Escape' || key === 'Backspace' || e.keyCode === 10009;

      // Always: show controls, but persist if in controls/subtitle mode
      setControlMode(prev => {
        if (prev !== 'playback') {
          showControlsPersist();
          return prev;
        }
        showControls();
        return prev;
      });

      setControlMode(currentMode => {
        // ---- PLAYBACK MODE ----
        if (currentMode === 'playback') {
          if (isBack) { navigate(-1); return currentMode; }
          switch (key) {
            case ' ':
            case 'Enter':
              e.preventDefault();
              togglePlayPause();
              break;
            case 'ArrowLeft':
              e.preventDefault();
              seekBy(-10);
              break;
            case 'ArrowRight':
              e.preventDefault();
              seekBy(10);
              break;
            case 'ArrowUp':
              e.preventDefault();
              setControlFocusIndex(CTRL_PLAY);
              showControlsPersist();
              return 'controls';
            case 'ArrowDown':
              e.preventDefault();
              showControls();
              break;
          }
          return currentMode;
        }

        // ---- CONTROLS MODE ----
        if (currentMode === 'controls') {
          if (isBack || key === 'ArrowDown') {
            e.preventDefault();
            if (e.keyCode === 10009) { navigate(-1); return currentMode; }
            showControls(); // restart auto-hide
            return 'playback';
          }
          switch (key) {
            case 'ArrowLeft':
              e.preventDefault();
              setControlFocusIndex(prev => Math.max(0, prev - 1));
              break;
            case 'ArrowRight':
              e.preventDefault();
              setControlFocusIndex(prev => Math.min(CTRL_COUNT - 1, prev + 1));
              break;
            case 'Enter':
            case ' ':
              e.preventDefault();
              setControlFocusIndex(prev => { activateControl(prev); return prev; });
              break;
          }
          return currentMode;
        }

        // ---- SUBTITLE-MENU MODE ----
        if (currentMode === 'subtitle-menu') {
          if (e.keyCode === 10009) { navigate(-1); return currentMode; }
          if (isBack || key === 'ArrowLeft') {
            e.preventDefault();
            setSubtitleMenuOpen(false);
            return 'controls';
          }
          const total = subtitles.length + 1; // +1 for Off
          switch (key) {
            case 'ArrowUp':
              e.preventDefault();
              setSubtitleFocusIndex(prev => Math.max(0, prev - 1));
              break;
            case 'ArrowDown':
              e.preventDefault();
              setSubtitleFocusIndex(prev => Math.min(total - 1, prev + 1));
              break;
            case 'Enter':
              e.preventDefault();
              setSubtitleFocusIndex(prev => {
                const sub = prev === 0 ? null : subtitles[prev - 1];
                handleSubtitleSelect(sub);
                return prev;
              });
              break;
          }
          return currentMode;
        }

        return currentMode;
      });
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate, togglePlayPause, seekBy, activateControl, handleSubtitleSelect, subtitles, showControls, showControlsPersist]);

  // Initial show
  useEffect(() => {
    showControls();
    return () => { if (hideTimerRef.current) clearTimeout(hideTimerRef.current); };
  }, [showControls]);

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = progressRef.current?.getBoundingClientRect();
    if (!rect || !videoRef.current || !duration) return;
    const ratio = (e.clientX - rect.left) / rect.width;
    videoRef.current.currentTime = Math.max(0, Math.min(duration, ratio * duration));
  };

  const playedPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Button focus style helper
  const btnStyle = (index: number): React.CSSProperties => ({
    background: 'none',
    border: controlMode === 'controls' && controlFocusIndex === index
      ? '2px solid #fff'
      : '2px solid transparent',
    color: 'white',
    cursor: 'pointer',
    padding: '10px 14px',
    borderRadius: '6px',
    fontSize: index === CTRL_PLAY ? '1.5rem' : '1rem',
    transform: controlMode === 'controls' && controlFocusIndex === index ? 'scale(1.2)' : 'scale(1)',
    transition: 'transform 0.1s, border-color 0.1s',
    minWidth: index === CTRL_PLAY ? 52 : 44,
    lineHeight: 1,
  });

  const volumeIcon = isMuted || volume === 0 ? '🔇' : volume < 0.5 ? '🔉' : '🔊';

  return (
    <div
      id="player-container"
      style={{ position: 'fixed', inset: 0, background: '#000', cursor: controlsVisible ? 'default' : 'none', overflow: 'hidden' }}
      onMouseMove={showControls}
      onTouchStart={showControls}
      onClick={togglePlayPause}
    >
      {/* Video */}
      <video ref={videoRef} autoPlay style={{ width: '100%', height: '100%', objectFit: 'contain' }} />

      {/* Center pause icon — shown when paused and controls hidden */}
      {!isPlaying && !controlsVisible && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
          <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem' }}>▶</div>
        </div>
      )}

      {/* ── BOTTOM CONTROLS OVERLAY ── */}
      <div
        style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          opacity: controlsVisible ? 1 : 0,
          transition: 'opacity 0.3s',
          pointerEvents: controlsVisible ? 'auto' : 'none',
          background: 'linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.7) 60%, transparent 100%)',
          padding: '60px 28px 24px',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Title row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '10px' }}>
          {title && <span style={{ fontSize: '1rem', fontWeight: 600, color: 'rgba(255,255,255,0.85)', letterSpacing: '0.02em' }}>{title}</span>}
          <span style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.6)', marginLeft: 'auto' }}>
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        </div>

        {/* Progress bar */}
        <div
          ref={progressRef}
          className="progress-bar"
          style={{ position: 'relative', width: '100%', marginBottom: '16px', cursor: 'pointer', borderRadius: 4, background: 'rgba(255,255,255,0.18)' }}
          onClick={handleProgressClick}
        >
          <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${bufferedPercent}%`, background: 'rgba(255,255,255,0.3)', borderRadius: 4, pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${playedPercent}%`, background: '#e50914', borderRadius: 4, pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', top: '50%', left: `${playedPercent}%`, transform: 'translate(-50%, -50%)', width: 14, height: 14, borderRadius: '50%', background: '#e50914', boxShadow: '0 0 6px rgba(229,9,20,0.9)', pointerEvents: 'none' }} />
        </div>

        {/* Control buttons row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <button style={btnStyle(CTRL_BACK)} onClick={() => navigate(-1)}>← Back</button>
          <button style={btnStyle(CTRL_SEEK_BACK)} onClick={() => seekBy(-10)}>↺ 10</button>
          <button style={btnStyle(CTRL_PLAY)} onClick={togglePlayPause}>{isPlaying ? '⏸' : '▶'}</button>
          <button style={btnStyle(CTRL_SEEK_FWD)} onClick={() => seekBy(10)}>10 ↻</button>

          <div style={{ flex: 1 }} />

          <button
            style={{ ...btnStyle(CTRL_CC), fontSize: '0.8rem', fontWeight: 700, color: activeSubtitleId ? '#e50914' : 'white', borderColor: activeSubtitleId ? '#e50914' : (controlMode === 'controls' && controlFocusIndex === CTRL_CC ? '#fff' : 'transparent') }}
            onClick={() => { setSubtitleMenuOpen(o => !o); setControlMode('subtitle-menu'); setSubtitleFocusIndex(0); }}
          >
            CC
          </button>
          <button style={btnStyle(CTRL_MUTE)} onClick={toggleMute}>{volumeIcon}</button>
          <button style={btnStyle(CTRL_FULLSCREEN)} onClick={toggleFullscreen}>{isFullscreen ? '✕FS' : '⛶'}</button>
        </div>
      </div>

      {/* ── SUBTITLE SIDE PANEL ── */}
      {subtitleMenuOpen && controlsVisible && (
        <div
          style={{
            position: 'absolute', top: 0, right: 0, bottom: 0,
            width: 260, background: 'rgba(14,14,14,0.97)',
            borderLeft: '1px solid #2a2a2a',
            display: 'flex', flexDirection: 'column',
            zIndex: 20,
          }}
          onClick={e => e.stopPropagation()}
        >
          <div style={{ padding: '24px 20px 12px', borderBottom: '1px solid #2a2a2a' }}>
            <div style={{ fontSize: '0.75rem', color: '#666', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px' }}>Subtitles</div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
            {/* Off option */}
            {[null, ...subtitles].map((sub, i) => {
              const isFocused = subtitleFocusIndex === i;
              const isActive = sub === null ? activeSubtitleId === null : activeSubtitleId === sub.id;
              return (
                <button
                  key={sub?.id ?? 'off'}
                  onClick={() => handleSubtitleSelect(sub)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    width: '100%', textAlign: 'left',
                    padding: '14px 20px',
                    background: isFocused ? '#fff' : 'transparent',
                    color: isFocused ? '#000' : isActive ? '#e50914' : '#fff',
                    border: 'none', cursor: 'pointer',
                    fontSize: '1rem',
                    fontWeight: isActive ? 600 : 400,
                    transition: 'background 0.1s',
                  }}
                >
                  <span style={{ fontSize: '0.7rem' }}>{isActive ? '●' : '○'}</span>
                  <span>{sub === null ? 'Off' : `${sub.language}${sub.label ? ` (${sub.label})` : ''}`}</span>
                </button>
              );
            })}
          </div>

          <div style={{ padding: '16px 20px', borderTop: '1px solid #2a2a2a' }}>
            <span style={{ fontSize: '0.75rem', color: '#555' }}>↑/↓ navigate · Enter select · ← close</span>
          </div>
        </div>
      )}
    </div>
  );
};
