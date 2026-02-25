import { HashRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { Catalog } from './views/Catalog';
import { MovieDetails } from './views/MovieDetails';
import { ShowDetails } from './views/ShowDetails';
import { Player } from './views/Player';
import { AdminPanel } from './views/AdminPanel';

function App() {
  return (
    <Router>
      <nav style={{ padding: '20px 5%', background: 'linear-gradient(to bottom, rgba(20,20,20,1) 0%, rgba(20,20,20,0) 100%)', position: 'sticky', top: 0, zIndex: 100, display: 'flex', alignItems: 'center' }}>
        <Link to="/" style={{ color: '#e50914', fontSize: '2rem', fontWeight: 800, letterSpacing: '2px', textDecoration: 'none' }}>
          DIVINO
        </Link>
        <Link to="/admin" style={{ marginLeft: 'auto', color: '#777', fontSize: '0.85rem', padding: '6px 12px', border: '1px solid #333', borderRadius: '4px' }}>
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
