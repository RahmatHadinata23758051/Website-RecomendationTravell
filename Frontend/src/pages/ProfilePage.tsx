import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  User as UserIcon,
  Calendar,
  Compass,
  Heart,
  Trash2,
  LogOut,
  CheckCircle2,
  ChevronRight,
  RefreshCw,
  MapPin,
  MessageSquare,
  Edit2,
  Settings,
  Bell,
  Lock,
  Globe,
  Palmtree,
  Mountain,
  Landmark,
  Utensils,
  Footprints,
  Edit3,
  Share2,
  Upload,
  X,
  Camera,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../lib/api';
import { SafeImage } from '../components/SafeImage';
import { fetchRealDestinations } from '../services/destinationsApi';
import { Destination } from './ExplorePage';

import { fetchUserActivities, UserActivity } from '../services/activitiesApi';

interface SavedItinerary {
  id: string;
  title: string;
  shareToken: string;
  daysJson: any[];
  createdAt: string;
}

export const ProfilePage: React.FC = () => {
  const { user, isAuthenticated, logout, openAuthModal, updateUserProfile, updateUserPreferences } = useAuth();
  const navigate = useNavigate();

  const [savedTrips, setSavedTrips] = useState<SavedItinerary[]>([]);
  const [favoriteDestinations, setFavoriteDestinations] = useState<Destination[]>([]);
  const [userActivities, setUserActivities] = useState<UserActivity[]>([]);
  const [isActivitiesModalOpen, setIsActivitiesModalOpen] = useState<boolean>(false);
  const [selectedTripForModal, setSelectedTripForModal] = useState<SavedItinerary | null>(null);
  const [isTripDetailModalOpen, setIsTripDetailModalOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Edit Profile Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [editFullName, setEditFullName] = useState<string>('');
  const [editBio, setEditBio] = useState<string>('');
  const [editLocation, setEditLocation] = useState<string>('');
  const [editAvatarUrl, setEditAvatarUrl] = useState<string>('');
  const [isSavingProfile, setIsSavingProfile] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Computed stats
  const totalSaved = savedTrips.length;
  const totalPlanned = userActivities.filter(a => a.title?.includes('itinerary') || a.title?.includes('rute')).length;
  const totalVisited = favoriteDestinations.length;

  const handleTogglePreference = async (categoryName: string) => {
    const currentPrefs = user?.preferences || [];
    const updatedPrefs = currentPrefs.includes(categoryName)
      ? currentPrefs.filter((p) => p !== categoryName)
      : [...currentPrefs, categoryName];

    try {
      await updateUserPreferences(updatedPrefs);
      triggerToast(`Preferensi ${categoryName} diperbarui!`);
    } catch (err: any) {
      triggerToast('Gagal memperbarui preferensi');
    }
  };

  const handleOpenEditModal = () => {
    setEditFullName(user?.fullName || '');
    setEditBio(user?.bio || '');
    setEditLocation(user?.location || 'Bandar Lampung, Lampung, Indonesia');
    setEditAvatarUrl(user?.avatarUrl || '');
    setIsEditModalOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 4 * 1024 * 1024) {
        triggerToast('Ukuran foto maksimal 4MB');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        if (reader.result) {
          setEditAvatarUrl(reader.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editFullName.trim()) {
      triggerToast('Nama lengkap tidak boleh kosong');
      return;
    }
    setIsSavingProfile(true);
    try {
      await updateUserProfile({
        fullName: editFullName,
        bio: editBio,
        location: editLocation,
        avatarUrl: editAvatarUrl,
      });
      setIsEditModalOpen(false);
      triggerToast('Profil & Foto berhasil diperbarui!');
    } catch (err: any) {
      triggerToast(err.message || 'Gagal memperbarui profil');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  useEffect(() => {
    if (!isAuthenticated) {
      openAuthModal('login');
      return;
    }

    let isMounted = true;

    // Fetch My Saved Trips
    const fetchMyTrips = async () => {
      try {
        const res = await apiClient.get('/itineraries/my-trips');
        if (isMounted && res.data?.data?.itineraries) {
          setSavedTrips(res.data.data.itineraries);
        }
      } catch (err) {
        // Fallback mock
      }
    };

    // Fetch Favorites
    const fetchFavorites = async () => {
      try {
        const allDests = await fetchRealDestinations({ limit: 100 });
        const res = await apiClient.get('/favorites');
        if (isMounted && res.data?.data) {
          const favIds = res.data.data.map((f: any) => f.canonicalId);
          const pool = allDests || [];
          const matched = pool.filter((d: Destination) => favIds.includes(d.id));
          setFavoriteDestinations(matched);
        } else if (isMounted) {
          setFavoriteDestinations([]);
        }
      } catch (err) {
        if (isMounted) setFavoriteDestinations([]);
      }
    };

    // Fetch Activities
    const fetchActivities = async () => {
      try {
        const data = await fetchUserActivities();
        if (isMounted) {
          setUserActivities(data);
        }
      } catch (err) {
        // Fallback
      }
    };

    fetchMyTrips();
    fetchFavorites();
    fetchActivities();

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated]);

  const handleDeleteTrip = async (id: string, title: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (window.confirm(`Hapus itinerary "${title}" dari simpanan?`)) {
      try {
        await apiClient.delete(`/itineraries/${id}`);
        setSavedTrips((prev) => prev.filter((item) => item.id !== id));
        if (selectedTripForModal?.id === id) {
          setIsTripDetailModalOpen(false);
        }
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

  const handleEditBio = () => {
    handleOpenEditModal();
  };

  if (!user) {
    return (
      <div className="flex flex-col min-h-[100dvh] pt-32 pb-16 items-center justify-center text-center p-4">
        <div className="bg-white rounded-[28px] p-8 max-w-md w-full space-y-4 shadow-xl border border-slate-100">
          <UserIcon className="w-12 h-12 text-[#0D9488] mx-auto" />
          <h2 className="text-xl font-bold font-display text-slate-900">Akses Profil Membutuhkan Login</h2>
          <p className="text-xs text-slate-500">Silakan masuk ke akun KelanaLampung Anda untuk melihat profil dan rute tersimpan.</p>
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
    <div className="flex flex-col min-h-[100dvh] pt-24 pb-16 bg-[#F4F8FA]">
      {/* Toast Notification - clean, no bounce */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#0F2937] text-white px-5 py-3 rounded-2xl shadow-xl border border-slate-200/50 flex items-center gap-3 transition-all">
          <CheckCircle2 className="w-5 h-5 text-[#2DD4BF]" />
          <span className="text-xs font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* CLEAN HEADER — no hero banner, no gradient overlays, no tapis watermark */}
      <header className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Profil Saya
            </h1>
            <p className="text-sm text-slate-600">Kelola preferensi, lihat aktivitas, dan atur akun.</p>
          </div>
          <div className="flex items-center gap-3">
            {user?.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.fullName || 'User'}
                className="w-12 h-12 rounded-xl object-cover border border-slate-200"
              />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center border border-slate-200">
                <UserIcon className="w-6 h-6 text-slate-400" />
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10 space-y-6">

        {/* USER INFO & STATS ROW */}
        <div className="bg-white rounded-[24px] border border-slate-200 p-6 sm:p-8 shadow-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 items-center">
            {/* User Identity */}
            <div className="flex items-center gap-4 sm:col-span-1 lg:col-span-1">
              <div className="space-y-1">
                <h2 className="text-lg font-bold font-display text-slate-900">
                  {user?.fullName || 'Pengguna'}
                </h2>
                <p className="text-xs text-slate-500">{user?.email || 'Belum login'}</p>
                <p className="text-xs text-slate-400 flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  <span>{user?.location || 'Bandar Lampung, Lampung'}</span>
                </p>
              </div>
            </div>

            {/* Stats - clean, no gradients */}
            <div className="grid grid-cols-3 gap-4 sm:col-span-1 lg:col-span-3 border-y border-slate-100 py-4 sm:border-y-0 sm:border-x sm:py-0">
              <div className="text-center">
                <div className="text-2xl sm:text-3xl font-extrabold font-display text-[#0D9488]">
                  {totalSaved}
                </div>
                <div className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">
                  Destinasi Tersimpan
                </div>
              </div>
              <div className="border-x border-slate-100">
                <div className="text-2xl sm:text-3xl font-extrabold font-display text-amber-600">
                  {totalPlanned}
                </div>
                <div className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">
                  Itinerary Dibuat
                </div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-extrabold font-display text-rose-600">
                  {totalVisited}
                </div>
                <div className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">
                  Tempat Favorit
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* QUICK ACTIONS & BIO */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Quick Actions */}
          <div className="lg:col-span-1 bg-white rounded-[24px] border border-slate-200 p-6 shadow-sm space-y-3">
            <h3 className="text-xs font-extrabold text-slate-600 uppercase tracking-wider">Aksi Cepat</h3>
            <div className="space-y-2">
              <button
                onClick={() => navigate('/planner')}
                className="w-full bg-slate-50 hover:bg-slate-100 rounded-xl p-3 text-left border border-slate-200 transition-all min-h-[44px] focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:outline-none flex items-center gap-2"
              >
                <Compass className="w-4 h-4 text-[#0D9488]" />
                <span className="text-xs font-bold text-slate-800">Buat Itinerary</span>
              </button>
              <button
                onClick={() => navigate('/explore')}
                className="w-full bg-slate-50 hover:bg-slate-100 rounded-xl p-3 text-left border border-slate-200 transition-all min-h-[44px] focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:outline-none flex items-center gap-2"
              >
                <MapPin className="w-4 h-4 text-[#0D9488]" />
                <span className="text-xs font-bold text-slate-800">Jelajahi Tempat</span>
              </button>
              <button
                onClick={() => navigate('/favorites')}
                className="w-full bg-slate-50 hover:bg-slate-100 rounded-xl p-3 text-left border border-slate-200 transition-all min-h-[44px] focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:outline-none flex items-center gap-2"
              >
                <Heart className="w-4 h-4 text-rose-500" />
                <span className="text-xs font-bold text-slate-800">Favorit Saya</span>
              </button>
              <button
                onClick={() => navigate('/chatbot')}
                className="w-full bg-slate-50 hover:bg-slate-100 rounded-xl p-3 text-left border border-slate-200 transition-all min-h-[44px] focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:outline-none flex items-center gap-2"
              >
                <MessageSquare className="w-4 h-4 text-[#0D9488]" />
                <span className="text-xs font-bold text-slate-800">Tanya Chatbot</span>
              </button>
            </div>
          </div>

          {/* Bio / About Me */}
          <div className="lg:col-span-2 bg-white rounded-[24px] border border-slate-200 p-6 shadow-sm space-y-4">
            <h3 className="text-xs font-extrabold text-slate-600 uppercase tracking-wider">Tentang Saya</h3>
            <div className="space-y-3">
              <p className="text-sm text-slate-600 leading-relaxed">
                {user?.bio || 'Belum ada bio. Tambahkan deskripsi singkat untuk personalisasi.'}
              </p>
              <button
                onClick={handleEditBio}
                className="inline-flex items-center gap-1.5 text-sm font-bold text-[#0D9488] hover:text-[#0F766E] px-3 py-2 rounded-lg border border-[#0D9488]/30 bg-[#0D9488]/5 hover:bg-[#0D9488]/10 transition-all min-h-[44px]"
              >
                <Edit2 className="w-4 h-4" />
                <span>Edit Bio</span>
              </button>
            </div>
          </div>
        </div>

        {/* SAVED ITINERARIES ROW */}
        <div className="bg-white rounded-[24px] border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Compass className="w-5 h-5 text-[#0D9488]" />
              <h3 className="text-base font-extrabold font-display text-slate-900">Itinerary Tersimpan</h3>
            </div>
            <Link
              to="/planner"
              className="text-xs font-bold text-[#0D9488] hover:text-[#0F766E] flex items-center gap-1 transition-colors"
            >
              <span>Buat Baru</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {savedTrips.length === 0 ? (
            <div className="p-8 text-center space-y-3 bg-slate-50 rounded-2xl border border-slate-200/60">
              <Compass className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-xs font-bold text-slate-700">Belum ada rute perjalanan tersimpan</p>
              <Link
                to="/planner"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#0D9488] text-white text-xs font-bold shadow-sm hover:bg-[#0F766E] transition-all"
              >
                <span>Mulai Buat Rute</span>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {savedTrips.map((trip) => (
                <div
                  key={trip.id}
                  onClick={() => {
                    setSelectedTripForModal(trip);
                    setIsTripDetailModalOpen(true);
                  }}
                  className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70 hover:border-[#0D9488]/60 hover:shadow-md transition-all cursor-pointer space-y-3 group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-slate-900 overflow-hidden shrink-0">
                      <SafeImage
                        src="/assets/images/heroes/hero-pahawang-bg.png"
                        alt={trip.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-sm font-bold font-display text-slate-900 truncate group-hover:text-[#0D9488] transition-colors">
                        {trip.title}
                      </h4>
                      <p className="text-xs text-slate-500">
                        {Array.isArray(trip.daysJson) ? `${trip.daysJson.length} Hari` : '3 Hari'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* PREFERENCES & ACTIVITY */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* PREFERENSI PERJALANAN */}
          <div className="bg-white rounded-[24px] border border-slate-200 p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold font-display text-slate-900">Preferensi Perjalanan</h3>
            <p className="text-xs text-slate-500">Minat & kategori favoritmu untuk rekomendasi yang lebih relevan</p>

            {/* Category Pills Grid */}
            <div className="flex flex-wrap gap-2 pt-1">
              {[
                { name: 'Pantai', icon: Palmtree },
                { name: 'Kuliner', icon: Utensils },
                { name: 'Budaya', icon: Landmark },
                { name: 'Alam', icon: Mountain },
                { name: 'Adventure', icon: Footprints },
              ].map(({ name, icon: Icon }) => {
                const isActive = (user?.preferences || []).includes(name);
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => handleTogglePreference(name)}
                    aria-pressed={isActive}
                    className={`flex items-center gap-1.5 px-3.5 py-2 min-h-[44px] rounded-2xl text-xs font-bold transition-all border cursor-pointer active:scale-95 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:outline-none ${
                      isActive
                        ? 'bg-[#0D9488] text-white border-[#0D9488] shadow-md shadow-[#0D9488]/20'
                        : 'bg-slate-50 hover:bg-slate-100 border-slate-200/80 text-slate-700'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-[#0D9488]'}`} />
                    <span>{name}</span>
                    {isActive && <CheckCircle2 className="w-3 h-3 text-teal-200 ml-0.5" />}
                  </button>
                );
              })}
            </div>

            <p className="text-[10px] text-slate-400 font-sans pt-1">
              Klik kategori di atas untuk mengaktifkan filter preferensi personalmu.
            </p>
          </div>

          {/* AKTIVITAS TERBARU */}
          <div className="bg-white rounded-[24px] border border-slate-200 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold font-display text-slate-900">Aktivitas Terbaru</h3>
              {userActivities.length > 0 && (
                <button
                  onClick={() => setIsActivitiesModalOpen(true)}
                  className="text-xs font-bold text-[#0D9488] hover:text-[#0F766E] transition-colors"
                >
                  Lihat Semua ({userActivities.length})
                </button>
              )}
            </div>

            {/* Timeline Items */}
            {userActivities.length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-xs">
                <p>Belum ada aktivitas tercatat.</p>
                <p className="text-[10px] text-slate-500 mt-1">Coba simpan rute atau beri ulasan destinasi!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {userActivities.slice(0, 5).map((act, i) => {
                  let IconComp = Compass;
                  let colorClass = 'text-teal-800 bg-teal-50';
                  if (act.iconType === 'heart') {
                    IconComp = Heart;
                    colorClass = 'text-red-500 bg-red-50';
                  } else if (act.iconType === 'star') {
                    IconComp = MessageSquare;
                    colorClass = 'text-amber-500 bg-amber-50';
                  } else if (act.iconType === 'user') {
                    IconComp = UserIcon;
                    colorClass = 'text-blue-500 bg-blue-50';
                  }

                  return (
                    <div key={act.id || i} className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${colorClass}`}>
                        <IconComp className="w-4 h-4" />
                      </div>
                      <div className="flex-1 space-y-0.5">
                        <p className="text-xs font-semibold text-slate-800 leading-snug">{act.title}</p>
                        <div className="flex items-center justify-between text-[10px] text-slate-400 font-sans">
                          <span>{act.subtitle || 'Aktivitas Explorer'}</span>
                          <span>
                            {new Date(act.createdAt).toLocaleDateString('id-ID', {
                              day: 'numeric',
                              month: 'short',
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

        {/* SETTINGS & QUICK ACTIONS */}
        <div className="bg-white rounded-[24px] border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Settings className="w-4 h-4 text-slate-600" />
            <h3 className="text-sm font-extrabold font-display text-slate-900">Pengaturan Cepat</h3>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'Akun', icon: UserIcon },
              { label: 'Notifikasi', icon: Bell },
              { label: 'Privasi', icon: Lock },
              { label: 'Bahasa', icon: Globe },
            ].map(({ label, icon: Icon }) => (
              <button
                key={label}
                onClick={() => triggerToast(`Pengaturan ${label} dibuka`)}
                className="flex items-center justify-between p-3 min-h-[44px] rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200/70 text-xs font-bold text-slate-700 transition-all focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:outline-none"
              >
                <div className="flex items-center gap-2">
                  <Icon className="w-3.5 h-3.5 text-slate-500" />
                  <span>{label}</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              </button>
            ))}
          </div>

          {/* Quick Actions - Value Prop */}
          <div className="pt-2 space-y-2 border-t border-slate-100">
            <p className="text-[10px] text-slate-500 font-medium">Lanjutkan perjalananmu:</p>
            <div className="grid grid-cols-2 gap-2">
              <Link
                to="/planner"
                className="flex items-center justify-center gap-2 p-3 min-h-[44px] rounded-2xl bg-[#0D9488] text-white text-xs font-bold shadow-md hover:bg-[#0F766E] transition-all focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:outline-none"
              >
                <Compass className="w-3.5 h-3.5" />
                <span>Buat Itinerary</span>
              </Link>
              <Link
                to="/explore"
                className="flex items-center justify-center gap-2 p-3 min-h-[44px] rounded-2xl bg-white border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-all focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:outline-none"
              >
                <MapPin className="w-3.5 h-3.5 text-[#0D9488]" />
                <span>Jelajahi Tempat</span>
              </Link>
            </div>
          </div>

          {/* Logout Button */}
          <div className="pt-2">
            <button
              onClick={handleLogout}
              className="w-full py-2.5 min-h-[44px] rounded-2xl bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold transition-all flex items-center justify-center gap-2 focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:outline-none"
            >
              <LogOut className="w-4 h-4" />
              <span>Keluar dari Akun</span>
            </button>
          </div>
        </div>

      </div>

      {/* ================================================================
          EDIT PROFILE & FOTO PROFIL MODAL
          ================================================================ */}
      {isEditModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setIsEditModalOpen(false)}
        >
          <div
            className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-slate-200 my-auto relative animate-in fade-in zoom-in-95 duration-200 space-y-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-[#0D9488]" />
                <h3 className="text-lg font-extrabold font-display text-slate-900">Edit Profil & Foto</h3>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-2 min-w-[44px] min-h-[44px] rounded-xl hover:bg-slate-100 text-slate-500 transition-colors focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:outline-none"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-5">
              {/* Avatar Upload */}
              <div className="flex flex-col items-center space-y-3">
                <div className="relative">
                  {editAvatarUrl ? (
                    <img
                      src={editAvatarUrl}
                      alt="Preview Avatar"
                      className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-lg"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-[#0D9488] text-white flex items-center justify-center font-display font-extrabold text-3xl border-4 border-white shadow-lg">
                      {editFullName ? editFullName.charAt(0).toUpperCase() : 'U'}
                    </div>
                  )}
                  <label
                    htmlFor="avatar-upload"
                    className="absolute bottom-0 right-0 w-10 h-10 min-w-[44px] min-h-[44px] rounded-full bg-[#0D9488] hover:bg-[#0F766E] text-white flex items-center justify-center shadow-md hover:scale-110 transition-transform border border-white cursor-pointer focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:outline-none"
                  >
                    <Camera className="w-4 h-4" />
                    <input
                      id="avatar-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="sr-only"
                      ref={fileInputRef}
                    />
                  </label>
                </div>
                <p className="text-[10px] text-slate-500 text-center max-w-xs">Klik ikon kamera untuk ganti foto (max 4MB)</p>
              </div>

              {/* Full Name */}
              <div className="space-y-1.5">
                <label htmlFor="fullName" className="text-xs font-bold text-slate-700">Nama Lengkap</label>
                <input
                  id="fullName"
                  type="text"
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  className="w-full px-4 py-3 min-h-[44px] rounded-xl border border-slate-200 text-sm focus:border-[#0D9488] focus:ring-2 focus:ring-[#0D9488]/20 focus-visible:outline-none transition-all"
                  placeholder="Nama lengkap"
                  required
                />
              </div>

              {/* Bio */}
              <div className="space-y-1.5">
                <label htmlFor="bio" className="text-xs font-bold text-slate-700">Bio</label>
                <textarea
                  id="bio"
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 min-h-[44px] rounded-xl border border-slate-200 text-sm focus:border-[#0D9488] focus:ring-2 focus:ring-[#0D9488]/20 focus-visible:outline-none transition-all resize-none"
                  placeholder="Tulis bio singkat tentang dirimu..."
                />
              </div>

              {/* Location */}
              <div className="space-y-1.5">
                <label htmlFor="location" className="text-xs font-bold text-slate-700">Lokasi</label>
                <input
                  id="location"
                  type="text"
                  value={editLocation}
                  onChange={(e) => setEditLocation(e.target.value)}
                  className="w-full px-4 py-3 min-h-[44px] rounded-xl border border-slate-200 text-sm focus:border-[#0D9488] focus:ring-2 focus:ring-[#0D9488]/20 focus-visible:outline-none transition-all"
                  placeholder="Kota, Provinsi"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-5 py-2.5 min-h-[44px] rounded-xl border border-slate-200 text-sm font-bold text-slate-700 hover:bg-slate-100 transition-all focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:outline-none"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="px-6 py-2.5 min-h-[44px] rounded-xl bg-[#0D9488] text-white text-sm font-bold shadow-md hover:bg-[#0F766E] disabled:opacity-50 disabled:cursor-not-allowed transition-all focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:outline-none flex items-center gap-2"
                >
                  {isSavingProfile ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      <span>Simpan Perubahan</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================================================================
          TRIP DETAIL MODAL
          ================================================================ */}
      {isTripDetailModalOpen && selectedTripForModal && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setIsTripDetailModalOpen(false)}
        >
          <div
            className="bg-white rounded-3xl p-6 sm:p-8 max-w-2xl w-full max-h-[85vh] shadow-2xl border border-slate-200 my-auto relative animate-in fade-in zoom-in-95 duration-200 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-slate-100 pb-4 mb-4">
              <div className="space-y-1">
                <h3 className="text-lg font-extrabold font-display text-slate-900">{selectedTripForModal.title}</h3>
                <div className="flex items-center gap-3 text-[11px] text-slate-500 font-sans">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-[#0D9488]" />
                    <span>Lampung</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-slate-400" />
                    <span>{Array.isArray(selectedTripForModal.daysJson) ? `${selectedTripForModal.daysJson.length} Hari` : '3 Hari'}</span>
                  </span>
                </div>
              </div>
              <button
                onClick={() => setIsTripDetailModalOpen(false)}
                className="p-2 min-w-[44px] min-h-[44px] rounded-xl hover:bg-slate-100 text-slate-500 transition-colors focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:outline-none shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {Array.isArray(selectedTripForModal.daysJson) ? (
                selectedTripForModal.daysJson.map((day: any, dayIndex: number) => (
                  <div key={dayIndex} className="space-y-3 border border-slate-200 rounded-2xl p-4">
                    <h4 className="text-sm font-bold font-display text-slate-900 flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-[#0D9488]/10 text-[#0D9488] text-[11px] font-extrabold flex items-center justify-center">
                        {dayIndex + 1}
                      </span>
                      Hari {dayIndex + 1}: {day.title || 'Jelajahi Lampung'}
                    </h4>
                    <div className="space-y-2 pl-7 border-l border-slate-200/50">
                      {((day.slots || day.activities) as any[])?.map((item: any, actIndex: number) => {
                        const title = item.activityTitle || item.name || item.title || (typeof item === 'string' ? item : 'Destinasi');
                        const time = item.time || (item.startTime && item.endTime ? `${item.startTime} - ${item.endTime}` : item.startTime || '08:00');
                        const location = item.location;
                        const category = item.category;

                        return (
                          <div key={actIndex} className="flex items-start gap-3 pb-2 last:pb-0">
                            <div className="w-1.5 h-1.5 rounded-full bg-[#0D9488] mt-2 shrink-0" />
                            <div className="space-y-0.5 flex-1">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium text-slate-800">{title}</p>
                                {category && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
                                    {category}
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-slate-400 flex items-center gap-1.5">
                                <span>{time}</span>
                                {location && (
                                  <>
                                    <span>&bull;</span>
                                    <MapPin className="w-2.5 h-2.5 text-[#0D9488]" />
                                    <span>{location}</span>
                                  </>
                                )}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500 text-center py-8">Detail itinerary tidak tersedia</p>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/share/${selectedTripForModal.shareToken}`);
                  triggerToast('Link rute perjalanan berhasil disalin!');
                }}
                className="px-4 py-2.5 min-h-[44px] rounded-xl border border-slate-200 text-sm font-bold text-slate-700 hover:bg-slate-100 transition-all focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:outline-none flex items-center gap-2"
              >
                <Share2 className="w-4 h-4" />
                <span>Bagikan Link</span>
              </button>
              <button
                onClick={() => handleDeleteTrip(selectedTripForModal.id, selectedTripForModal.title)}
                className="px-4 py-2.5 min-h-[44px] rounded-xl bg-red-50 text-red-600 text-sm font-bold hover:bg-red-100 transition-all focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:outline-none flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                <span>Hapus</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================
          ACTIVITIES MODAL
          ================================================================ */}
      {isActivitiesModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setIsActivitiesModalOpen(false)}
        >
          <div
            className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full max-h-[85vh] shadow-2xl border border-slate-200 my-auto relative animate-in fade-in zoom-in-95 duration-200 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-[#0D9488]" />
                <h3 className="text-lg font-extrabold font-display text-slate-900">Semua Aktivitas</h3>
              </div>
              <button
                onClick={() => setIsActivitiesModalOpen(false)}
                className="p-2 min-w-[44px] min-h-[44px] rounded-xl hover:bg-slate-100 text-slate-500 transition-colors focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:outline-none"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {userActivities.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-sm">
                Belum ada aktivitas tercatat.
              </div>
            ) : (
              <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
                {userActivities.map((act, i) => {
                  let IconComp = Compass;
                  let colorClass = 'text-teal-800 bg-teal-50';
                  if (act.iconType === 'heart') {
                    IconComp = Heart;
                    colorClass = 'text-red-500 bg-red-50';
                  } else if (act.iconType === 'star') {
                    IconComp = MessageSquare;
                    colorClass = 'text-amber-500 bg-amber-50';
                  } else if (act.iconType === 'user') {
                    IconComp = UserIcon;
                    colorClass = 'text-blue-500 bg-blue-50';
                  }

                  return (
                    <div key={act.id || i} className="flex items-start gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${colorClass}`}>
                        <IconComp className="w-5 h-5" />
                      </div>
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-semibold text-slate-800 leading-snug">{act.title}</p>
                        <p className="text-xs text-slate-500">{act.subtitle || 'Aktivitas Explorer'}</p>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400">
                          <span>{new Date(act.createdAt).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;