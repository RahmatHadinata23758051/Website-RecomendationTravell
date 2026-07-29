import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { AuthModal } from './components/AuthModal';
import { HomePage } from './pages/HomePage';
import { ExplorePage } from './pages/ExplorePage';
import { PlannerPage } from './pages/PlannerPage';

function FavoritesPage() {
  return (
    <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-16 text-center">
      <h2 className="text-2xl font-display font-bold">Halaman Favorit Pengguna (Fase 6 Placeholder)</h2>
    </main>
  );
}

function PublicSharePage() {
  return (
    <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-16 text-center">
      <h2 className="text-2xl font-display font-bold">Public Shared Itinerary View (Fase 7 Placeholder)</h2>
    </main>
  );
}

export function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-[100dvh] flex flex-col justify-between bg-[#F4F8FA]">
          <Navbar />
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/explore" element={<ExplorePage />} />
            <Route path="/planner" element={<PlannerPage />} />
            <Route path="/favorites" element={<FavoritesPage />} />
            <Route path="/share/:shareToken" element={<PublicSharePage />} />
          </Routes>
          <Footer />
          <AuthModal />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
