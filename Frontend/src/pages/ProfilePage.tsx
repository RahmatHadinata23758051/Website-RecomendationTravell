import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../lib/api';
import { fetchRealDestinations } from '../services/destinationsApi';
import { Destination, mockDestinations } from './ExplorePage';

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

  const [savedTrips, setSavedTrips] = useState<SavedItinerary[]>([]);
  const [favoriteDestinations, setFavoriteDestinations] = useState<Destination[]>([]);
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

    fetchMyTrips();
    fetchFavorites();

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
                <div className="relative shrink-0">
                  <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-white shadow-md bg-slate-100 flex items-center justify-center text-slate-700 font-display font-extrabold text-2xl">
                    <img
                      src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80"
                      alt={user.fullName}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                    <span className="uppercase">{user.fullName ? user.fullName.charAt(0) : 'U'}</span>
                  </div>
                  <button className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-[#0D9488] text-white flex items-center justify-center shadow-md hover:scale-105 transition-transform border border-white">
                    <Camera className="w-3 h-3" />
                  </button>
                </div>

                {/* User Info */}
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <h2 className="text-base font-extrabold font-display text-slate-900">{user.fullName}</h2>
                    <span title="VIP Explorer">👑</span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
                    <span>Pecinta alam & budaya Lampung 🌴</span>
                  </p>
                  <p className="text-[11px] text-slate-400 font-sans flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-[#0D9488] shrink-0" />
                    <span>Bandar Lampung, Lampung, Indonesia</span>
                  </p>
                  <p className="text-[10px] text-slate-400 font-sans flex items-center gap-1 pt-0.5">
                    <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                    <span>Bergabung sejak Mei 2024</span>
                  </p>
                </div>
              </div>

              {/* Edit Profil Button */}
              <button className="px-3.5 py-1.5 rounded-full border border-[#0D9488]/40 hover:bg-teal-50 text-[#0D9488] text-xs font-bold transition-all shrink-0 flex items-center gap-1">
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
                ].map(({ name, icon: Icon }) => (
                  <div
                    key={name}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs font-bold text-slate-700 shadow-2xs"
                  >
                    <Icon className="w-3.5 h-3.5 text-[#0D9488]" />
                    <span>{name}</span>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => navigate('/explore')}
              className="text-xs font-bold text-[#0D9488] hover:text-[#0F766E] transition-colors flex items-center gap-1 pt-2 self-start"
            >
              <span>Kelola Preferensi</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* CARD 3 (3 COLS): LEVEL KEANGGOTAAN EXPLORER CARD */}
          <div className="lg:col-span-3 bg-gradient-to-br from-[#FFFBEB] via-[#FEF3C7]/40 to-[#FFFBEB] rounded-[28px] p-6 shadow-sm border border-amber-200/80 flex flex-col justify-between space-y-4 relative overflow-hidden">
            <div className="space-y-3 relative z-10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">Level Keanggotaan</p>
                  <h3 className="text-lg font-extrabold font-display text-slate-900">Explorer Lampung</h3>
                </div>
                {/* Gold Medal Icon */}
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-white flex items-center justify-center shadow-md border border-white">
                  <Award className="w-5 h-5" />
                </div>
              </div>

              <p className="text-[11px] text-slate-600 font-sans leading-relaxed">
                Terus jelajahi untuk naik level dan dapatkan hadiah menarik!
              </p>

              {/* Progress Bar */}
              <div className="space-y-1 pt-1">
                <div className="w-full h-2 rounded-full bg-amber-200/70 overflow-hidden">
                  <div className="h-full bg-amber-500 rounded-full w-[62.5%]" />
                </div>
                <div className="flex items-center justify-between text-[10px] font-bold text-amber-800">
                  <span>1.250 / 2.000 XP</span>
                  <span>Level Berikutnya</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => triggerToast('Benefit Explorer Lampung: Diskon tiket & rekomendasi prioritas AI')}
              className="text-xs font-bold text-amber-800 hover:text-amber-950 transition-colors flex items-center gap-1 pt-1 self-start relative z-10"
            >
              <span>Lihat Benefit</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

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
                      className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200/70 hover:border-[#0D9488]/60 transition-all group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-xl bg-slate-900 overflow-hidden shrink-0 relative">
                          <img
                            src="/assets/images/heroes/hero-pahawang-bg.png"
                            alt="Trip Thumbnail"
                            className="w-full h-full object-cover"
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
                              <span>{Array.isArray(trip.daysJson) ? `${trip.daysJson.length} Hari 2 Malam` : '3 Hari'}</span>
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-teal-100 text-[#0D9488]">
                          Selesai
                        </span>
                        <Link
                          to={`/share/${trip.shareToken}`}
                          className="p-2 rounded-full hover:bg-slate-200 text-slate-600 transition-colors"
                          title="Lihat Detail"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={(e) => handleDeleteTrip(trip.id, trip.title, e)}
                          className="p-2 rounded-full hover:bg-red-100 text-slate-400 hover:text-red-600 transition-colors"
                          title="Hapus"
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
                <button className="text-xs font-bold text-[#0D9488] hover:text-[#0F766E] transition-colors">
                  Lihat Semua &gt;
                </button>
              </div>

              {/* Timeline Items */}
              <div className="space-y-4">
                {[
                  {
                    icon: Heart,
                    color: 'text-red-500 bg-red-50',
                    text: 'Menyimpan destinasi Pulau Pahawang ke dalam wishlist',
                    time: '2 jam lalu',
                  },
                  {
                    icon: Star,
                    color: 'text-amber-500 bg-amber-50',
                    text: 'Memberi ulasan untuk Seruit Lampung',
                    time: '1 hari lalu',
                  },
                  {
                    icon: Compass,
                    color: 'text-teal-600 bg-teal-50',
                    text: 'Membuat itinerary 3 Hari di Lampung',
                    time: '2 hari lalu',
                  },
                  {
                    icon: Camera,
                    color: 'text-blue-500 bg-blue-50',
                    text: 'Mengunggah foto di Pantai Gigi Hiu',
                    time: '3 hari lalu',
                  },
                ].map((act, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${act.color}`}>
                      <act.icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 space-y-0.5">
                      <p className="text-xs font-semibold text-slate-800 leading-snug">{act.text}</p>
                      <p className="text-[10px] text-slate-400 font-sans">{act.time}</p>
                    </div>
                  </div>
                ))}
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
    </div>
  );
};
