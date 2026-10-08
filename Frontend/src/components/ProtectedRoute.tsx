import React, { useEffect } from 'react';
import { LockKeyhole } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * Keeps user-private pages from mounting before authentication is available.
 * The current URL is preserved so the user can continue after signing in.
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading, openAuthModal } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      openAuthModal('login');
    }
  }, [isLoading, isAuthenticated, openAuthModal]);

  if (isLoading) {
    return (
      <div className="flex min-h-[65vh] items-center justify-center pt-24" role="status" aria-live="polite">
        <span className="text-sm font-semibold text-slate-500">Memeriksa sesi Anda...</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-[65vh] items-center justify-center px-4 pb-16 pt-28">
        <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xl shadow-slate-900/5">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-50 text-teal-600">
            <LockKeyhole className="h-7 w-7" aria-hidden="true" />
          </div>
          <h1 className="font-display text-2xl font-extrabold text-slate-900">Masuk untuk melanjutkan</h1>
          <p className="mt-3 text-sm leading-6 text-slate-500">
            Halaman ini berisi fitur pribadi KelanaLampung. Silakan masuk atau daftar agar data perjalanan Anda tetap aman.
          </p>
          <button
            type="button"
            onClick={() => openAuthModal('login')}
            className="mt-7 rounded-full bg-teal-600 px-7 py-3 text-sm font-bold text-white shadow-lg shadow-teal-600/20 transition hover:bg-teal-700 focus:outline-none focus:ring-4 focus:ring-teal-500/20"
          >
            Masuk atau daftar
          </button>
        </section>
      </div>
    );
  }

  return <>{children}</>;
};
