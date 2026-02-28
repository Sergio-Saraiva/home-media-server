import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, type CatalogItemDTO } from '../api';

// ── Card component ────────────────────────────────────────────────────────────
const CARD_WIDTH = 160;

interface CardProps {
  item: CatalogItemDTO;
  focused: boolean;
  onClick: () => void;
  id: string;
}

const Card = ({ item, focused, onClick, id }: CardProps) => (
  <div
    id={id}
    className="catalog-card"
    onClick={onClick}
    style={{
      flexShrink: 0,
      width: CARD_WIDTH,
      borderRadius: 10,
      overflow: 'hidden',
      background: '#1a1a1a',
      border: focused ? '2px solid #e50914' : '2px solid transparent',
      transform: focused ? 'scale(1.06)' : 'scale(1)',
      boxShadow: focused ? '0 0 24px rgba(229,9,20,0.65)' : '0 4px 12px rgba(0,0,0,0.4)',
      transition: 'transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease',
      outline: 'none',
    }}
  >
    {/* Poster area */}
    <div style={{ aspectRatio: '2/3', overflow: 'hidden', position: 'relative', background: '#111' }}>
      {item.posterPath ? (
        <img
          src={item.posterPath}
          alt={item.title ?? 'Poster'}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          loading="lazy"
        />
      ) : (
        <div style={{
          width: '100%', height: '100%',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8,
          background: 'linear-gradient(145deg, #1c1c2e 0%, #16213e 60%, #0f3460 100%)',
        }}>
          <span style={{ fontSize: '2.8rem', lineHeight: 1 }}>{item.type === 'Movie' ? '🎬' : '📺'}</span>
        </div>
      )}
    </div>

    {/* Title strip */}
    <div style={{ padding: '9px 10px 11px' }}>
      <div style={{
        fontWeight: 600,
        fontSize: '0.82rem',
        lineHeight: 1.35,
        color: '#f0f0f0',
        overflow: 'hidden',
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
        marginBottom: 4,
      }}>
        {item.title ?? '—'}
      </div>
      <div style={{ fontSize: '0.7rem', color: item.type === 'Movie' ? '#888' : '#7a9ec0', fontWeight: 500, letterSpacing: '0.04em' }}>
        {item.type === 'Movie' ? 'Movie' : 'TV Show'}
      </div>
    </div>
  </div>
);

// ── Skeleton card ─────────────────────────────────────────────────────────────
const SkeletonCard = () => (
  <div style={{ flexShrink: 0, width: CARD_WIDTH, borderRadius: 10, overflow: 'hidden', background: '#1a1a1a' }}>
    <div className="skeleton" style={{ aspectRatio: '2/3', width: '100%' }} />
    <div style={{ padding: '9px 10px 11px', display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div className="skeleton" style={{ height: 12, borderRadius: 4, width: '80%' }} />
      <div className="skeleton" style={{ height: 10, borderRadius: 4, width: '45%' }} />
    </div>
  </div>
);

// ── Section row ───────────────────────────────────────────────────────────────
interface SectionRowProps {
  title: string;
  items: CatalogItemDTO[];
  loading: boolean;
  focusedIdx: number | null; // null = this section not focused
  sectionIdx: 0 | 1;
  onItemClick: (item: CatalogItemDTO) => void;
}

const SectionRow = ({ title, items, loading, focusedIdx, sectionIdx, onItemClick }: SectionRowProps) => {
  const sectionFocused = focusedIdx !== null;
  return (
    <section style={{ marginBottom: 48 }}>
      {/* Section header */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, padding: '0 5%', marginBottom: 16 }}>
        <h2 style={{
          margin: 0,
          fontSize: '1.25rem',
          fontWeight: 700,
          color: sectionFocused ? '#fff' : 'rgba(255,255,255,0.7)',
          transition: 'color 0.2s',
          letterSpacing: '0.01em',
        }}>
          {title}
        </h2>
        {!loading && (
          <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.3)', fontWeight: 500 }}>
            {items.length} {items.length === 1 ? 'item' : 'items'}
          </span>
        )}
        {sectionFocused && (
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#e50914', display: 'inline-block', marginLeft: 4 }} />
        )}
      </div>

      {/* Horizontal scroll row */}
      <div
        className="row-scroll"
        style={{ display: 'flex', gap: 14, padding: '14px 5% 20px', overflowX: 'auto', alignItems: 'flex-start' }}
      >
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
        ) : items.length === 0 ? (
          <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.9rem', padding: '20px 0' }}>
            Nothing here yet — add some via the Admin panel.
          </div>
        ) : (
          items.map((item, idx) => (
            <Card
              key={item.id}
              item={item}
              focused={focusedIdx === idx}
              onClick={() => onItemClick(item)}
              id={`nav-s${sectionIdx}-${idx}`}
            />
          ))
        )}
      </div>
    </section>
  );
};

// ── Catalog ───────────────────────────────────────────────────────────────────
export const Catalog = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<CatalogItemDTO[]>([]);
  const [loading, setLoading] = useState(true);

  // Two-section nav state
  const [nav, setNav] = useState<{ section: 0 | 1; idx: number }>({ section: 0, idx: 0 });

  useEffect(() => {
    api.getCatalog().then(data => {
      setItems(data);
      setLoading(false);
    });
  }, []);

  const movies = items.filter(i => i.type === 'Movie');
  const shows = items.filter(i => i.type === 'Show');

  const goToItem = useCallback((item: CatalogItemDTO) => {
    navigate(item.type === 'Movie' ? `/movie/${item.id}` : `/show/${item.id}`);
  }, [navigate]);

  // Auto-scroll focused card into view
  useEffect(() => {
    const el = document.getElementById(`nav-s${nav.section}-${nav.idx}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
  }, [nav]);

  // Keyboard handler
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isBack = e.key === 'Escape' || e.key === 'Backspace' || e.keyCode === 10009;
      if (isBack) { navigate(-1); return; }

      if (e.key === 'ArrowRight') {
        e.preventDefault();
        setNav(prev => {
          const row = prev.section === 0 ? movies : shows;
          return { ...prev, idx: Math.min(prev.idx + 1, row.length - 1) };
        });
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setNav(prev => ({ ...prev, idx: Math.max(prev.idx - 1, 0) }));
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (shows.length > 0) {
          setNav(prev => prev.section === 0
            ? { section: 1, idx: Math.min(prev.idx, shows.length - 1) }
            : prev
          );
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (movies.length > 0) {
          setNav(prev => prev.section === 1
            ? { section: 0, idx: Math.min(prev.idx, movies.length - 1) }
            : prev
          );
        }
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const row = nav.section === 0 ? movies : shows;
        const item = row[nav.idx];
        if (item) goToItem(item);
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [nav, movies, shows, navigate, goToItem]);

  // Keep nav.idx in bounds if catalog reloads
  useEffect(() => {
    setNav(prev => {
      const row = prev.section === 0 ? movies : shows;
      if (row.length === 0) return prev;
      return { ...prev, idx: Math.min(prev.idx, row.length - 1) };
    });
  }, [movies.length, shows.length]);

  const bothEmpty = !loading && movies.length === 0 && shows.length === 0;

  return (
    <div style={{ paddingTop: 16, paddingBottom: 60, minHeight: '100vh' }}>
      {bothEmpty && (
        <div style={{ padding: '60px 5%', textAlign: 'center', color: 'rgba(255,255,255,0.25)', fontSize: '1rem' }}>
          Your library is empty. Head to the{' '}
          <a href="#/admin" style={{ color: '#e50914', textDecoration: 'none' }}>Admin panel</a>{' '}
          to add content.
        </div>
      )}

      <SectionRow
        title="Movies"
        items={movies}
        loading={loading}
        focusedIdx={nav.section === 0 ? nav.idx : null}
        sectionIdx={0}
        onItemClick={goToItem}
      />

      <SectionRow
        title="TV Shows"
        items={shows}
        loading={loading}
        focusedIdx={nav.section === 1 ? nav.idx : null}
        sectionIdx={1}
        onItemClick={goToItem}
      />
    </div>
  );
};
