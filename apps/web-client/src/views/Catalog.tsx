import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, type CatalogItemDTO } from '../api';
import { useKeyNav } from '../hooks/useKeyNav';

export const Catalog = () => {
  const [items, setItems] = useState<CatalogItemDTO[]>([]);
  const navigate = useNavigate();

  // Assuming 5 columns for our TV grid calculation
  const COLUMNS = 5;
  const activeIndex = useKeyNav({
    count: items.length,
    columns: COLUMNS,
    onSelect: (i) => {
      const item = items[i];
      if (item) navigate(item.type === 'Movie' ? `/movie/${item.id}` : `/show/${item.id}`);
    },
    onBack: () => navigate(-1),
  });

  useEffect(() => {
    api.getCatalog().then(setItems);
  }, []);

  return (
    <div style={{ padding: '40px 5%' }}>
      <h2 style={{ fontSize: '2rem', marginBottom: '30px', fontWeight: 600 }}>Divino TV</h2>
      
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: `repeat(${COLUMNS}, 1fr)`, 
        gap: '20px' 
      }}>
        {items.map((item, index) => {
          const isFocused = index === activeIndex;

          return (
            <div 
              key={item.id}
              id={`nav-item-${index}`}
              onClick={() => navigate(item.type === 'Movie' ? `/movie/${item.id}` : `/show/${item.id}`)}
              style={{
                background: '#222', 
                borderRadius: '8px', 
                overflow: 'hidden', 
                // TV Focus Styling
                transform: isFocused ? 'scale(1.08)' : 'scale(1)',
                boxShadow: isFocused ? '0 0 20px 5px rgba(229, 9, 20, 0.8)' : 'none',
                border: isFocused ? '3px solid #e50914' : '3px solid transparent',
                transition: 'all 0.2s ease-out', 
                aspectRatio: '2/3', 
                position: 'relative'
              }}
            >
              {item.posterPath ? (
                <img src={item.posterPath} alt={item.title || 'Poster'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', padding: '20px', textAlign: 'center' }}>
                  <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{item.title}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};