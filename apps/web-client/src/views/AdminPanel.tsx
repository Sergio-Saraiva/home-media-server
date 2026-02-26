import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, type CatalogItemDTO, type MediaItemDto, type SubtitleDto, type TranscodeStatus } from '../api';
import { TranscodeBadge } from '../components/TranscodeBadge';

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

type Tab = 'library' | 'add-movie' | 'add-tv-show' | 'manage';

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
        {(['library', 'add-movie', 'add-tv-show', 'manage'] as Tab[]).map(tab => {
          const labels: Record<Tab, string> = { library: 'Library', 'add-movie': 'Add Movie', 'add-tv-show': 'Add TV Show', manage: 'Manage' };
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
      {activeTab === 'manage' && <ManageTab />}
    </div>
  );
};

// ── Library tab ──────────────────────────────────────────────────────────────
const LibraryTab = ({ mediaItems }: { mediaItems: MediaItemDto[] }) => {
  const [itemStates, setItemStates] = useState<Record<string, ItemState>>({});
  const [txStatuses, setTxStatuses] = useState<Record<string, TranscodeStatus | null | undefined>>({});

  useEffect(() => {
    const states: Record<string, ItemState> = {};
    mediaItems.forEach(item => { states[item.id] = defaultItemState(); });
    setItemStates(states);
  }, [mediaItems]);

  useEffect(() => {
    if (mediaItems.length === 0) return;
    let cancelled = false;
    const known: Record<string, TranscodeStatus | null> = {};

    const poll = async () => {
      const toFetch = mediaItems.filter(item => {
        const s = known[item.id];
        return s?.status !== 'Completed' && s?.status !== 'Failed';
      });
      if (toFetch.length === 0) return;

      const entries = await Promise.all(
        toFetch.map(item => api.getTranscodeStatus(item.id).then(s => [item.id, s] as const))
      );
      if (cancelled) return;

      entries.forEach(([id, s]) => { known[id] = s; });
      setTxStatuses({ ...known });

      if (Object.values(known).some(s => s?.status !== 'Completed' && s?.status !== 'Failed'))
        setTimeout(poll, 5000);
    };

    poll();
    return () => { cancelled = true; };
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
                <TranscodeBadge status={txStatuses[item.id]} />
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
  const [orderedEpisodeIds, setOrderedEpisodeIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null);

  const toggleEpisode = (id: string) => {
    setOrderedEpisodeIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const moveEpisode = (id: string, dir: -1 | 1) => {
    setOrderedEpisodeIds(prev => {
      const idx = prev.indexOf(id);
      if (idx < 0) return prev;
      const next = [...prev];
      const swapIdx = idx + dir;
      if (swapIdx < 0 || swapIdx >= next.length) return prev;
      [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
      return next;
    });
  };

  const reset = () => {
    setTitle('');
    setDescription('');
    setPosterPath('');
    setOrderedEpisodeIds([]);
    setFeedback(null);
  };

  const handleSubmit = async () => {
    if (!title.trim() || orderedEpisodeIds.length === 0) {
      setFeedback({ ok: false, msg: 'Title and at least one episode are required.' });
      return;
    }
    setSubmitting(true);
    setFeedback(null);
    const result = await api.createTvShow(title.trim(), description.trim(), posterPath.trim(), orderedEpisodeIds);
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
          Episodes * — {orderedEpisodeIds.length} selected
        </label>
        <p style={{ margin: '0 0 8px', fontSize: '0.78rem', color: '#555' }}>
          Check to add in order. Use ↑↓ to reorder. Episode numbers follow this sequence.
        </p>
        <div style={{ border: '1px solid #333', borderRadius: '8px', overflow: 'hidden', maxHeight: 360, overflowY: 'auto' }}>
          {mediaItems.length === 0 && (
            <p style={{ color: '#555', padding: '20px', margin: 0, fontSize: '0.9rem' }}>No media files found.</p>
          )}
          {mediaItems.map((item, i) => {
            const epIdx = orderedEpisodeIds.indexOf(item.id);
            const checked = epIdx !== -1;
            const epNum = epIdx + 1;
            return (
              <div
                key={item.id}
                style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', background: checked ? 'rgba(229,9,20,0.08)' : i % 2 === 0 ? '#1a1a1a' : '#1e1e1e', borderBottom: '1px solid #2a2a2a', transition: 'background 0.1s' }}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleEpisode(item.id)}
                  style={{ accentColor: '#e50914', width: 16, height: 16, flexShrink: 0, cursor: 'pointer' }}
                />
                {/* Episode number badge */}
                <div style={{ width: 28, flexShrink: 0, textAlign: 'center' }}>
                  {checked && (
                    <span style={{ background: '#e50914', color: '#fff', fontSize: '0.68rem', fontWeight: 700, padding: '2px 5px', borderRadius: 4 }}>
                      E{epNum}
                    </span>
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => toggleEpisode(item.id)}>
                  <div style={{ fontWeight: checked ? 500 : 400, color: checked ? '#fff' : '#ccc', fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.title ?? item.id}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#555', marginTop: '2px' }}>
                    Added {new Date(item.dateAdded).toLocaleDateString()}
                  </div>
                </div>
                {/* Reorder buttons — only when selected */}
                {checked && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flexShrink: 0 }}>
                    <button
                      onClick={() => moveEpisode(item.id, -1)}
                      disabled={epIdx === 0}
                      title="Move up"
                      style={{ background: 'none', border: '1px solid #444', color: epIdx === 0 ? '#444' : '#aaa', borderRadius: 3, width: 22, height: 20, cursor: epIdx === 0 ? 'default' : 'pointer', fontSize: '0.65rem', lineHeight: 1, padding: 0 }}
                    >▲</button>
                    <button
                      onClick={() => moveEpisode(item.id, 1)}
                      disabled={epIdx === orderedEpisodeIds.length - 1}
                      title="Move down"
                      style={{ background: 'none', border: '1px solid #444', color: epIdx === orderedEpisodeIds.length - 1 ? '#444' : '#aaa', borderRadius: 3, width: 22, height: 20, cursor: epIdx === orderedEpisodeIds.length - 1 ? 'default' : 'pointer', fontSize: '0.65rem', lineHeight: 1, padding: 0 }}
                    >▼</button>
                  </div>
                )}
              </div>
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

// ── Manage tab ────────────────────────────────────────────────────────────────
const ManageTab = () => {
  const [catalog, setCatalog] = useState<CatalogItemDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Episode reorder state
  const [expandedShowId, setExpandedShowId] = useState<string | null>(null);
  const [episodeOrder, setEpisodeOrder] = useState<MediaItemDto[]>([]);
  const [loadingEpisodes, setLoadingEpisodes] = useState(false);
  const [reorderSaving, setReorderSaving] = useState(false);
  const [reorderFeedback, setReorderFeedback] = useState<{ ok: boolean; msg: string } | null>(null);

  useEffect(() => {
    api.getCatalog().then(data => { setCatalog(data); setLoading(false); });
  }, []);

  const handleDelete = async (item: CatalogItemDTO) => {
    setDeleting(item.id);
    const ok = item.type === 'Movie'
      ? await api.deleteMovie(item.id)
      : await api.deleteTvShow(item.id);
    setDeleting(null);
    setConfirmId(null);
    if (ok) {
      setCatalog(prev => prev.filter(c => c.id !== item.id));
      if (expandedShowId === item.id) setExpandedShowId(null);
    }
  };

  const toggleEpisodePanel = async (showId: string) => {
    if (expandedShowId === showId) {
      setExpandedShowId(null);
      setReorderFeedback(null);
      return;
    }
    setExpandedShowId(showId);
    setReorderFeedback(null);
    setLoadingEpisodes(true);
    const show = await api.getTvShow(showId);
    setLoadingEpisodes(false);
    setEpisodeOrder(show?.episodes ?? []);
  };

  const moveEpisodeInOrder = (idx: number, dir: -1 | 1) => {
    setEpisodeOrder(prev => {
      const next = [...prev];
      const swapIdx = idx + dir;
      if (swapIdx < 0 || swapIdx >= next.length) return prev;
      [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
      return next;
    });
  };

  const handleSaveOrder = async (showId: string) => {
    setReorderSaving(true);
    setReorderFeedback(null);
    const result = await api.reorderTvShowEpisodes(showId, episodeOrder.map(e => e.id));
    setReorderSaving(false);
    if (result) {
      setEpisodeOrder(result.episodes ?? []);
      setReorderFeedback({ ok: true, msg: 'Episode order saved.' });
    } else {
      setReorderFeedback({ ok: false, msg: 'Failed to save order.' });
    }
  };

  const movies = catalog.filter(c => c.type === 'Movie');
  const shows = catalog.filter(c => c.type === 'Show');

  if (loading) {
    return <p style={{ color: '#555', padding: '20px 0' }}>Loading…</p>;
  }

  const renderSection = (sectionTitle: string, items: CatalogItemDTO[]) => (
    <div style={{ marginBottom: 40 }}>
      <h3 style={{ margin: '0 0 14px', fontSize: '0.78rem', fontWeight: 700, color: '#777', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
        {sectionTitle} ({items.length})
      </h3>
      {items.length === 0 ? (
        <p style={{ color: '#444', fontSize: '0.9rem' }}>None yet.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {items.map(item => {
            const isConfirming = confirmId === item.id;
            const isDeleting = deleting === item.id;
            const isExpanded = expandedShowId === item.id;
            return (
              <div key={item.id}>
                <div
                  style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    background: isConfirming ? 'rgba(229,9,20,0.07)' : '#1a1a1a',
                    border: isConfirming ? '1px solid rgba(229,9,20,0.4)' : isExpanded ? '1px solid #444' : '1px solid #2a2a2a',
                    borderRadius: isExpanded ? '8px 8px 0 0' : 8,
                    padding: '12px 16px',
                    transition: 'background 0.15s, border-color 0.15s',
                  }}
                >
                  {/* Poster thumbnail */}
                  {item.posterPath ? (
                    <img src={item.posterPath} alt="" style={{ width: 36, height: 54, objectFit: 'cover', borderRadius: 4, flexShrink: 0 }} />
                  ) : (
                    <div style={{ width: 36, height: 54, borderRadius: 4, background: '#2a2a2a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0 }}>
                      {item.type === 'Movie' ? '🎬' : '📺'}
                    </div>
                  )}

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 500, fontSize: '0.95rem', color: '#f0f0f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.title ?? '—'}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#555', marginTop: 2 }}>
                      Added {new Date(item.dateAdded).toLocaleDateString()}
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    {/* Edit Episodes button — TV shows only */}
                    {item.type === 'Show' && !isConfirming && (
                      <button
                        onClick={() => toggleEpisodePanel(item.id)}
                        style={{ background: isExpanded ? '#2a2a2a' : 'none', color: isExpanded ? '#fff' : '#888', border: '1px solid #333', padding: '6px 12px', borderRadius: 5, cursor: 'pointer', fontSize: '0.78rem', transition: 'color 0.15s' }}
                      >
                        {isExpanded ? 'Close' : 'Edit Episodes'}
                      </button>
                    )}
                    {isConfirming ? (
                      <>
                        <span style={{ fontSize: '0.82rem', color: '#f87171' }}>Delete permanently?</span>
                        <button
                          onClick={() => handleDelete(item)}
                          disabled={isDeleting}
                          style={{ background: '#e50914', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: 5, cursor: isDeleting ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: '0.82rem' }}
                        >
                          {isDeleting ? '…' : 'Yes, delete'}
                        </button>
                        <button
                          onClick={() => setConfirmId(null)}
                          style={{ background: 'none', color: '#888', border: '1px solid #333', padding: '6px 12px', borderRadius: 5, cursor: 'pointer', fontSize: '0.82rem' }}
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => setConfirmId(item.id)}
                        style={{ background: 'none', color: '#666', border: '1px solid #333', padding: '6px 14px', borderRadius: 5, cursor: 'pointer', fontSize: '0.82rem', transition: 'color 0.15s, border-color 0.15s' }}
                        onMouseEnter={e => { e.currentTarget.style.color = '#f87171'; e.currentTarget.style.borderColor = '#f87171'; }}
                        onMouseLeave={e => { e.currentTarget.style.color = '#666'; e.currentTarget.style.borderColor = '#333'; }}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>

                {/* Episode reorder panel */}
                {isExpanded && (
                  <div style={{ background: '#141414', border: '1px solid #444', borderTop: 'none', borderRadius: '0 0 8px 8px', padding: '16px' }}>
                    {loadingEpisodes ? (
                      <p style={{ color: '#555', margin: 0, fontSize: '0.9rem' }}>Loading episodes…</p>
                    ) : episodeOrder.length === 0 ? (
                      <p style={{ color: '#555', margin: 0, fontSize: '0.9rem' }}>No episodes found.</p>
                    ) : (
                      <>
                        <p style={{ margin: '0 0 12px', fontSize: '0.78rem', color: '#666' }}>
                          Drag or use ↑↓ to reorder. Click Save to apply.
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 14 }}>
                          {episodeOrder.map((ep, idx) => (
                            <div key={ep.id} style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#1e1e1e', borderRadius: 6, padding: '8px 12px', border: '1px solid #2a2a2a' }}>
                              <span style={{ background: '#e50914', color: '#fff', fontSize: '0.68rem', fontWeight: 700, padding: '2px 6px', borderRadius: 4, flexShrink: 0, minWidth: 28, textAlign: 'center' }}>
                                E{idx + 1}
                              </span>
                              <div style={{ flex: 1, minWidth: 0, fontSize: '0.9rem', color: '#ccc', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {ep.title ?? ep.id}
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flexShrink: 0 }}>
                                <button
                                  onClick={() => moveEpisodeInOrder(idx, -1)}
                                  disabled={idx === 0}
                                  title="Move up"
                                  style={{ background: 'none', border: '1px solid #333', color: idx === 0 ? '#333' : '#888', borderRadius: 3, width: 22, height: 20, cursor: idx === 0 ? 'default' : 'pointer', fontSize: '0.65rem', padding: 0 }}
                                >▲</button>
                                <button
                                  onClick={() => moveEpisodeInOrder(idx, 1)}
                                  disabled={idx === episodeOrder.length - 1}
                                  title="Move down"
                                  style={{ background: 'none', border: '1px solid #333', color: idx === episodeOrder.length - 1 ? '#333' : '#888', borderRadius: 3, width: 22, height: 20, cursor: idx === episodeOrder.length - 1 ? 'default' : 'pointer', fontSize: '0.65rem', padding: 0 }}
                                >▼</button>
                              </div>
                            </div>
                          ))}
                        </div>
                        {reorderFeedback && (
                          <div style={{ padding: '8px 12px', borderRadius: 6, marginBottom: 10, background: reorderFeedback.ok ? 'rgba(34,197,94,0.1)' : 'rgba(229,9,20,0.1)', border: `1px solid ${reorderFeedback.ok ? '#22c55e' : '#e50914'}`, color: reorderFeedback.ok ? '#4ade80' : '#f87171', fontSize: '0.82rem' }}>
                            {reorderFeedback.msg}
                          </div>
                        )}
                        <button
                          onClick={() => handleSaveOrder(item.id)}
                          disabled={reorderSaving}
                          style={{ background: reorderSaving ? '#444' : '#e50914', color: '#fff', border: 'none', padding: '8px 20px', borderRadius: 6, cursor: reorderSaving ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: '0.85rem' }}
                        >
                          {reorderSaving ? 'Saving…' : 'Save Order'}
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  return (
    <>
      {catalog.length === 0 && (
        <p style={{ color: '#555', padding: '20px 0' }}>No movies or TV shows in the catalog yet.</p>
      )}
      {renderSection('Movies', movies)}
      {renderSection('TV Shows', shows)}
    </>
  );
};
