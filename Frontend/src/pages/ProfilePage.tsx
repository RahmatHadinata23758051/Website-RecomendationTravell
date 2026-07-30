import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  User as UserIcon,
  Calendar,
  Compass,
  Heart,
  Trash2,
  LogOut,
  Sparkles,
  CheckCircle2,
  ChevronRight,
  RefreshCw,
  MapPin,
  Star,
  Camera,
  MessageSquare,
  Award,
  Settings,
  Bell,
  Lock,
  Globe,
  Palmtree,
  Mountain,
  Landmark,
  Utensils,
  Footprints,
  Bookmark,
  ExternalLink,
  Edit3,
  Share2,
  Upload,
  X,
  Crown,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../lib/api';
import { fetchRealDestinations } from '../services/destinationsApi';
import { Destination, mockDestinations } from './ExplorePage';

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
  const [isLoadingTrips, setIsLoadingTrips] = useState<boolean>(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Edit Profile Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [editFullName, setEditFullName] = useState<string>('');
  const [editBio, setEditBio] = useState<string>('');
  const [editLocation, setEditLocation] = useState<string>('');
  const [editAvatarUrl, setEditAvatarUrl] = useState<string>('');
  const [isSavingProfile, setIsSavingProfile] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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
    setEditBio(user?.bio || 'Pecinta alam & budaya Lampung 🌴');
    setEditLocation(user?.location || 'Bandar Lampung, Lampung, Indonesia');
    setEditAvatarUrl(user?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80');
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
      setIsLoadingTrips(true);
      try {
        const res = await apiClient.get('/itineraries/my-trips');
        if (isMounted && res.data?.data?.itineraries) {
          setSavedTrips(res.data.data.itineraries);
        }
      } catch (err) {
        // Fallback mock
      } finally {
        if (isMounted) setIsLoadingTrips(false);
      }
    };

    // Fetch Favorites
    const fetchFavorites = async () => {
      try {
        const allDests = await fetchRealDestinations({ limit: 100 });
        const res = await apiClient.get('/favorites');
        if (isMounted && res.data?.data) {
          const favIds = res.data.data.map((f: any) => f.canonicalId);
          const pool = allDests && allDests.length > 0 ? allDests : mockDestinations;
          const matched = pool.filter((d) => favIds.includes(d.id));
          setFavoriteDestinations(matched.length > 0 ? matched : mockDestinations.slice(0, 4));
        } else if (isMounted) {
          setFavoriteDestinations(mockDestinations.slice(0, 4));
        }
      } catch (err) {
        if (isMounted) setFavoriteDestinations(mockDestinations.slice(0, 4));
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
    <div className="flex flex-col min-h-[100dvh] pt-24 pb-16 bg-[#F8FAFC]">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#0F2937] text-white px-5 py-3 rounded-2xl shadow-2xl border border-teal-400/30 flex items-center gap-3 transition-all animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-[#2DD4BF]" />
          <span className="text-xs font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* ================================================================
          HERO BANNER SECTION (Matching Reference Image)
          - Scenic Pahawang Beach background with subtle Tapis overlay
          ================================================================ */}
      <section className="relative w-screen overflow-hidden -mt-24 mb-6" style={{ marginLeft: 'calc(-50vw + 50%)', width: '100vw' }}>
        {/* Background Scenic Image */}
        <img
          src="/assets/images/heroes/hero-pahawang-bg.png"
          alt="Pahawang Beach Banner"
          className="absolute inset-0 w-full h-full object-cover object-center z-0"
        />
        {/* Soft White Gradient Overlay for Text Clarity */}
        <div className="absolute inset-0 bg-gradient-to-r from-white/95 via-white/85 to-white/40 z-[1]" />
        <div className="absolute inset-0 z-[1]" style={{ background: 'linear-gradient(to bottom, transparent 30%, rgba(248,250,252,0.8) 75%, #F8FAFC 100%)' }} />

        {/* Faint Tapis Watermark */}
        <img
          src="/assets/images/patterns/lampung-tapis-pattern-transparent.png"
          alt=""
          aria-hidden="true"
          className="absolute top-0 left-0 w-[550px] h-auto opacity-40 pointer-events-none z-[2]"
        />

        {/* Hero Welcome Banner Content */}
        <div className="relative z-10 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-28 pb-4 space-y-2">
          <div className="flex items-center gap-2">
            <img
              src="/assets/images/logos/siger-gold-icon.png"
              alt="Siger Crown"
              className="w-5 h-5 object-contain"
            />
            <span className="text-xs font-semibold text-slate-600 font-sans">
              Selamat datang kembali,
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-display font-extrabold text-slate-900 tracking-tight">
            {user.fullName}
          </h1>

          <p className="text-xs sm:text-sm text-slate-600 font-sans max-w-2xl leading-relaxed">
            Jelajahi keindahan Lampung dan temukan pengalaman terbaik yang personal, akurat, dan sesuai minatmu.
          </p>
        </div>
      </section>

      {/* MAIN CONTAINER */}
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 space-y-8">

        {/* ================================================================
            TOP 3 PROFILE FEATURE CARDS GRID (Matching Mockup)
            ================================================================ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">

          {/* CARD 1 (5 COLS): USER AVATAR & STATS CARD */}
          <div className="lg:col-span-5 bg-white rounded-[28px] p-6 shadow-sm border border-slate-200/80 flex flex-col justify-between space-y-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                {/* Circular Avatar with Camera Upload Icon */}
                <div className="relative shrink-0 cursor-pointer" onClick={handleOpenEditModal}>
                  <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-white shadow-md bg-[#0D9488] text-white flex items-center justify-center font-display font-extrabold text-2xl">
                    {user.avatarUrl ? (
                      <img
                        src={user.avatarUrl}
                        alt={user.fullName}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : null}
                    <span className="uppercase">{user.fullName ? user.fullName.charAt(0) : 'U'}</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleOpenEditModal}
                    title="Ganti Foto Profil"
                    className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-[#0D9488] hover:bg-[#0F766E] text-white flex items-center justify-center shadow-md hover:scale-110 transition-transform border border-white"
                  >
                    <Camera className="w-3 h-3" />
                  </button>
                </div>

                {/* User Info */}
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <h2 className="text-base font-extrabold font-display text-slate-900">{user.fullName}</h2>
                    <span title="VIP Explorer">
                      <Crown className="w-4 h-4 text-amber-500 shrink-0" />
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
                    <span>{user.bio || 'Pecinta alam & budaya Lampung 🌴'}</span>
                  </p>
                  <p className="text-[11px] text-slate-400 font-sans flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-[#0D9488] shrink-0" />
                    <span>{user.location || 'Bandar Lampung, Lampung, Indonesia'}</span>
                  </p>
                  <p className="text-[10px] text-slate-400 font-sans flex items-center gap-1 pt-0.5">
                    <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                    <span>Bergabung sejak Mei 2024</span>
                  </p>
                </div>
              </div>

              {/* Edit Profil Button */}
              <button
                onClick={handleOpenEditModal}
                className="px-3.5 py-1.5 rounded-full border border-[#0D9488]/40 hover:bg-teal-50 text-[#0D9488] text-xs font-bold transition-all shrink-0 flex items-center gap-1 shadow-2xs active:scale-95"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit Profil</span>
              </button>
            </div>

            {/* Bottom 4 Metric Columns Bar */}
            <div className="pt-4 border-t border-slate-100 grid grid-cols-4 gap-2 text-center">
              <div className="space-y-0.5">
                <div className="flex items-center justify-center gap-1 text-[#0D9488]">
                  <Compass className="w-3.5 h-3.5" />
                  <span className="text-base font-extrabold font-display">{savedTrips.length}</span>
                </div>
                <p className="text-[9px] font-semibold text-slate-500">Perjalanan Disimpan</p>
              </div>

              <div className="space-y-0.5 border-l border-slate-100">
                <div className="flex items-center justify-center gap-1 text-red-500">
                  <Heart className="w-3.5 h-3.5 fill-current" />
                  <span className="text-base font-extrabold font-display">{favoriteDestinations.length}</span>
                </div>
                <p className="text-[9px] font-semibold text-slate-500">Destinasi Favorit</p>
              </div>

              <div className="space-y-0.5 border-l border-slate-100">
                <div className="flex items-center justify-center gap-1 text-amber-500">
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span className="text-base font-extrabold font-display">24</span>
                </div>
                <p className="text-[9px] font-semibold text-slate-500">Ulasan Ditulis</p>
              </div>

              <div className="space-y-0.5 border-l border-slate-100">
                <div className="flex items-center justify-center gap-1 text-amber-600">
                  <Star className="w-3.5 h-3.5 fill-current" />
                  <span className="text-base font-extrabold font-display">1.250</span>
                </div>
                <p className="text-[9px] font-semibold text-slate-500">Poin Perjalanan</p>
              </div>
            </div>
          </div>

          {/* CARD 2 (4 COLS): PREFERENSI PERJALANAN CARD */}
          <div className="lg:col-span-4 bg-white rounded-[28px] p-6 shadow-sm border border-slate-200/80 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <div>
                  <h3 className="text-sm font-extrabold font-display text-slate-900">Preferensi Perjalanan</h3>
                  <p className="text-[10px] text-slate-500 font-medium">Minat & kategori favoritmu</p>
                </div>
              </div>

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
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-xs font-bold transition-all border cursor-pointer active:scale-95 ${
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
            </div>

            <p className="text-[10px] text-slate-400 font-sans pt-1">
              Klik kategori di atas untuk mengaktifkan filter preferensi personalmu.
            </p>
          </div>

          {/* CARD 3 (3 COLS): LEVEL KEANGGOTAAN EXPLORER CARD */}
          {(() => {
            const userXp = user?.xp || 0;
            const getExplorerLevelInfo = (xp: number = 0) => {
              if (xp >= 1000) return { level: 5, name: 'Legenda Kelana Lampung', minXp: 1000, maxXp: 2000, badgeBg: 'bg-gradient-to-r from-amber-500 to-amber-600' };
              if (xp >= 600) return { level: 4, name: 'Pakar Wisata Lampung', minXp: 600, maxXp: 1000, badgeBg: 'bg-gradient-to-r from-purple-500 to-purple-700' };
              if (xp >= 300) return { level: 3, name: 'Explorer Sejati', minXp: 300, maxXp: 600, badgeBg: 'bg-gradient-to-r from-blue-500 to-teal-600' };
              if (xp >= 100) return { level: 2, name: 'Kelana Muda', minXp: 100, maxXp: 300, badgeBg: 'bg-gradient-to-r from-teal-500 to-emerald-600' };
              return { level: 1, name: 'Penjelajah Pemula', minXp: 0, maxXp: 100, badgeBg: 'bg-gradient-to-r from-slate-600 to-slate-800' };
            };

            const levelInfo = getExplorerLevelInfo(userXp);
            const progressPercent = Math.min(100, Math.max(0, ((userXp - levelInfo.minXp) / (levelInfo.maxXp - levelInfo.minXp)) * 100));

            return (
              <div className="lg:col-span-3 bg-gradient-to-br from-[#FFFBEB] via-[#FEF3C7]/40 to-[#FFFBEB] rounded-[28px] p-6 shadow-sm border border-amber-200/80 flex flex-col justify-between space-y-4 relative overflow-hidden">
                <div className="space-y-3 relative z-10">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold text-white shadow-xs ${levelInfo.badgeBg}`}>
                          Level {levelInfo.level}
                        </span>
                        <p className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">Level Keanggotaan</p>
                      </div>
                      <h3 className="text-base sm:text-lg font-extrabold font-display text-slate-900 pt-0.5">
                        {levelInfo.name}
                      </h3>
                    </div>
                    {/* Gold Medal / Crown Icon */}
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-white flex items-center justify-center shadow-md border border-white shrink-0">
                      <Award className="w-5 h-5" />
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-600 font-sans leading-relaxed">
                    Dapatkan XP dengan membuat rute AI (+50), menulis ulasan (+30), edit profil (+20), atau simpan favorit (+15)!
                  </p>

                  {/* Progress Bar */}
                  <div className="space-y-1 pt-1">
                    <div className="w-full h-2.5 rounded-full bg-amber-200/70 overflow-hidden relative border border-amber-300/40">
                      <div
                        className="h-full bg-gradient-to-r from-amber-400 to-amber-600 rounded-full transition-all duration-500 shadow-sm"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[10px] font-bold text-amber-900 font-mono">
                      <span>{userXp} / {levelInfo.maxXp} XP</span>
                      <span>Level {levelInfo.level < 5 ? levelInfo.level + 1 : 'MAX'}</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => triggerToast(`Status: ${levelInfo.name} (${userXp} XP). Dapatkan +50 XP tiap buat Rute AI!`)}
                  className="text-xs font-bold text-amber-800 hover:text-amber-950 transition-colors flex items-center gap-1 pt-1 self-start relative z-10"
                >
                  <span>Lihat Perolehan XP</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })()}

        </div>

        {/* ================================================================
            MAIN CONTENT SECTION (2 COLUMNS: LEFT 8 COLS, RIGHT 4 COLS)
            ================================================================ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

          {/* LEFT COLUMN (8 COLS): WISHLIST & RIWAYAT PERJALANAN */}
          <div className="lg:col-span-8 space-y-8">

            {/* SECTION 1: WISHLIST DESTINASI */}
            <div className="bg-white rounded-[28px] p-6 shadow-sm border border-slate-200/80 space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Bookmark className="w-4 h-4 text-amber-500" />
                    <h3 className="text-base font-extrabold font-display text-slate-900">Wishlist Destinasi</h3>
                  </div>
                  <p className="text-xs text-slate-500">Destinasi yang ingin kamu kunjungi</p>
                </div>

                <Link
                  to="/favorites"
                  className="text-xs font-bold text-[#0D9488] hover:text-[#0F766E] flex items-center gap-1 transition-colors"
                >
                  <span>Lihat Semua</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {/* Destination Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {favoriteDestinations.slice(0, 4).map((dest) => (
                  <div
                    key={dest.id}
                    onClick={() => navigate('/explore')}
                    className="group relative rounded-2xl overflow-hidden bg-slate-900 shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer aspect-[4/5] flex flex-col justify-between p-3.5"
                  >
                    <img
                      src={dest.image}
                      alt={dest.name}
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/assets/images/heroes/hero-pahawang-bg.png';
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/30 to-slate-950/20" />

                    {/* Category Tag & Heart Icon */}
                    <div className="relative z-10 flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-[#0D9488] text-white">
                        {dest.category}
                      </span>
                      <button className="w-6 h-6 rounded-full bg-slate-900/60 text-white flex items-center justify-center backdrop-blur-sm">
                        <Heart className="w-3 h-3 fill-current text-red-400" />
                      </button>
                    </div>

                    {/* Bottom Info */}
                    <div className="relative z-10 space-y-1 text-white">
                      <h4 className="text-xs font-bold font-display leading-tight line-clamp-1 group-hover:text-teal-300 transition-colors">
                        {dest.name}
                      </h4>
                      <p className="text-[10px] text-slate-300">{dest.location}</p>
                      <div className="flex items-center justify-between text-[10px] text-amber-400 font-bold pt-0.5">
                        <span>★ {dest.rating} ({dest.reviews})</span>
                        <span className="text-slate-300 font-normal">{dest.duration}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* SECTION 2: RIWAYAT PERJALANAN (ITINERARY TERSIMPAN) */}
            <div className="bg-white rounded-[28px] p-6 shadow-sm border border-slate-200/80 space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Compass className="w-4 h-4 text-[#0D9488]" />
                    <h3 className="text-base font-extrabold font-display text-slate-900">Riwayat Perjalanan</h3>
                  </div>
                  <p className="text-xs text-slate-500">Perjalanan yang telah kamu jadwalkan atau simpan</p>
                </div>

                <Link
                  to="/planner"
                  className="text-xs font-bold text-[#0D9488] hover:text-[#0F766E] flex items-center gap-1 transition-colors"
                >
                  <span>Lihat Semua</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {/* Saved Trips List */}
              {isLoadingTrips ? (
                <div className="p-8 text-center space-y-2">
                  <RefreshCw className="w-6 h-6 text-[#0D9488] animate-spin mx-auto" />
                  <p className="text-xs text-slate-500">Memuat rute perjalanan...</p>
                </div>
              ) : savedTrips.length === 0 ? (
                <div className="p-8 text-center space-y-3 bg-slate-50 rounded-2xl border border-slate-200/60">
                  <Compass className="w-10 h-10 text-slate-300 mx-auto" />
                  <p className="text-xs font-bold text-slate-700">Belum ada rute perjalanan tersimpan</p>
                  <Link
                    to="/planner"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#0D9488] text-white text-xs font-bold shadow-sm hover:bg-[#0F766E] transition-all"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    <span>Buat Itinerary Baru</span>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {savedTrips.map((trip) => (
                    <div
                      key={trip.id}
                      onClick={() => {
                        setSelectedTripForModal(trip);
                        setIsTripDetailModalOpen(true);
                      }}
                      className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200/70 hover:border-[#0D9488]/60 hover:shadow-md transition-all group cursor-pointer"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-xl bg-slate-900 overflow-hidden shrink-0 relative">
                          <img
                            src="/assets/images/heroes/hero-pahawang-bg.png"
                            alt="Trip Thumbnail"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                        </div>

                        <div className="space-y-1">
                          <h4 className="text-sm font-bold font-display text-slate-900 group-hover:text-[#0D9488] transition-colors">
                            {trip.title}
                          </h4>
                          <div className="flex items-center gap-3 text-[11px] text-slate-500 font-sans">
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-[#0D9488]" />
                              <span>Lampung</span>
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-slate-400" />
                              <span>{Array.isArray(trip.daysJson) ? `${trip.daysJson.length} Hari` : '3 Hari'}</span>
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="hidden sm:inline-block px-3 py-1 rounded-full text-[10px] font-bold bg-teal-100 text-[#0D9488]">
                          Tersimpan
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigator.clipboard.writeText(`${window.location.origin}/share/${trip.shareToken}`);
                            triggerToast('Link rute perjalanan berhasil disalin!');
                          }}
                          className="p-2 rounded-full hover:bg-teal-50 text-slate-500 hover:text-[#0D9488] transition-colors"
                          title="Bagikan Link Rute"
                        >
                          <Share2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTripForModal(trip);
                            setIsTripDetailModalOpen(true);
                          }}
                          className="p-2 rounded-full hover:bg-slate-200 text-slate-600 transition-colors"
                          title="Lihat Detail Rute"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => handleDeleteTrip(trip.id, trip.title, e)}
                          className="p-2 rounded-full hover:bg-red-100 text-slate-400 hover:text-red-600 transition-colors"
                          title="Hapus Rute"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* RIGHT COLUMN (4 COLS): AKTIVITAS TERBARU & PENGATURAN CEPAT */}
          <div className="lg:col-span-4 space-y-8">

            {/* CARD 1: AKTIVITAS TERBARU */}
            <div className="bg-white rounded-[28px] p-6 shadow-sm border border-slate-200/80 space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#0D9488]" />
                  <h3 className="text-base font-extrabold font-display text-slate-900">Aktivitas Terbaru</h3>
                </div>
                <button
                  onClick={() => setIsActivitiesModalOpen(true)}
                  className="text-xs font-bold text-[#0D9488] hover:text-[#0F766E] transition-colors"
                >
                  Lihat Semua (10) &gt;
                </button>
              </div>

              {/* Timeline Items (Display top 4 only on profile card) */}
              <div className="space-y-4">
                {(userActivities.length > 0
                  ? userActivities.slice(0, 4)
                  : [
                      {
                        id: 'act-1',
                        title: 'Menyimpan destinasi Pulau Pahawang ke wishlist',
                        subtitle: '+15 XP',
                        iconType: 'heart',
                        createdAt: new Date().toISOString(),
                      },
                      {
                        id: 'act-2',
                        title: 'Membuat Rute Perjalanan AI Lampung',
                        subtitle: '+50 XP',
                        iconType: 'map',
                        createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
                      },
                      {
                        id: 'act-3',
                        title: 'Memperbarui Foto & Biodata Profil',
                        subtitle: '+20 XP',
                        iconType: 'user',
                        createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
                      },
                      {
                        id: 'act-4',
                        title: 'Memberi ulasan destinasi Seruit Lampung',
                        subtitle: '+30 XP',
                        iconType: 'star',
                        createdAt: new Date(Date.now() - 3600000 * 48).toISOString(),
                      },
                    ]
                ).map((act, i) => {
                  let IconComp = Star;
                  let colorClass = 'text-amber-500 bg-amber-50';
                  if (act.iconType === 'heart') {
                    IconComp = Heart;
                    colorClass = 'text-red-500 bg-red-50';
                  } else if (act.iconType === 'map') {
                    IconComp = Compass;
                    colorClass = 'text-teal-600 bg-teal-50';
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
            </div>

            {/* CARD 2: PENGATURAN CEPAT */}
            <div className="bg-white rounded-[28px] p-6 shadow-sm border border-slate-200/80 space-y-4">
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
                    className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200/70 text-xs font-bold text-slate-700 transition-all"
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="w-3.5 h-3.5 text-slate-500" />
                      <span>{label}</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                ))}
              </div>

              {/* Logout Button */}
              <div className="pt-2">
                <button
                  onClick={handleLogout}
                  className="w-full py-2.5 rounded-2xl bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold transition-all flex items-center justify-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Keluar dari Akun</span>
                </button>
              </div>
            </div>

          </div>

        </div>

      </div>

      {/* ================================================================
          EDIT PROFILE & FOTO PROFIL MODAL
          ================================================================ */}
      {isEditModalOpen && (
        <div
          className="fixed inset-0 z-50 glass-modal-backdrop flex items-center justify-center p-4 overflow-y-auto"
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
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form Content */}
            <form onSubmit={handleSaveProfile} className="space-y-5">
              {/* Avatar Upload Preview */}
              <div className="flex flex-col items-center justify-center space-y-3">
                <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                  <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-slate-100 shadow-md bg-[#0D9488] text-white flex items-center justify-center font-display font-extrabold text-3xl">
                    {editAvatarUrl ? (
                      <img
                        src={editAvatarUrl}
                        alt="Avatar Preview"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : null}
                    <span className="uppercase">{editFullName ? editFullName.charAt(0) : 'U'}</span>
                  </div>
                  <div className="absolute inset-0 rounded-full bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1">
                    <Upload className="w-4 h-4" />
                    <span>Ubah</span>
                  </div>
                </div>

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*"
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all flex items-center gap-1.5"
                >
                  <Upload className="w-3.5 h-3.5 text-[#0D9488]" />
                  <span>Unggah Foto Komputer</span>
                </button>

                {/* Preset Avatars Selection */}
                <div className="space-y-1 text-center pt-1">
                  <p className="text-[10px] text-slate-400 font-semibold">Atau pilih avatar default:</p>
                  <div className="flex items-center gap-2 justify-center">
                    {[
                      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
                      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
                      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&q=80',
                      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80',
                    ].map((presetUrl, idx) => (
                      <button
                        type="button"
                        key={idx}
                        onClick={() => setEditAvatarUrl(presetUrl)}
                        className={`w-9 h-9 rounded-full overflow-hidden border-2 transition-all ${
                          editAvatarUrl === presetUrl ? 'border-[#0D9488] ring-2 ring-[#0D9488]/30 scale-110' : 'border-white opacity-70 hover:opacity-100'
                        }`}
                      >
                        <img src={presetUrl} alt={`Preset ${idx}`} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Form Input Fields */}
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-800">Nama Lengkap</label>
                  <input
                    type="text"
                    value={editFullName}
                    onChange={(e) => setEditFullName(e.target.value)}
                    required
                    placeholder="Nama lengkap kamu..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-semibold focus:outline-none focus:border-[#0D9488]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-800">Bio / Tagline Minat</label>
                  <input
                    type="text"
                    value={editBio}
                    onChange={(e) => setEditBio(e.target.value)}
                    placeholder="Misal: Pecinta pantai & wisata budaya Lampung 🌴"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-semibold focus:outline-none focus:border-[#0D9488]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-800">Lokasi / Asal Kota</label>
                  <input
                    type="text"
                    value={editLocation}
                    onChange={(e) => setEditLocation(e.target.value)}
                    placeholder="Misal: Bandar Lampung, Indonesia"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-semibold focus:outline-none focus:border-[#0D9488]"
                  />
                </div>
              </div>

              {/* Modal Buttons */}
              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-5 py-2.5 rounded-full border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-all"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="px-6 py-2.5 rounded-full bg-[#0D9488] hover:bg-[#0F766E] text-white text-xs font-bold shadow-md shadow-[#0D9488]/20 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {isSavingProfile ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <span>Simpan Perubahan</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================================================================
          10 AKTIVITAS TERBARU MODAL
          ================================================================ */}
      {isActivitiesModalOpen && (
        <div
          className="fixed inset-0 z-50 glass-modal-backdrop flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setIsActivitiesModalOpen(false)}
        >
          <div
            className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-slate-200 my-auto relative animate-in fade-in zoom-in-95 duration-200 space-y-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#0D9488]" />
                <div>
                  <h3 className="text-lg font-extrabold font-display text-slate-900">Riwayat 10 Aktivitas Terbaru</h3>
                  <p className="text-xs text-slate-500 font-sans">Aktivitas penjelajahan & perolehan XP kamu</p>
                </div>
              </div>
              <button
                onClick={() => setIsActivitiesModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Activities List (Max 10) */}
            <div className="space-y-3.5 max-h-[60vh] overflow-y-auto pr-1">
              {(userActivities.length > 0
                ? userActivities
                : [
                    {
                      id: 'act-1',
                      title: 'Menyimpan destinasi Pulau Pahawang ke wishlist',
                      subtitle: '+15 XP',
                      iconType: 'heart',
                      createdAt: new Date().toISOString(),
                    },
                    {
                      id: 'act-2',
                      title: 'Membuat Rute Perjalanan AI Lampung',
                      subtitle: '+50 XP',
                      iconType: 'map',
                      createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
                    },
                    {
                      id: 'act-3',
                      title: 'Memperbarui Foto & Biodata Profil',
                      subtitle: '+20 XP',
                      iconType: 'user',
                      createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
                    },
                    {
                      id: 'act-4',
                      title: 'Memberi ulasan destinasi Seruit Lampung',
                      subtitle: '+30 XP',
                      iconType: 'star',
                      createdAt: new Date(Date.now() - 3600000 * 48).toISOString(),
                    },
                  ]
              ).map((act, i) => {
                let IconComp = Star;
                let colorClass = 'text-amber-500 bg-amber-50';
                if (act.iconType === 'heart') {
                  IconComp = Heart;
                  colorClass = 'text-red-500 bg-red-50';
                } else if (act.iconType === 'map') {
                  IconComp = Compass;
                  colorClass = 'text-teal-600 bg-teal-50';
                } else if (act.iconType === 'user') {
                  IconComp = UserIcon;
                  colorClass = 'text-blue-500 bg-blue-50';
                }

                return (
                  <div key={act.id || i} className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${colorClass}`}>
                      <IconComp className="w-4 h-4" />
                    </div>
                    <div className="flex-1 space-y-0.5">
                      <p className="text-xs font-bold text-slate-800 leading-snug">{act.title}</p>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-sans">
                        <span className="font-semibold text-teal-700">{act.subtitle || 'Aktivitas Explorer'}</span>
                        <span>
                          {new Date(act.createdAt).toLocaleString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setIsActivitiesModalOpen(false)}
                className="px-5 py-2 rounded-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================
          FULL ITINERARY ROUTE DETAIL MODAL
          ================================================================ */}
      {isTripDetailModalOpen && selectedTripForModal && (
        <div
          className="fixed inset-0 z-50 glass-modal-backdrop flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setIsTripDetailModalOpen(false)}
        >
          <div
            className="bg-white rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl border border-slate-200 my-auto relative animate-in fade-in zoom-in-95 duration-200 space-y-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-teal-50 text-[#0D9488] flex items-center justify-center font-bold">
                  <Compass className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold font-display text-slate-900">{selectedTripForModal.title}</h3>
                  <p className="text-xs text-slate-500 font-sans">
                    Dibuat pada {new Date(selectedTripForModal.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsTripDetailModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Days Schedule List */}
            <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2">
              {Array.isArray(selectedTripForModal.daysJson) && selectedTripForModal.daysJson.length > 0 ? (
                selectedTripForModal.daysJson.map((dayData: any, dayIdx: number) => (
                  <div key={dayIdx} className="space-y-3">
                    <div className="flex items-center gap-2 pb-1 border-b border-teal-100">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-[#0D9488] text-white">
                        Hari {dayData.day || dayIdx + 1}
                      </span>
                      <h4 className="text-xs font-bold text-slate-800">
                        {dayData.title || `Jadwal Hari Ke-${dayIdx + 1}`}
                      </h4>
                    </div>

                    <div className="space-y-2 pl-2 border-l-2 border-teal-200">
                      {(dayData.slots || dayData.destinations || []).map((slot: any, slotIdx: number) => (
                        <div key={slotIdx} className="p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                          <div className="flex items-center justify-between">
                            <h5 className="text-xs font-bold text-slate-900">{slot.name || slot.title || `Destinasi ${slotIdx + 1}`}</h5>
                            {slot.time && (
                              <span className="text-[10px] font-mono font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full">
                                ⏱ {slot.time}
                              </span>
                            )}
                          </div>
                          {slot.description && (
                            <p className="text-[11px] text-slate-600 font-sans leading-relaxed">{slot.description}</p>
                          )}
                          {slot.estimated_cost && (
                            <p className="text-[10px] text-amber-700 font-bold">Estimasi Tiket: {slot.estimated_cost}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-6 text-center text-xs text-slate-500">
                  Detail rute itinerary tersedia di link bagikan.
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/share/${selectedTripForModal.shareToken}`);
                  triggerToast('Link rute perjalanan berhasil disalin!');
                }}
                className="px-4 py-2 rounded-full border border-teal-300 text-[#0D9488] hover:bg-teal-50 text-xs font-bold transition-all flex items-center gap-1.5"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Bagikan Rute</span>
              </button>

              <button
                onClick={() => setIsTripDetailModalOpen(false)}
                className="px-5 py-2 rounded-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
