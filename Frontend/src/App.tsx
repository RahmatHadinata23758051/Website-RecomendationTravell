import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { AuthModal } from './components/AuthModal';
import { ErrorBoundary } from './components/ErrorBoundary';
import { RadenGajahChatWidget } from './components/RadenGajahChatWidget';
import { ProtectedRoute } from './components/ProtectedRoute';

const HomePage = lazy(() => import('./pages/HomePage').then(({ HomePage }) => ({ default: HomePage })));
const ExplorePage = lazy(() => import('./pages/ExplorePage').then(({ ExplorePage }) => ({ default: ExplorePage })));
const PlannerPage = lazy(() => import('./pages/PlannerPage').then(({ PlannerPage }) => ({ default: PlannerPage })));
const FavoritesPage = lazy(() => import('./pages/FavoritesPage').then(({ FavoritesPage }) => ({ default: FavoritesPage })));
const PublicSharePage = lazy(() => import('./pages/PublicSharePage').then(({ PublicSharePage }) => ({ default: PublicSharePage })));
const ProfilePage = lazy(() => import('./pages/ProfilePage').then(({ ProfilePage }) => ({ default: ProfilePage })));
const PlaceSubmitPage = lazy(() => import('./pages/PlaceSubmitPage').then(({ PlaceSubmitPage }) => ({ default: PlaceSubmitPage })));
const AdminSubmissionsPage = lazy(() => import('./pages/AdminSubmissionsPage').then(({ AdminSubmissionsPage }) => ({ default: AdminSubmissionsPage })));

function RouteLoadingFallback() {
  return (
    <div className="flex min-h-[65vh] items-center justify-center px-6 py-16" role="status" aria-live="polite">
      <div className="w-full max-w-md space-y-4" aria-hidden="true">
        <div className="h-8 w-2/3 animate-pulse rounded-lg bg-slate-200" />
        <div className="h-4 w-full animate-pulse rounded bg-slate-200" />
        <div className="h-4 w-5/6 animate-pulse rounded bg-slate-200" />
        <span className="sr-only">Memuat halaman...</span>
      </div>
    </div>
  );
}

export function App() {
  return (
    <AuthProvider>
      <ErrorBoundary onError={(error, errorInfo) => {
        console.error('[ErrorBoundary] Render error caught:', error, errorInfo);
      }}>
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
              <Suspense fallback={<RouteLoadingFallback />}>
                <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/explore" element={<ExplorePage />} />
                  <Route
                    path="/planner"
                    element={
                      <ProtectedRoute>
                        <PlannerPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/favorites"
                    element={
                      <ProtectedRoute>
                        <FavoritesPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/profile"
                    element={
                      <ProtectedRoute>
                        <ProfilePage />
                      </ProtectedRoute>
                    }
                  />
                  <Route path="/share/:shareToken" element={<PublicSharePage />} />
                  <Route
                    path="/admin/submissions"
                    element={
                      <ProtectedRoute requiredRole="ADMIN">
                        <AdminSubmissionsPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/submit-place"
                    element={
                      <ProtectedRoute>
                        <PlaceSubmitPage />
                      </ProtectedRoute>
                    }
                  />
                </Routes>
              </Suspense>
            </main>
            <Footer />
            <AuthModal />
            <RadenGajahChatWidget />
          </div>
        </Router>
      </ErrorBoundary>
    </AuthProvider>
  );
}

export default App;
