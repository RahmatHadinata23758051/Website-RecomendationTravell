import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { AuthModal } from './components/AuthModal';
import { RadenGajahChatWidget } from './components/RadenGajahChatWidget';
import { HomePage } from './pages/HomePage';
import { ExplorePage } from './pages/ExplorePage';
import { PlannerPage } from './pages/PlannerPage';
import { FavoritesPage } from './pages/FavoritesPage';
import { PublicSharePage } from './pages/PublicSharePage';
import { ProfilePage } from './pages/ProfilePage';
import { PlaceSubmitPage } from './pages/PlaceSubmitPage';

export function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-[100dvh] flex flex-col justify-between bg-[#F4F8FA]">
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only fixed top-4 left-4 z-[100] px-4 py-2 bg-primary-600 text-white rounded-lg font-semibold shadow-lg transition-colors hover:bg-primary-700"
          >
            Skip to main content
          </a>
          <Navbar />
          <main id="main-content" className="flex-1 flex flex-col focus:outline-none" tabIndex={-1}>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/explore" element={<ExplorePage />} />
              <Route path="/planner" element={<PlannerPage />} />
              <Route path="/favorites" element={<FavoritesPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/share/:shareToken" element={<PublicSharePage />} />
              <Route path="/submit-place" element={<PlaceSubmitPage />} />
            </Routes>
          </main>
          <Footer />
          <AuthModal />
          <RadenGajahChatWidget />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
