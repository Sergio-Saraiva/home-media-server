import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, type MovieDto } from '../api';
import { useKeyNav } from '../hooks/useKeyNav';

export const MovieDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [movie, setMovie] = useState<MovieDto | null>(null);

  useEffect(() => {
    if (id) api.getMovie(id).then(setMovie);
  }, [id]);

  // 0 = Back, 1 = Play — default focus on Play
  const activeIndex = useKeyNav({
    count: 2,
    columns: 1,
    initialIndex: 1,
    onSelect: (i) => {
      if (i === 0) navigate(-1);
      else if (movie) navigate(`/play/${movie.mediaItem.id}`, { state: { title: movie.title ?? undefined } });
    },
    onBack: () => navigate(-1),
  });

  if (!movie) return <div style={{ padding: '40px' }}>Loading...</div>;

  const focusStyle = (index: number) => ({
    outline: activeIndex === index ? '3px solid #e50914' : '3px solid transparent',
    transform: activeIndex === index ? 'scale(1.04)' : 'scale(1)',
    transition: 'all 0.15s ease-out',
  });

  return (
    <div style={{ padding: '60px 5%', maxWidth: '1000px' }}>
      <button
        id="nav-item-0"
        onClick={() => navigate(-1)}
        style={{ background: 'none', color: '#aaa', border: 'none', cursor: 'pointer', fontSize: '1.1rem', marginBottom: '20px', borderRadius: '4px', padding: '6px 10px', ...focusStyle(0) }}
      >
        ← Back
      </button>
      <div style={{ display: 'flex', gap: '40px', flexWrap: 'wrap' }}>
        <div style={{ width: '300px', aspectRatio: '2/3', background: '#333', borderRadius: '8px', overflow: 'hidden' }}>
          {movie.posterPath && <img src={movie.posterPath} alt={movie.title!} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
        </div>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: '3rem', margin: '0 0 20px 0' }}>{movie.title}</h1>
          <p style={{ fontSize: '1.2rem', color: '#ccc', lineHeight: '1.6', marginBottom: '40px' }}>
            {movie.description || 'No description available.'}
          </p>
          <button
            id="nav-item-1"
            onClick={() => navigate(`/play/${movie.mediaItem.id}`, { state: { title: movie.title ?? undefined } })}
            style={{ background: '#e50914', color: 'white', border: 'none', padding: '15px 40px', fontSize: '1.2rem', fontWeight: 'bold', borderRadius: '4px', cursor: 'pointer', ...focusStyle(1) }}
            onMouseEnter={e => e.currentTarget.style.background = '#f40612'}
            onMouseLeave={e => e.currentTarget.style.background = '#e50914'}
          >
            ▶ PLAY MOVIE
          </button>
        </div>
      </div>
    </div>
  );
};
