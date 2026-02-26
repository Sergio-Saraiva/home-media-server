import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, type TvShowDto, type TranscodeStatus } from '../api';
import { useKeyNav } from '../hooks/useKeyNav';
import { TranscodeBadge } from '../components/TranscodeBadge';

export const ShowDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [show, setShow] = useState<TvShowDto | null>(null);
  const [epStatuses, setEpStatuses] = useState<Record<string, TranscodeStatus | null | undefined>>({});

  const episodes = show?.episodes ?? [];

  const activeIndex = useKeyNav({
    count: episodes.length,
    columns: 1,
    onSelect: (i) => {
      if (episodes[i] && epStatuses[episodes[i].id]?.status === 'Completed')
        navigate(`/play/${episodes[i].id}`, {
          state: { title: `${show?.title ?? ''} — E${i + 1}`, episodes, currentEpisodeIndex: i, showTitle: show?.title ?? '' },
        });
    },
    onBack: () => navigate(-1),
  });

  useEffect(() => {
    if (id) api.getTvShow(id).then(setShow);
  }, [id]);

  useEffect(() => {
    if (episodes.length === 0) return;
    let cancelled = false;
    const known: Record<string, TranscodeStatus | null> = {};

    const poll = async () => {
      const toFetch = episodes.filter(ep => {
        const s = known[ep.id];
        return s?.status !== 'Completed' && s?.status !== 'Failed';
      });
      if (toFetch.length === 0) return;

      const entries = await Promise.all(
        toFetch.map(ep => api.getTranscodeStatus(ep.id).then(s => [ep.id, s] as const))
      );
      if (cancelled) return;

      entries.forEach(([id, s]) => { known[id] = s; });
      setEpStatuses({ ...known });

      if (Object.values(known).some(s => s?.status !== 'Completed' && s?.status !== 'Failed'))
        setTimeout(poll, 5000);
    };

    poll();
    return () => { cancelled = true; };
  }, [show?.id]);

  if (!show) return <div style={{ padding: '40px' }}>Loading...</div>;

  return (
    <div style={{ padding: '60px 5%', maxWidth: '1000px', margin: '0 auto' }}>
      <button onClick={() => navigate(-1)} style={{ background: 'none', color: '#aaa', border: 'none', cursor: 'pointer', fontSize: '1.1rem', marginBottom: '20px' }}>← Back</button>

      <h1 style={{ fontSize: '3rem', margin: '0 0 10px 0' }}>{show.title}</h1>
      <p style={{ color: '#aaa', marginBottom: '40px', fontSize: '1.1rem' }}>{show.description}</p>

      <h2 style={{ borderBottom: '1px solid #333', paddingBottom: '10px', marginBottom: '20px' }}>Episodes</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {episodes.map((ep, index) => {
          const isFocused = index === activeIndex;
          const epReady = epStatuses[ep.id]?.status === 'Completed';
          return (
            <div
              key={ep.id}
              id={`nav-item-${index}`}
              onClick={() => {
                if (epReady) navigate(`/play/${ep.id}`, { state: { title: `${show.title ?? ''} — E${index + 1}`, episodes, currentEpisodeIndex: index, showTitle: show.title ?? '' } });
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '20px',
                background: isFocused ? '#333' : '#222',
                borderRadius: '8px',
                cursor: epReady ? 'pointer' : 'default',
                border: isFocused ? '2px solid #e50914' : '2px solid transparent',
                transform: isFocused ? 'scale(1.02)' : 'scale(1)',
                transition: 'all 0.15s ease-out',
                opacity: epStatuses[ep.id] === undefined ? 1 : epReady ? 1 : 0.6,
              }}
              onMouseEnter={e => { if (epReady) e.currentTarget.style.background = '#333'; }}
              onMouseLeave={e => { if (!isFocused && epReady) e.currentTarget.style.background = '#222'; }}
            >
              <span style={{ fontSize: '1.5rem', color: '#777', width: '50px' }}>{index + 1}</span>
              <span style={{ flex: 1, fontSize: '1.2rem', fontWeight: 500 }}>{ep.title || `Episode ${index + 1}`}</span>
              {epReady
                ? <span style={{ color: isFocused ? '#e50914' : '#aaa' }}>▶ Play</span>
                : <TranscodeBadge status={epStatuses[ep.id]} />
              }
            </div>
          );
        })}
        {episodes.length === 0 && <p style={{ color: '#777' }}>No episodes assigned yet.</p>}
      </div>
    </div>
  );
};
