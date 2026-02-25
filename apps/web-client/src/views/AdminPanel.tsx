import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, type MediaItemDto, type SubtitleDto } from '../api';

// ── Library tab types ────────────────────────────────────────────────────────
interface ItemState {
  expanded: boolean;
  subtitles: SubtitleDto[];
  loading: boolean;
  uploadFile: File | null;
  uploadLang: string;
  uploading: boolean;
}

const defaultItemState = (): ItemState => ({
  expanded: false,
  subtitles: [],
  loading: false,
  uploadFile: null,
  uploadLang: 'English',
  uploading: false,
});

// ── Shared style helpers ─────────────────────────────────────────────────────
const inputStyle: React.CSSProperties = {
  background: '#2a2a2a',
  border: '1px solid #444',
  color: '#fff',
  padding: '10px 14px',
  borderRadius: '6px',
  fontSize: '0.9rem',
  width: '100%',
};

const labelStyle: React.CSSProperties = {
  fontSize: '0.78rem',
  color: '#888',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.07em',
  marginBottom: '6px',
  display: 'block',
};

const fieldWrap: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '6px',
};

type Tab = 'library' | 'add-movie' | 'add-tv-show';

// ── Component ────────────────────────────────────────────────────────────────
export const AdminPanel = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('library');

  // Shared media list (used by both form tabs)
  const [mediaItems, setMediaItems] = useState<MediaItemDto[]>([]);

  useEffect(() => {
    api.listMedia().then(setMediaItems);
  }, []);

  return (
    <div style={{ minHeight: '100vh', padding: '40px 5%', maxWidth: '960px', margin: '0 auto' }}>
      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '32px' }}>
        <button
          onClick={() => navigate(-1)}
          style={{ background: 'none', color: '#aaa', border: 'none', cursor: 'pointer', fontSize: '1rem' }}
        >
          ← Back
        </button>
        <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: 700 }}>Admin Panel</h1>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '28px', borderBottom: '1px solid #2a2a2a', paddingBottom: '0' }}>
        {(['library', 'add-movie', 'add-tv-show'] as Tab[]).map(tab => {
          const labels: Record<Tab, string> = { library: 'Library', 'add-movie': 'Add Movie', 'add-tv-show': 'Add TV Show' };
          const active = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                background: 'none',
                border: 'none',
                borderBottom: active ? '2px solid #e50914' : '2px solid transparent',
                color: active ? '#fff' : '#666',
                cursor: 'pointer',
                padding: '10px 20px',
                fontSize: '0.95rem',
                fontWeight: active ? 600 : 400,
                transition: 'color 0.15s',
                marginBottom: '-1px',
              }}
            >
              {labels[tab]}
            </button>
          );
        })}
      </div>

      {activeTab === 'library' && <LibraryTab mediaItems={mediaItems} />}
      {activeTab === 'add-movie' && <AddMovieTab mediaItems={mediaItems} />}
      {activeTab === 'add-tv-show' && <AddTvShowTab mediaItems={mediaItems} />}
    </div>
  );
};

// ── Library tab ──────────────────────────────────────────────────────────────
const LibraryTab = ({ mediaItems }: { mediaItems: MediaItemDto[] }) => {
  const [itemStates, setItemStates] = useState<Record<string, ItemState>>({});

  useEffect(() => {
    const states: Record<string, ItemState> = {};
    mediaItems.forEach(item => { states[item.id] = defaultItemState(); });
    setItemStates(states);
  }, [mediaItems]);

  const updateItem = (id: string, patch: Partial<ItemState>) => {
    setItemStates(prev => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  };

  const toggleExpand = async (item: MediaItemDto) => {
    const state = itemStates[item.id];
    if (!state) return;
    if (state.expanded) { updateItem(item.id, { expanded: false }); return; }
    updateItem(item.id, { expanded: true, loading: true });
    const subs = await api.getSubtitles(item.id);
    updateItem(item.id, { subtitles: subs, loading: false });
  };

  const handleUpload = async (item: MediaItemDto) => {
    const state = itemStates[item.id];
    if (!state?.uploadFile) return;
    updateItem(item.id, { uploading: true });
    const success = await api.uploadSubtitle(item.id, state.uploadFile, state.uploadLang);
    if (success) {
      const subs = await api.getSubtitles(item.id);
      updateItem(item.id, { subtitles: subs, uploadFile: null, uploading: false });
    } else {
      updateItem(item.id, { uploading: false });
      alert('Upload failed.');
    }
  };

  return (
    <>
      <h2 style={{ fontSize: '1.1rem', color: '#aaa', fontWeight: 400, marginBottom: '20px', borderBottom: '1px solid #333', paddingBottom: '10px' }}>
        Media Library — {mediaItems.length} items
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {mediaItems.map(item => {
          const state = itemStates[item.id] ?? defaultItemState();
          return (
            <div key={item.id} style={{ background: '#1a1a1a', borderRadius: '8px', overflow: 'hidden', border: '1px solid #2a2a2a' }}>
              <div
                onClick={() => toggleExpand(item)}
                style={{ display: 'flex', alignItems: 'center', padding: '16px 20px', cursor: 'pointer', gap: '12px' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#222')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <span style={{ color: state.expanded ? '#e50914' : '#aaa', fontSize: '0.9rem', width: '16px' }}>
                  {state.expanded ? '▼' : '▶'}
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500, fontSize: '1rem' }}>{item.title ?? item.id}</div>
                  <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '2px' }}>
                    Added {new Date(item.dateAdded).toLocaleDateString()}
                  </div>
                </div>
              </div>

              {state.expanded && (
                <div style={{ borderTop: '1px solid #2a2a2a', padding: '16px 20px' }}>
                  {state.loading ? (
                    <p style={{ color: '#666', fontSize: '0.9rem' }}>Loading subtitles…</p>
                  ) : (
                    <>
                      <h4 style={{ margin: '0 0 10px 0', color: '#aaa', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Subtitle Tracks ({state.subtitles.length})
                      </h4>
                      {state.subtitles.length === 0 ? (
                        <p style={{ color: '#555', fontSize: '0.9rem', marginBottom: '16px' }}>No subtitles yet.</p>
                      ) : (
                        <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 20px 0' }}>
                          {state.subtitles.map(sub => (
                            <li key={sub.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0', borderBottom: '1px solid #222' }}>
                              <span style={{ color: '#e50914', fontSize: '0.8rem' }}>CC</span>
                              <span style={{ fontWeight: 500 }}>{sub.language}</span>
                              {sub.label && <span style={{ color: '#777', fontSize: '0.85rem' }}>({sub.label})</span>}
                            </li>
                          ))}
                        </ul>
                      )}
                      <h4 style={{ margin: '0 0 10px 0', color: '#aaa', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Upload Subtitle
                      </h4>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'flex-end' }}>
                        <input
                          type="text"
                          placeholder="Language (e.g. English, PT-BR)"
                          value={state.uploadLang}
                          onChange={e => updateItem(item.id, { uploadLang: e.target.value })}
                          style={{ ...inputStyle, width: '220px' }}
                        />
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#2a2a2a', border: '1px solid #444', padding: '10px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.9rem', color: state.uploadFile ? '#fff' : '#777' }}>
                          {state.uploadFile ? state.uploadFile.name : '📁 Choose file (.srt / .vtt)'}
                          <input type="file" accept=".srt,.vtt" style={{ display: 'none' }} onChange={e => updateItem(item.id, { uploadFile: e.target.files?.[0] ?? null })} />
                        </label>
                        <button
                          onClick={() => handleUpload(item)}
                          disabled={!state.uploadFile || state.uploading}
                          style={{ background: state.uploadFile && !state.uploading ? '#e50914' : '#444', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: state.uploadFile && !state.uploading ? 'pointer' : 'not-allowed', fontWeight: 600, fontSize: '0.9rem' }}
                        >
                          {state.uploading ? 'Uploading…' : 'Upload'}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {mediaItems.length === 0 && (
          <p style={{ color: '#555', textAlign: 'center', padding: '40px' }}>No media items found.</p>
        )}
      </div>
    </>
  );
};

// ── Add Movie tab ────────────────────────────────────────────────────────────
const AddMovieTab = ({ mediaItems }: { mediaItems: MediaItemDto[] }) => {
  const [selectedMediaId, setSelectedMediaId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [posterPath, setPosterPath] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null);

  const reset = () => {
    setSelectedMediaId('');
    setTitle('');
    setDescription('');
    setPosterPath('');
    setFeedback(null);
  };

  const handleSubmit = async () => {
    if (!selectedMediaId || !title.trim()) {
      setFeedback({ ok: false, msg: 'Media file and title are required.' });
      return;
    }
    setSubmitting(true);
    setFeedback(null);
    const result = await api.createMovie(selectedMediaId, title.trim(), description.trim(), posterPath.trim());
    setSubmitting(false);
    if (result) {
      setFeedback({ ok: true, msg: `Movie "${result.title}" created successfully.` });
      reset();
    } else {
      setFeedback({ ok: false, msg: 'Failed to create movie. Check the API response.' });
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '640px' }}>
      <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 600 }}>Add Movie</h2>

      {feedback && (
        <div style={{ padding: '12px 16px', borderRadius: '8px', background: feedback.ok ? 'rgba(34,197,94,0.12)' : 'rgba(229,9,20,0.12)', border: `1px solid ${feedback.ok ? '#22c55e' : '#e50914'}`, color: feedback.ok ? '#4ade80' : '#f87171', fontSize: '0.9rem' }}>
          {feedback.msg}
        </div>
      )}

      <div style={fieldWrap}>
        <label style={labelStyle}>Media File *</label>
        <select
          value={selectedMediaId}
          onChange={e => setSelectedMediaId(e.target.value)}
          style={{ ...inputStyle, cursor: 'pointer' }}
        >
          <option value="">— select a media file —</option>
          {mediaItems.map(item => (
            <option key={item.id} value={item.id}>{item.title ?? item.id}</option>
          ))}
        </select>
      </div>

      <div style={fieldWrap}>
        <label style={labelStyle}>Title *</label>
        <input
          type="text"
          placeholder="e.g. Inception"
          value={title}
          onChange={e => setTitle(e.target.value)}
          style={inputStyle}
        />
      </div>

      <div style={fieldWrap}>
        <label style={labelStyle}>Description</label>
        <textarea
          placeholder="Short plot summary…"
          value={description}
          onChange={e => setDescription(e.target.value)}
          rows={4}
          style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }}
        />
      </div>

      <div style={fieldWrap}>
        <label style={labelStyle}>Poster URL</label>
        <input
          type="text"
          placeholder="https://…"
          value={posterPath}
          onChange={e => setPosterPath(e.target.value)}
          style={inputStyle}
        />
        {posterPath && (
          <img
            src={posterPath}
            alt="poster preview"
            style={{ width: 120, borderRadius: 8, marginTop: 8, border: '1px solid #333', objectFit: 'cover' }}
            onError={e => (e.currentTarget.style.display = 'none')}
          />
        )}
      </div>

      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        <button
          onClick={handleSubmit}
          disabled={submitting}
          style={{ background: submitting ? '#444' : '#e50914', color: '#fff', border: 'none', padding: '12px 28px', borderRadius: '6px', cursor: submitting ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: '1rem' }}
        >
          {submitting ? 'Creating…' : 'Create Movie'}
        </button>
        <button
          onClick={reset}
          style={{ background: 'none', color: '#666', border: '1px solid #333', padding: '12px 20px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.9rem' }}
        >
          Clear
        </button>
      </div>
    </div>
  );
};

// ── Add TV Show tab ──────────────────────────────────────────────────────────
const AddTvShowTab = ({ mediaItems }: { mediaItems: MediaItemDto[] }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [posterPath, setPosterPath] = useState('');
  const [selectedEpisodeIds, setSelectedEpisodeIds] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null);

  const toggleEpisode = (id: string) => {
    setSelectedEpisodeIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const reset = () => {
    setTitle('');
    setDescription('');
    setPosterPath('');
    setSelectedEpisodeIds(new Set());
    setFeedback(null);
  };

  const handleSubmit = async () => {
    if (!title.trim() || selectedEpisodeIds.size === 0) {
      setFeedback({ ok: false, msg: 'Title and at least one episode are required.' });
      return;
    }
    setSubmitting(true);
    setFeedback(null);
    const result = await api.createTvShow(title.trim(), description.trim(), posterPath.trim(), [...selectedEpisodeIds]);
    setSubmitting(false);
    if (result) {
      setFeedback({ ok: true, msg: `TV show "${result.title}" created with ${result.episodes?.length ?? 0} episodes.` });
      reset();
    } else {
      setFeedback({ ok: false, msg: 'Failed to create TV show. Check the API response.' });
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '640px' }}>
      <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 600 }}>Add TV Show</h2>

      {feedback && (
        <div style={{ padding: '12px 16px', borderRadius: '8px', background: feedback.ok ? 'rgba(34,197,94,0.12)' : 'rgba(229,9,20,0.12)', border: `1px solid ${feedback.ok ? '#22c55e' : '#e50914'}`, color: feedback.ok ? '#4ade80' : '#f87171', fontSize: '0.9rem' }}>
          {feedback.msg}
        </div>
      )}

      <div style={fieldWrap}>
        <label style={labelStyle}>Title *</label>
        <input
          type="text"
          placeholder="e.g. Breaking Bad"
          value={title}
          onChange={e => setTitle(e.target.value)}
          style={inputStyle}
        />
      </div>

      <div style={fieldWrap}>
        <label style={labelStyle}>Description</label>
        <textarea
          placeholder="Short series summary…"
          value={description}
          onChange={e => setDescription(e.target.value)}
          rows={4}
          style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }}
        />
      </div>

      <div style={fieldWrap}>
        <label style={labelStyle}>Poster URL</label>
        <input
          type="text"
          placeholder="https://…"
          value={posterPath}
          onChange={e => setPosterPath(e.target.value)}
          style={inputStyle}
        />
        {posterPath && (
          <img
            src={posterPath}
            alt="poster preview"
            style={{ width: 120, borderRadius: 8, marginTop: 8, border: '1px solid #333', objectFit: 'cover' }}
            onError={e => (e.currentTarget.style.display = 'none')}
          />
        )}
      </div>

      <div style={fieldWrap}>
        <label style={labelStyle}>
          Episodes * — {selectedEpisodeIds.size} selected
        </label>
        <div style={{ border: '1px solid #333', borderRadius: '8px', overflow: 'hidden', maxHeight: 320, overflowY: 'auto' }}>
          {mediaItems.length === 0 && (
            <p style={{ color: '#555', padding: '20px', margin: 0, fontSize: '0.9rem' }}>No media files found.</p>
          )}
          {mediaItems.map((item, i) => {
            const checked = selectedEpisodeIds.has(item.id);
            return (
              <label
                key={item.id}
                style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '12px 16px', cursor: 'pointer', background: checked ? 'rgba(229,9,20,0.08)' : i % 2 === 0 ? '#1a1a1a' : '#1e1e1e', borderBottom: '1px solid #2a2a2a', transition: 'background 0.1s' }}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleEpisode(item.id)}
                  style={{ accentColor: '#e50914', width: 16, height: 16, flexShrink: 0, cursor: 'pointer' }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: checked ? 500 : 400, color: checked ? '#fff' : '#ccc', fontSize: '0.95rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.title ?? item.id}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#555', marginTop: '2px' }}>
                    Added {new Date(item.dateAdded).toLocaleDateString()}
                  </div>
                </div>
              </label>
            );
          })}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        <button
          onClick={handleSubmit}
          disabled={submitting}
          style={{ background: submitting ? '#444' : '#e50914', color: '#fff', border: 'none', padding: '12px 28px', borderRadius: '6px', cursor: submitting ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: '1rem' }}
        >
          {submitting ? 'Creating…' : 'Create TV Show'}
        </button>
        <button
          onClick={reset}
          style={{ background: 'none', color: '#666', border: '1px solid #333', padding: '12px 20px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.9rem' }}
        >
          Clear
        </button>
      </div>
    </div>
  );
};
