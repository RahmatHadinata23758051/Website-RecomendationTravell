import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { AuthModal } from './components/AuthModal';

// Placeholder views for subsequent backlogs
function HomePage() {
  return (
    <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-16 text-center">
      <div className="glass-panel p-12 rounded-3xl max-w-2xl mx-auto shadow-glass border border-slate-200/80">
        <h2 className="text-3xl font-display font-extrabold text-slate-900 mb-3">
          KelanaLampung Portal Utama
        </h2>
        <p className="text-xs text-slate-600 mb-6">
          Komponen Base Layout & Traveloka-Style Auth Modal Popup (Frontend Fase 2 Completed)
        </p>
        <span className="inline-flex items-center px-4 py-2 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          Base Layout, Navbar, Auth Modal & Footer Operational
        </span>
      </div>
    </main>
  );
}

function ExplorePage() {
  return (
    <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-16 text-center">
      <h2 className="text-2xl font-display font-bold">Halaman Jelajah & Map Spasial (Fase 4 Placeholder)</h2>
    </main>
  );
}

function PlannerPage() {
  return (
    <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-16 text-center">
      <h2 className="text-2xl font-display font-bold">Halaman AI Planner (Fase 5 Placeholder)</h2>
    </main>
  );
}

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
        <div className="min-h-[100dvh] flex flex-col bg-clean-light">
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
