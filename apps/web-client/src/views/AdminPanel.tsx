import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, type MediaItemDto, type SubtitleDto } from '../api';

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

export const AdminPanel = () => {
  const navigate = useNavigate();
  const [mediaItems, setMediaItems] = useState<MediaItemDto[]>([]);
  const [itemStates, setItemStates] = useState<Record<string, ItemState>>({});

  useEffect(() => {
    api.listMedia().then(items => {
      setMediaItems(items);
      const states: Record<string, ItemState> = {};
      items.forEach(item => { states[item.id] = defaultItemState(); });
      setItemStates(states);
    });
  }, []);

  const updateItem = (id: string, patch: Partial<ItemState>) => {
    setItemStates(prev => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  };

  const toggleExpand = async (item: MediaItemDto) => {
    const state = itemStates[item.id];
    if (!state) return;

    if (state.expanded) {
      updateItem(item.id, { expanded: false });
      return;
    }

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
    <div style={{ minHeight: '100vh', padding: '40px 5%', maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '32px' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', color: '#aaa', border: 'none', cursor: 'pointer', fontSize: '1rem' }}>
          ← Back
        </button>
        <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: 700 }}>Admin Panel</h1>
      </div>

      <h2 style={{ fontSize: '1.1rem', color: '#aaa', fontWeight: 400, marginBottom: '20px', borderBottom: '1px solid #333', paddingBottom: '10px' }}>
        Media Library — {mediaItems.length} items
      </h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {mediaItems.map(item => {
          const state = itemStates[item.id] ?? defaultItemState();
          return (
            <div key={item.id} style={{ background: '#1a1a1a', borderRadius: '8px', overflow: 'hidden', border: '1px solid #2a2a2a' }}>
              {/* Header row */}
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
                {!state.expanded && state.subtitles.length === 0 && (
                  <span style={{ fontSize: '0.8rem', color: '#555' }}>click to expand</span>
                )}
              </div>

              {/* Expanded content */}
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

                      {/* Upload form */}
                      <h4 style={{ margin: '0 0 10px 0', color: '#aaa', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Upload Subtitle
                      </h4>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'flex-end' }}>
                        <input
                          type="text"
                          placeholder="Language (e.g. English, PT-BR)"
                          value={state.uploadLang}
                          onChange={e => updateItem(item.id, { uploadLang: e.target.value })}
                          style={{ background: '#2a2a2a', border: '1px solid #444', color: '#fff', padding: '8px 12px', borderRadius: '4px', fontSize: '0.9rem', width: '220px' }}
                        />
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#2a2a2a', border: '1px solid #444', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.9rem', color: state.uploadFile ? '#fff' : '#777' }}>
                          {state.uploadFile ? state.uploadFile.name : '📁 Choose file (.srt / .vtt)'}
                          <input
                            type="file"
                            accept=".srt,.vtt"
                            style={{ display: 'none' }}
                            onChange={e => updateItem(item.id, { uploadFile: e.target.files?.[0] ?? null })}
                          />
                        </label>
                        <button
                          onClick={() => handleUpload(item)}
                          disabled={!state.uploadFile || state.uploading}
                          style={{
                            background: state.uploadFile && !state.uploading ? '#e50914' : '#444',
                            color: '#fff', border: 'none', padding: '8px 20px', borderRadius: '4px',
                            cursor: state.uploadFile && !state.uploading ? 'pointer' : 'not-allowed',
                            fontWeight: 600, fontSize: '0.9rem',
                          }}
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
    </div>
  );
};
