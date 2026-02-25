import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import shaka from 'shaka-player/dist/shaka-player.ui';
import { api, BASE_URL, type SubtitleDto, type TranscodeStatus } from '../api';

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
  const [subtitlesLoading, setSubtitlesLoading] = useState(true);
  const [activeSubtitleId, setActiveSubtitleId] = useState<string | null>(null);

  // Transcode state
  const [transcodeStatus, setTranscodeStatus] = useState<TranscodeStatus | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

    api.getSubtitles(mediaId).then(subs => {
      setSubtitles(subs);
      setSubtitlesLoading(false);
    });

    let cancelled = false;

    const checkAndLoad = async () => {
      while (!cancelled) {
        const status = await api.getTranscodeStatus(mediaId);
        if (cancelled) break;

        setTranscodeStatus(status);

        if (!status || status.status === 'Completed') {
          player.load(`${BASE_URL}/Streaming/hls/master/${mediaId}.m3u8`)
            .catch(err => console.error('Shaka load error:', err));
          break;
        }

        if (status.status === 'Failed') {
          break; // show error state, stop polling
        }

        // Still processing — poll every 3 seconds
        await new Promise<void>(resolve => {
          pollTimerRef.current = setTimeout(resolve, 3000);
        });
      }
    };

    checkAndLoad();

    return () => {
      cancelled = true;
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
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
      player.setTextVisibility(false);
      setActiveSubtitleId(null);
    } else {
      const trackUrl = `${BASE_URL}/Streaming/hls/${mediaId}/subtitles/${sub.id}`;
      try {
        const track = await player.addTextTrackAsync(trackUrl, sub.language, 'subtitle', 'text/vtt');
        player.selectTextTrack(track);
        player.setTextVisibility(true);
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

      {/* Transcode progress overlay */}
      {transcodeStatus && transcodeStatus.status !== 'Completed' && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.75)', gap: '20px', pointerEvents: 'none' }}>
          {transcodeStatus.status === 'Failed' ? (
            <span style={{ color: '#e50914', fontSize: '1.2rem' }}>Transcoding failed. Try again later.</span>
          ) : (
            <>
              <span style={{ color: '#fff', fontSize: '1.1rem' }}>Preparing video…</span>
              <div style={{ width: 280, height: 6, background: 'rgba(255,255,255,0.2)', borderRadius: 3 }}>
                <div style={{ height: '100%', width: `${transcodeStatus.percentageStatus}%`, background: '#e50914', borderRadius: 3, transition: 'width 0.5s' }} />
              </div>
              <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem' }}>{Math.round(transcodeStatus.percentageStatus)}%</span>
            </>
          )}
        </div>
      )}

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
            style={{
              ...btnStyle(CTRL_CC),
              fontSize: '0.75rem', fontWeight: 700,
              color: activeSubtitleId ? '#e50914' : 'white',
              borderColor: activeSubtitleId ? '#e50914' : (controlMode === 'controls' && controlFocusIndex === CTRL_CC ? '#fff' : 'transparent'),
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, lineHeight: 1.2,
            }}
            onClick={() => { setSubtitleMenuOpen(o => !o); setControlMode('subtitle-menu'); setSubtitleFocusIndex(0); }}
          >
            <span>CC</span>
            {activeSubtitleId && (
              <span style={{ fontSize: '0.55rem', letterSpacing: '0.06em', opacity: 0.85 }}>
                {subtitles.find(s => s.id === activeSubtitleId)?.language?.toUpperCase() ?? ''}
              </span>
            )}
          </button>
          <button style={btnStyle(CTRL_MUTE)} onClick={toggleMute}>{volumeIcon}</button>
          <button style={btnStyle(CTRL_FULLSCREEN)} onClick={toggleFullscreen}>{isFullscreen ? '✕FS' : '⛶'}</button>
        </div>
      </div>

      {/* ── SUBTITLE PANEL (centered glass card) ── */}
      {subtitleMenuOpen && controlsVisible && (
        <div
          className="subtitle-panel"
          style={{
            position: 'absolute',
            bottom: 148,
            left: '50%',
            width: 320,
            background: 'rgba(16,16,16,0.88)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            borderRadius: 16,
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 12px 48px rgba(0,0,0,0.75)',
            zIndex: 20,
            overflow: 'hidden',
          }}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div style={{
            padding: '14px 18px 12px',
            borderBottom: '1px solid rgba(255,255,255,0.07)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
              Subtitles
            </span>
            {activeSubtitleId && (
              <span style={{ fontSize: '0.68rem', background: '#e50914', color: '#fff', padding: '2px 9px', borderRadius: 99, fontWeight: 700, letterSpacing: '0.05em' }}>
                {subtitles.find(s => s.id === activeSubtitleId)?.language?.toUpperCase() ?? 'ON'}
              </span>
            )}
          </div>

          {/* Track list */}
          <div style={{ padding: '6px 0 8px', maxHeight: 260, overflowY: 'auto' }}>
            {subtitlesLoading ? (
              <div style={{ padding: '20px', color: 'rgba(255,255,255,0.35)', fontSize: '0.9rem', textAlign: 'center' }}>Loading…</div>
            ) : (
              [null, ...subtitles].map((sub, i) => {
                const isFocused = subtitleFocusIndex === i;
                const isActive = sub === null ? activeSubtitleId === null : activeSubtitleId === sub.id;
                const label = sub === null ? 'Off' : (sub.label || sub.language);
                return (
                  <div key={sub?.id ?? 'off'} style={{ padding: '2px 8px' }}>
                    <button
                      onClick={() => handleSubtitleSelect(sub)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        width: '100%', textAlign: 'left',
                        padding: '10px 12px',
                        background: isFocused ? 'rgba(255,255,255,0.93)' : 'transparent',
                        color: isFocused ? '#111' : isActive ? '#e50914' : 'rgba(255,255,255,0.82)',
                        border: 'none', cursor: 'pointer',
                        fontSize: '0.95rem',
                        fontWeight: isActive || isFocused ? 600 : 400,
                        transition: 'background 0.12s',
                        borderRadius: 9,
                      }}
                    >
                      <span style={{ width: 18, flexShrink: 0, fontSize: '0.85rem', color: isActive ? (isFocused ? '#111' : '#e50914') : 'transparent' }}>✓</span>
                      <span style={{ flex: 1 }}>{label}</span>
                      {isActive && !isFocused && (
                        <span style={{ fontSize: '0.62rem', background: 'rgba(229,9,20,0.15)', color: '#e50914', padding: '2px 7px', borderRadius: 99, fontWeight: 700 }}>
                          ACTIVE
                        </span>
                      )}
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer hint */}
          <div style={{ padding: '8px 18px 12px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.25)' }}>↑/↓ navigate · Enter select · ← close</span>
          </div>
        </div>
      )}
    </div>
  );
};
