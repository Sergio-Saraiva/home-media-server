import { HashRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { Catalog } from './views/Catalog';
import { MovieDetails } from './views/MovieDetails';
import { ShowDetails } from './views/ShowDetails';
import { Player } from './views/Player';
import { AdminPanel } from './views/AdminPanel';

function App() {
  return (
    <Router>
      <nav style={{
        padding: '18px 5%',
        background: 'linear-gradient(to bottom, rgba(14,14,14,0.98) 0%, rgba(14,14,14,0.6) 70%, transparent 100%)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        gap: '32px',
      }}>
        <Link to="/" style={{ color: '#e50914', fontSize: '1.85rem', fontWeight: 900, letterSpacing: '3px', textDecoration: 'none', lineHeight: 1 }}>
          DIVINO
        </Link>
        <Link to="/" style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.9rem', fontWeight: 500, textDecoration: 'none', letterSpacing: '0.02em' }}>
          Home
        </Link>
        <Link to="/admin" style={{
          marginLeft: 'auto',
          color: 'rgba(255,255,255,0.5)',
          fontSize: '0.8rem',
          fontWeight: 500,
          padding: '6px 14px',
          border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: '6px',
          textDecoration: 'none',
          letterSpacing: '0.04em',
          transition: 'color 0.15s, border-color 0.15s',
        }}>
          Admin
        </Link>
      </nav>

      <Routes>
        <Route path="/" element={<Catalog />} />
        <Route path="/movie/:id" element={<MovieDetails />} />
        <Route path="/show/:id" element={<ShowDetails />} />
        <Route path="/play/:mediaId" element={<Player />} />
        <Route path="/admin" element={<AdminPanel />} />
      </Routes>
    </Router>
  );
}

export default App;
