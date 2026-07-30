import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  User as UserIcon,
  Mail,
  ShieldCheck,
  Calendar,
  Compass,
  Heart,
  Trash2,
  LogOut,
  Sparkles,
  CheckCircle2,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../lib/api';

interface SavedItinerary {
  id: string;
  title: string;
  shareToken: string;
  daysJson: any[];
  createdAt: string;
}

export const ProfilePage: React.FC = () => {
  const { user, isAuthenticated, logout, openAuthModal } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'trips' | 'favorites'>('trips');
  const [savedTrips, setSavedTrips] = useState<SavedItinerary[]>([]);
  const [isLoadingTrips, setIsLoadingTrips] = useState<boolean>(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  useEffect(() => {
    if (!isAuthenticated) {
      openAuthModal('login');
      return;
    }

    const fetchMyTrips = async () => {
      setIsLoadingTrips(true);
      try {
        const res = await apiClient.get('/itineraries/my-trips');
        if (res.data?.data?.itineraries) {
          setSavedTrips(res.data.data.itineraries);
        }
      } catch (err) {
        // Fallback mock trip if backend is starting
      } finally {
        setIsLoadingTrips(false);
      }
    };

    fetchMyTrips();
  }, [isAuthenticated]);

  const handleDeleteTrip = async (id: string, title: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(`Hapus itinerary "${title}" dari simpanan?`)) {
      try {
        await apiClient.delete(`/itineraries/${id}`);
        setSavedTrips((prev) => prev.filter((item) => item.id !== id));
        triggerToast(`Itinerary "${title}" berhasil dihapus`);
      } catch (err) {
        triggerToast('Gagal menghapus itinerary');
      }
    }
  };

  const handleLogout = async () => {
    await logout();
    triggerToast('Anda telah keluar dari akun');
    navigate('/');
  };

  if (!user) {
    return (
      <div className="flex flex-col min-h-[100dvh] pt-32 pb-16 items-center justify-center text-center p-4">
        <div className="glass-card-container rounded-[28px] p-8 max-w-md w-full space-y-4">
          <UserIcon className="w-12 h-12 text-[#0D9488] mx-auto" />
          <h2 className="text-xl font-bold font-display text-slate-900">Akses Profil Membutuhkan Login</h2>
          <p className="text-xs text-slate-500">Silakan masuk ke akun KelanaLampung Anda untuk melihat rute tersimpan.</p>
          <button
            onClick={() => openAuthModal('login')}
            className="px-6 py-2.5 bg-[#0D9488] text-white text-xs font-bold rounded-full shadow-md hover:bg-[#0F766E] transition-all"
          >
            Masuk Sekarang
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-[100dvh] pt-24 pb-16">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#0F2937] text-white px-5 py-3 rounded-2xl shadow-2xl border border-siger-400/30 flex items-center gap-3 transition-all animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-[#2DD4BF]" />
          <span className="text-xs font-semibold">{toastMessage}</span>
        </div>
      )}

      <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 space-y-8">
        {/* HERO USER PROFILE CARD */}
        <div className="glass-card-container rounded-[32px] p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden bg-gradient-to-br from-white via-slate-50/50 to-teal-50/20 border border-slate-200/80 shadow-sm">
          <div className="flex items-center gap-5 relative z-10">
            <div className="w-16 sm:w-20 h-16 sm:h-20 rounded-2xl bg-gradient-to-br from-slate-900 via-[#0F766E] to-slate-950 text-white flex items-center justify-center font-display font-extrabold text-2xl sm:text-3xl shadow-xl shadow-[#0D9488]/15 border-2 border-white ring-4 ring-slate-100/80 shrink-0">
              {user.fullName ? user.fullName.charAt(0).toUpperCase() : 'U'}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-display font-extrabold text-slate-900 tracking-tight">{user.fullName}</h1>
                <span className="px-3 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-900 text-teal-300 border border-slate-700/80 shadow-sm uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
                  <span>{user.role}</span>
                </span>
              </div>
              <p className="text-xs text-slate-500 font-sans flex items-center gap-1.5 font-medium">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <span>{user.email}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 relative z-10 self-end md:self-auto">
            <button
              onClick={handleLogout}
              className="px-4 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
            >
              <LogOut className="w-4 h-4" />
              <span>Keluar Akun</span>
            </button>
          </div>
        </div>

        {/* PROFILE TAB NAVIGATION */}
        <div className="flex items-center gap-3 border-b border-slate-200 pb-1">
          <button
            onClick={() => setActiveTab('trips')}
            className={`px-5 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'trips'
                ? 'bg-[#0D9488] text-white shadow-md'
                : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
            }`}
          >
            <Compass className="w-4 h-4" />
            <span>Itinerary Tersimpan ({savedTrips.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('favorites')}
            className={`px-5 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'favorites'
                ? 'bg-[#0D9488] text-white shadow-md'
                : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
            }`}
          >
            <Heart className="w-4 h-4" />
            <span>Destinasi Favorit Saya</span>
          </button>
        </div>

        {/* TAB CONTENT */}
        {activeTab === 'trips' ? (
          isLoadingTrips ? (
            <div className="glass-card-container rounded-[28px] p-12 text-center space-y-3">
              <RefreshCw className="w-8 h-8 text-[#0D9488] animate-spin mx-auto" />
              <p className="text-xs font-bold text-slate-600">Memuat rute tersimpan Anda...</p>
            </div>
          ) : savedTrips.length === 0 ? (
            <div className="glass-card-container rounded-[28px] p-12 text-center space-y-4 max-w-lg mx-auto">
              <Compass className="w-12 h-12 text-slate-300 mx-auto" />
              <div className="space-y-1">
                <h3 className="text-lg font-bold font-display text-slate-900">Belum Ada Itinerary Tersimpan</h3>
                <p className="text-xs text-slate-500">
                  Buat rencana liburan impianmu dengan AI Planner dan simpan di profil ini agar tidak hilang.
                </p>
              </div>
              <Link
                to="/planner"
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#0D9488] text-white text-xs font-extrabold shadow-md hover:bg-[#0F766E] transition-all"
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>Buat Itinerary Baru</span>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {savedTrips.map((trip) => (
                <div
                  key={trip.id}
                  className="glass-card-container rounded-2xl p-5 border border-slate-200/80 hover:border-[#0D9488] transition-all shadow-sm space-y-4 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-teal-50 text-[#0D9488] border border-teal-200">
                        {Array.isArray(trip.daysJson) ? `${trip.daysJson.length} Hari Rute` : 'Itinerary AI'}
                      </span>
                      <button
                        onClick={(e) => handleDeleteTrip(trip.id, trip.title, e)}
                        className="text-slate-400 hover:text-red-500 p-1.5 rounded-full hover:bg-red-50 transition-colors"
                        title="Hapus Itinerary"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <h3 className="text-base font-bold font-display text-slate-900">{trip.title}</h3>
                    <p className="text-[11px] text-slate-400 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Dibuat: {new Date(trip.createdAt).toLocaleDateString('id-ID', { dateStyle: 'medium' })}</span>
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <Link
                      to={`/share/${trip.shareToken}`}
                      className="px-4 py-2 rounded-xl bg-teal-50 hover:bg-[#0D9488] text-[#0D9488] hover:text-white text-xs font-bold transition-all flex items-center gap-1.5"
                    >
                      <span>Lihat Rute Spasial 3D</span>
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          <div className="glass-card-container rounded-[28px] p-8 text-center space-y-4">
            <Heart className="w-12 h-12 text-red-400 mx-auto" />
            <h3 className="text-lg font-bold text-slate-900 font-display">Destinasi Favorit Saya</h3>
            <p className="text-xs text-slate-500">Kelola dan lihat koleksi destinasi wisata yang kamu tandai di Explore Page.</p>
            <Link
              to="/favorites"
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#0D9488] text-white text-xs font-bold shadow-md hover:bg-[#0F766E] transition-all"
            >
              <span>Buka Halaman Favorit</span>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};
