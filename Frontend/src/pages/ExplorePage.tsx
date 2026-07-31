import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Search,
  MapPin,
  Sparkles,
  Heart,
  Filter,
  X,
  Star,
  Clock,
  Tag,
  ChevronRight,
  ExternalLink,
  Palmtree,
  Mountain,
  Landmark,
  Utensils,
  Footprints,
  SlidersHorizontal,
  Compass,
  CheckCircle2,
  ArrowUpRight,
} from 'lucide-react';
import L from 'leaflet';
import { fetchRealDestinations } from '../services/destinationsApi';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../lib/api';
import { logUserActivity } from '../services/activitiesApi';
import {
  fetchDestinationReviews,
  createDestinationReview,
  ReviewSummary,
} from '../services/reviewsApi';
import { WeatherWidget } from '../components/WeatherWidget';

export interface Destination {
  id: string;
  name: string;
  location: string;
  regency: string;
  category: 'Pantai' | 'Alam' | 'Budaya' | 'Kuliner' | 'Adventure';
  rating: number;
  reviews: number;
  price: string;
  numericPrice: number;
  duration: string;
  hours: string;
  image: string;
  coords: [number, number]; // [lat, lng]
  description: string;
  facilities: string[];
  aiReason: string;
}

interface RegencyCardInfo {
  name: string;
  tagline: string;
  image: string;
  highlight: string;
}

const REGENCY_CARDS: RegencyCardInfo[] = [
  {
    name: 'Kota Bandar Lampung',
    tagline: 'Pusat Kota, Kuliner & Wisata Modern',
    highlight: 'Puncak Mas, Bukit Sindy, Mall Boemi Kedaton, Lampung Walk',
    image: '/assets/images/regencies/bandar-lampung.jpg',
  },
  {
    name: 'Pesawaran',
    tagline: 'Surga Bahari & Island Hopping Tropis',
    highlight: 'Pulau Pahawang, Pantai Sari Ringgung, Pulau Kelagian, Mutun',
    image: '/assets/images/regencies/pesawaran.jpg',
  },
  {
    name: 'Lampung Selatan',
    tagline: 'Monumen Siger, Pantai Eksotis & Krakatau',
    highlight: 'Menara Siger, Pantai Marina Kalianda, Pantai Minang Rua, Grand Elty',
    image: '/assets/images/regencies/lampung-selatan.jpg',
  },
  {
    name: 'Pesisir Barat',
    tagline: 'Ombak Dolar Internasional & Surfing Krui',
    highlight: 'Labuhan Jukung Krui, Pantai Tanjung Setia, Pulau Pisang',
    image: '/assets/images/regencies/pesisir-barat.jpg',
  },
  {
    name: 'Tanggamus',
    tagline: 'Teluk Kiluan, Gigi Hiu & Keindahan Tropis',
    highlight: 'Pantai Gigi Hiu (Pegadungan), Lumba-lumba Teluk Kiluan',
    image: '/assets/images/regencies/tanggamus.jpg',
  },
  {
    name: 'Lampung Timur',
    tagline: 'Konservasi Gajah Sumatera & Way Kambas',
    highlight: 'Taman Nasional Way Kambas, Pusat Latihan Gajah',
    image: '/assets/images/regencies/lampung-timur.jpg',
  },
  {
    name: 'Lampung Barat',
    tagline: 'Negeri di Atas Awan & Kawah Suoh',
    highlight: 'Kawah Keramikan Suoh, Danau Ranau, Kebun Kopi Liwa',
    image: '/assets/images/regencies/lampung-barat.jpg',
  },
  {
    name: 'Way Kanan',
    tagline: 'Negeri Seribu Air Terjun & Arung Jeram',
    highlight: 'Air Terjun Putri Malu, Air Terjun Gangsa',
    image: '/assets/images/regencies/way-kanan.jpg',
  },
  {
    name: 'Kota Metro',
    tagline: 'Kota Taman, Wisata Edukasi & Kuliner',
    highlight: 'Taman Merdeka Kota Metro, Masjid Agung Taqwa',
    image: '/assets/images/regencies/metro.jpg',
  },
  {
    name: 'Pringsewu',
    tagline: 'Rest Area Bambu & Bukit Panorama',
    highlight: 'Bukit Bintang Pringsewu, Taman Bambu',
    image: '/assets/images/regencies/pringsewu.jpg',
  },
  {
    name: 'Tulang Bawang Barat',
    tagline: 'Arsitektur Ikonik & Islamic Center Tubaba',
    highlight: 'Masjid 99 Cahaya Islamic Center Tubaba, Rumah Adat',
    image: '/assets/images/regencies/tulang-bawang-barat.jpg',
  },
  {
    name: 'Lampung Utara',
    tagline: 'Tugu Payan Mas & Wisata Alam',
    highlight: 'Tugu Payan Mas Kotabumi, Air Terjun Curup Selendang',
    image: '/assets/images/regencies/lampung-utara.jpg',
  },
];

export const ExplorePage: React.FC = () => {
  const { user, isAuthenticated, openAuthModal, addXp } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchKeyword, setSearchKeyword] = useState<string>(searchParams.get('search') || '');
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua');
  const [selectedRegency, setSelectedRegency] = useState<string>('PILIH');
  const [sortBy, setSortBy] = useState<'popular' | 'rating' | 'price'>('popular');
  const [selectedDestination, setSelectedDestination] = useState<Destination | null>(null);
  const [hoveredDestinationId, setHoveredDestinationId] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [realDestinations, setRealDestinations] = useState<Destination[]>([]);
  const [isLoadingRealData, setIsLoadingRealData] = useState<boolean>(false);
  const [loadingProgress, setLoadingProgress] = useState<number>(0);

  // Reviews State
  const [reviewsData, setReviewsData] = useState<ReviewSummary | null>(null);
  const [isLoadingReviews, setIsLoadingReviews] = useState<boolean>(false);
  const [isWriteReviewModalOpen, setIsWriteReviewModalOpen] = useState<boolean>(false);
  const [reviewRating, setReviewRating] = useState<number>(5);
  const [reviewText, setReviewText] = useState<string>('');
  const [isSubmittingReview, setIsSubmittingReview] = useState<boolean>(false);

  useEffect(() => {
    if (selectedDestination) {
      setIsLoadingReviews(true);
      fetchDestinationReviews(selectedDestination.id).then((data) => {
        setReviewsData(data);
        setIsLoadingReviews(false);
      });
    }
  }, [selectedDestination]);

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      triggerToast('Silakan masuk terlebih dahulu untuk memberi ulasan!');
      openAuthModal('login');
      return;
    }

    if (!selectedDestination || !reviewText.trim()) return;

    setIsSubmittingReview(true);
    try {
      await createDestinationReview(selectedDestination.id, reviewRating, reviewText);
      await addXp(30, 'write_review');
      await logUserActivity(
        'WRITE_REVIEW',
        `Memberi ulasan ${reviewRating}★ untuk ${selectedDestination.name}`,
        '+30 XP',
        'star',
      );
      triggerToast('Ulasan berhasil dikirim! (+30 XP 🎉)');

      // Refresh reviews
      const updated = await fetchDestinationReviews(selectedDestination.id);
      setReviewsData(updated);

      setReviewText('');
      setIsWriteReviewModalOpen(false);
    } catch (err: any) {
      triggerToast('Gagal mengirim ulasan');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const mapRef = useRef<HTMLDivElement | null>(null);
  const leafletInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<{ [key: string]: L.Marker }>({});

  const regencies = [
    'PILIH',
    'Semua',
    'Kota Bandar Lampung',
    'Pesawaran',
    'Lampung Selatan',
    'Tanggamus',
    'Lampung Timur',
    'Way Kanan',
    'Pesisir Barat',
    'Lampung Barat',
    'Lampung Tengah',
    'Lampung Utara',
    'Kota Metro',
    'Pringsewu',
    'Tulang Bawang',
  ];

  // Sync search input and regency from URL params
  useEffect(() => {
    const regencyQuery = searchParams.get('regency') || searchParams.get('city_or_regency');
    const searchQuery = searchParams.get('search');
    if (regencyQuery !== null && regencyQuery.trim()) {
      setSelectedRegency(regencyQuery);
    }
    if (searchQuery !== null && searchQuery.trim()) {
      setSearchKeyword(searchQuery);
      if (!regencyQuery) {
        setSelectedRegency('Semua');
      }
    }
  }, [searchParams]);

  // Load user favorites from backend API when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      apiClient
        .get('/favorites')
        .then((res) => {
          if (res.data?.data) {
            setFavorites(res.data.data.map((fav: any) => fav.canonicalId));
          }
        })
        .catch(() => { });
    } else {
      setFavorites([]);
    }
  }, [isAuthenticated]);

  // Fetch Live Real Data from Backend / FastAPI / Public Data JSON
  useEffect(() => {
    if (selectedRegency === 'PILIH' && !searchKeyword) return;

    let isMounted = true;
    setIsLoadingRealData(true);
    setLoadingProgress(15);

    const progressInterval = setInterval(() => {
      setLoadingProgress((prev) => {
        if (prev >= 92) return Math.max(prev, 92);
        return Math.min(92, prev + Math.floor(Math.random() * 12) + 6);
      });
    }, 100);

    fetchRealDestinations({
      category: selectedCategory,
      city_or_regency: selectedRegency === 'PILIH' ? 'Semua' : selectedRegency,
      search: searchKeyword,
      limit: 100,
    }).then((data) => {
      if (isMounted) {
        clearInterval(progressInterval);
        setLoadingProgress(100);
        setTimeout(() => {
          if (isMounted) {
            setRealDestinations(data || []);
            setIsLoadingRealData(false);
          }
        }, 200);
      }
    });

    return () => {
      isMounted = false;
      clearInterval(progressInterval);
    };
  }, [selectedCategory, selectedRegency, searchKeyword]);

  // Sort Filtered Destinations logic (+25% ML Score Boost for user preferences)
  const filteredDestinations = [...realDestinations].sort((a, b) => {
    const userPrefs = user?.preferences || [];
    const aMatch = userPrefs.includes(a.category) ? 1.25 : 1.0;
    const bMatch = userPrefs.includes(b.category) ? 1.25 : 1.0;

    if (sortBy === 'rating') return (b.rating * bMatch) - (a.rating * aMatch);
    if (sortBy === 'price') return a.numericPrice - b.numericPrice;
    return (b.reviews * bMatch) - (a.reviews * aMatch);
  });

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapRef.current) {
      if (leafletInstanceRef.current) {
        leafletInstanceRef.current.remove();
        leafletInstanceRef.current = null;
      }
      return;
    }

    // Ensure Leaflet instance matches current DOM element
    if (leafletInstanceRef.current) {
      const container = leafletInstanceRef.current.getContainer();
      if (container !== mapRef.current) {
        leafletInstanceRef.current.remove();
        leafletInstanceRef.current = null;
      }
    }

    if (!leafletInstanceRef.current) {
      const map = L.map(mapRef.current, {
        center: [-5.35, 105.1], // Center of Lampung
        zoom: 9,
        zoomControl: false,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 18,
      }).addTo(map);

      L.control.zoom({ position: 'topright' }).addTo(map);
      leafletInstanceRef.current = map;
    }

    const map = leafletInstanceRef.current;

    // Multiple invalidateSize calls to ensure map tiles render properly after DOM layout transitions
    setTimeout(() => map.invalidateSize(), 50);
    setTimeout(() => map.invalidateSize(), 200);
    setTimeout(() => map.invalidateSize(), 500);

    // Clear existing markers
    Object.values(markersRef.current).forEach((marker) => marker.remove());
    markersRef.current = {};

    // Limit map pin markers to top 20 destinations to avoid map pin overlap clutter
    const mapDestinations = filteredDestinations.slice(0, 20);

    if (mapDestinations.length > 0) {
      const bounds = L.latLngBounds([]);

      mapDestinations.forEach((dest) => {
        if (dest.coords && Array.isArray(dest.coords) && dest.coords.length === 2 && !isNaN(dest.coords[0]) && !isNaN(dest.coords[1])) {
          bounds.extend(dest.coords);
          const isSelected = selectedDestination?.id === dest.id;
          const isHovered = hoveredDestinationId === dest.id;

          // Sleek Compact Custom Map Pin
          const customIcon = L.divIcon({
            className: 'custom-map-clean-pin',
            html: `
              <div style="
                display: inline-flex;
                align-items: center;
                gap: 5px;
                background: ${isSelected ? '#0D9488' : isHovered ? '#115E59' : '#FFFFFF'};
                color: ${isSelected || isHovered ? '#FFFFFF' : '#0F172A'};
                padding: 4px 10px;
                border-radius: 9999px;
                border: 2px solid ${isSelected ? '#F59E0B' : '#0D9488'};
                box-shadow: 0 4px 12px -2px rgba(15, 23, 42, 0.2);
                font-family: sans-serif;
                font-size: 11px;
                font-weight: 700;
                cursor: pointer;
                white-space: nowrap;
                transition: all 0.2s ease;
                transform: ${isSelected || isHovered ? 'scale(1.15) translateY(-2px)' : 'scale(1.0)'};
                z-index: ${isSelected ? '9999' : '100'};
              ">
                <span style="width: 7px; height: 7px; border-radius: 50%; background: #F59E0B; display: inline-block;"></span>
                <span>${dest.name.length > 22 ? dest.name.slice(0, 22) + '...' : dest.name}</span>
                <span style="
                  background: ${isSelected ? '#F59E0B' : '#0D9488'};
                  color: #FFFFFF;
                  font-size: 9px;
                  padding: 1px 5px;
                  border-radius: 999px;
                ">&#9733; ${dest.rating}</span>
              </div>
            `,
            iconSize: [120, 30],
            iconAnchor: [60, 15],
          });

          const marker = L.marker(dest.coords, { icon: customIcon }).addTo(map);

          marker.on('click', () => {
            setSelectedDestination(dest);
            map.panTo(dest.coords, { animate: true });
          });

          markersRef.current[dest.id] = marker;
        }
      });

      // Fit bounds with comfortable padding
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });
      }
    }
  }, [filteredDestinations, selectedDestination, hoveredDestinationId, selectedRegency]);

  // Handle Toast
  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const toggleFavorite = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();

    if (!isAuthenticated) {
      triggerToast('Silakan masuk terlebih dahulu untuk menyukai destinasi!');
      openAuthModal('login');
      return;
    }

    if (favorites.includes(id)) {
      const updated = favorites.filter((item) => item !== id);
      setFavorites(updated);
      triggerToast('Dihapus dari daftar favorit');
      try {
        await apiClient.delete(`/favorites/${id}`);
      } catch (err) {
        // Fallback
      }
    } else {
      const updated = [...favorites, id];
      setFavorites(updated);
      triggerToast('Ditambahkan ke daftar favorit! (+15 XP 🎉)');
      try {
        await apiClient.post('/favorites', { canonicalId: id });
        await addXp(15, 'save_favorite');
        const destName = filteredDestinations.find((d) => d.id === id)?.name || 'destinasi';
        await logUserActivity('SAVE_FAVORITE', `Menyimpan ${destName} ke wishlist`, '+15 XP', 'heart');
      } catch (err) {
        // Fallback
      }
    }
  };

  return (
    <div className="flex flex-col min-h-[100dvh] pt-24 pb-12">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#0F2937] text-white px-5 py-3 rounded-2xl shadow-2xl border border-siger-400/30 flex items-center gap-3 transition-all animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-[#2DD4BF]" />
          <span className="text-xs font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Mascot Loading Overlay (Matching Mockup Screenshot) */}
      {isLoadingRealData && (
        <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
          <div className="bg-white rounded-[32px] p-8 sm:p-10 max-w-md w-full shadow-[0_20px_60px_-15px_rgba(13,148,136,0.25)] border border-slate-100/80 relative flex flex-col items-center text-center space-y-5 overflow-hidden">

            {/* Mascot Container with Circular Aura & Sparkles */}
            <div className="relative w-44 h-44 flex items-center justify-center">
              {/* Circular Aura Layers */}
              <div className="absolute inset-2 rounded-full border border-teal-100 bg-gradient-to-b from-teal-50/80 to-teal-100/30 animate-pulse" />
              <div className="absolute inset-6 rounded-full border border-teal-200/60 bg-teal-50/40" />

              {/* Sparkle Stars around mascot */}
              <span className="absolute top-2 right-6 text-teal-400 text-lg animate-pulse">✦</span>
              <span className="absolute bottom-4 left-4 text-amber-400 text-base animate-ping" style={{ animationDuration: '3s' }}>✦</span>
              <span className="absolute top-8 left-6 text-teal-300 text-xs">✨</span>
              <span className="absolute bottom-8 right-6 text-teal-400 text-sm">✨</span>

              {/* Mascot Image */}
              <img
                src="/assets/images/mascot/muli-lampung-mascot.png"
                alt="Muli Lampung Mascot"
                className="w-36 h-36 object-contain relative z-10 filter drop-shadow-md transition-transform duration-300 hover:scale-105"
              />
              {/* Mascot Ground Shadow */}
              <div className="absolute bottom-1 w-20 h-2.5 rounded-full bg-teal-900/10 blur-sm" />
            </div>

            {/* Title with Animated Teal Dots */}
            <div className="space-y-2">
              <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 font-display flex items-center justify-center gap-1">
                <span>Memuat Destinasi {selectedRegency !== 'PILIH' ? selectedRegency : 'Wisata'}</span>
                <span className="inline-flex gap-1 ml-1 text-[#0D9488]">
                  <span className="animate-bounce font-bold" style={{ animationDelay: '0ms' }}>.</span>
                  <span className="animate-bounce font-bold" style={{ animationDelay: '150ms' }}>.</span>
                  <span className="animate-bounce font-bold" style={{ animationDelay: '300ms' }}>.</span>
                </span>
              </h3>
              <p className="text-xs text-slate-500 font-sans max-w-xs leading-relaxed mx-auto">
                Muli Lampung sedang menyiapkan tempat wisata terbaik & lokasi peta spasial untukmu.
              </p>
            </div>

            {/* Badge Pill */}
            <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-teal-50/90 border border-teal-200/80 text-[#0D9488] text-xs font-bold shadow-sm">
              <Compass className="w-4 h-4 animate-spin text-[#0D9488]" />
              <span>Menyusun Peta Spasial Lampung</span>
            </div>

            {/* Animated Progress Bar & Percentage */}
            <div className="w-full max-w-xs space-y-1.5 pt-1">
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 h-3 rounded-full bg-teal-50 border border-teal-100 overflow-hidden relative">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#0D9488] via-[#2DD4BF] to-[#0D9488] transition-all duration-300 shadow-sm"
                    style={{ width: `${loadingProgress}%` }}
                  />
                </div>
                <span className="text-xs font-extrabold text-[#0D9488] min-w-[32px] text-right font-mono">
                  {loadingProgress}%
                </span>
              </div>
            </div>

            {/* Footer Quote */}
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium pt-1">
              <MapPin className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span>Menjelajahi keindahan Lampung untukmu...</span>
            </div>

          </div>
        </div>
      )}

      {/* FULL-WIDTH CONTAINER (Extends beyond Navbar limits to edge of screen) */}
      <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10 space-y-6">

        {/* ================================================================
            EXPLORE BANNER "Mau Jelajah Wisata di Mana Hari Ini?" (Matching Reference Image)
            ================================================================ */}
        <section className="relative isolate min-h-[180px] overflow-hidden rounded-[28px] border border-[#EBE0C9] bg-[#FFFDF8] shadow-sm">
          {/* Left Tapis Gold Ornament (Pure Transparent PNG) */}
          <img
            src="/assets/images/banners/explore-banner-ornament.png"
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 hidden h-[88%] w-auto -translate-y-1/2 select-none sm:block"
          />

          {/* Right Topography Map (Centered behind Search Box & Button) */}
          <img
            src="/assets/images/banners/explore-banner-map.png"
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute right-[18%] top-1/2 hidden h-[95%] w-auto max-w-[480px] -translate-y-1/2 select-none object-contain opacity-60 lg:block z-0"
          />

          {/* Banner Content Container */}
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6 px-6 py-7 sm:pl-24 sm:pr-8 lg:pl-28 lg:pr-10">
            <div className="max-w-2xl space-y-2.5">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-teal-200/70 bg-[#E6F4F1] px-3.5 py-1 text-[#0F766E]">
                <Compass className="h-3.5 w-3.5 text-[#0F766E]" />
                <span className="font-sans text-[10px] font-extrabold uppercase tracking-wider sm:text-[11px]">
                  LANGKAH 1: PILIH KABUPATEN / KOTA
                </span>
              </div>

              <h2 className="font-display text-2xl font-extrabold leading-tight tracking-tight text-[#0F172A] sm:text-3xl lg:text-[2.1rem]">
                Mau Jelajah Wisata di Mana Hari Ini?
              </h2>

              <p className="max-w-xl font-sans text-xs leading-relaxed text-slate-600 sm:text-sm">
                Pilih wilayah di Provinsi Lampung di bawah ini untuk menampilkan daftar destinasi wisata resmi, lokasi presisi, dan peta interaktifnya.
              </p>
            </div>

            {/* Right Side Controls */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
              <div className="relative w-full sm:w-60">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  value={searchKeyword}
                  onChange={(e) => {
                    const value = e.target.value;
                    setSearchKeyword(value);
                    setSearchParams(value ? { search: value } : {});
                  }}
                  placeholder="Cari pantai, museum..."
                  aria-label="Cari destinasi wisata"
                  className="w-full rounded-2xl border border-slate-200 bg-white/90 py-2.5 pl-10 pr-9 font-sans text-xs text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-[#0D9488]"
                />

                {searchKeyword && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchKeyword('');
                      setSearchParams({});
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-700"
                    aria-label="Hapus pencarian"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  setSelectedRegency('Semua');
                  setSearchKeyword('');
                  setSearchParams({});
                }}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#0D9488] hover:bg-[#0F766E] px-5 py-3 font-sans text-xs font-extrabold text-white shadow-md shadow-[#0D9488]/20 transition-all shrink-0 active:scale-95"
              >
                <span>Lihat Semua Kabupaten (1.590+ Data)</span>
                <ArrowUpRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </section>

        {/* FASE 9: WEATHER & SEASON ALERT WIDGET */}
        <div className="w-full pt-1">
          <WeatherWidget />
        </div>

        {/* Filter Pills & Dropdown Row (ONLY SHOWN WHEN A REGENCY IS SELECTED OR SEARCHING) */}
        {(selectedRegency !== 'PILIH' || searchKeyword) && (
          <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-slate-200/60">
            {/* Category Filter Pills */}
            <div className="flex flex-wrap items-center gap-2">
              {[
                { label: 'Semua', icon: Sparkles },
                { label: 'Pantai', icon: Palmtree },
                { label: 'Alam', icon: Mountain },
                { label: 'Budaya', icon: Landmark },
                { label: 'Kuliner', icon: Utensils },
                { label: 'Adventure', icon: Footprints },
              ].map(({ label, icon: Icon }) => (
                <button
                  key={label}
                  onClick={() => setSelectedCategory(label)}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${selectedCategory === label
                    ? 'bg-[#0D9488] text-white shadow-md shadow-[#0D9488]/20'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                    }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{label}</span>
                </button>
              ))}
            </div>

            {/* Region Select & Sort Dropdowns */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                <MapPin className="w-3.5 h-3.5 text-[#0D9488]" />
                <span>Kabupaten/Kota:</span>
                <select
                  value={selectedRegency}
                  onChange={(e) => setSelectedRegency(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 text-xs text-slate-900 font-semibold focus:outline-none focus:border-[#0D9488]"
                >
                  {regencies.map((reg) => (
                    <option key={reg} value={reg}>
                      {reg}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                <SlidersHorizontal className="w-3.5 h-3.5 text-siger-500" />
                <span>Urutkan:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 text-xs text-slate-900 font-semibold focus:outline-none focus:border-[#0D9488]"
                >
                  <option value="popular">Populer</option>
                  <option value="rating">Rating Tertinggi</option>
                  <option value="price">Harga Termurah</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* REGENCY SELECTION GRID VIEW (WHEN USER HAS NOT SELECTED A REGENCY YET) */}
        {selectedRegency === 'PILIH' && !searchKeyword ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
              {REGENCY_CARDS.map((card) => (
                <div
                  key={card.name}
                  onClick={() => setSelectedRegency(card.name)}
                  className="group relative rounded-3xl overflow-hidden bg-slate-900 shadow-md hover:shadow-2xl transition-all duration-300 cursor-pointer border border-slate-200/50 aspect-[4/3] flex flex-col justify-between p-5"
                >
                  <img
                    src={card.image}
                    alt={card.name}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/assets/images/heroes/hero-pahawang-bg.png';
                    }}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/40 to-slate-950/20 group-hover:via-slate-950/60 transition-colors" />

                  <div className="relative z-10 flex items-center justify-between">
                    <span className="px-3 py-1 rounded-full text-[10px] font-extrabold bg-[#0D9488] text-white shadow-md">
                      Provinsi Lampung
                    </span>
                    <span className="w-8 h-8 rounded-full bg-white/20 text-white group-hover:bg-[#0D9488] flex items-center justify-center backdrop-blur-md transition-all group-hover:scale-110 text-xs">
                      →
                    </span>
                  </div>

                  <div className="relative z-10 space-y-1 text-white">
                    <h3 className="text-base font-extrabold font-display leading-tight group-hover:text-siger-400 transition-colors">
                      {card.name}
                    </h3>
                    <p className="text-[11px] text-siger-300 font-semibold">{card.tagline}</p>
                    <p className="text-[9px] text-slate-300 line-clamp-1">{card.highlight}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* CONTENT SPLIT VIEW GRID (DESTINATION LIST & INTERACTIVE MAP) */
          <div className="space-y-4">
            {/* Top Navigation Bar when inside a specific Regency */}
            <div className="flex items-center justify-between bg-slate-100/80 p-3 rounded-2xl border border-slate-200/70">
              <button
                onClick={() => setSelectedRegency('PILIH')}
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white text-slate-700 hover:bg-[#0D9488] hover:text-white border border-slate-300 text-xs font-bold transition-all shadow-sm"
              >
                <span>← Pilih Kabupaten Lain</span>
              </button>
              <div className="text-xs font-semibold text-slate-600">
                Wilayah Aktif: <span className="font-extrabold text-[#0D9488]">{selectedRegency}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

              {/* LEFT: DESTINATIONS CARDS LIST (7 Cols - 2 Cards Per Row) */}
              <div className="lg:col-span-7 space-y-4">
                <div className="flex items-center justify-between px-1">
                  <p className="text-xs text-slate-500 font-medium">
                    Menampilkan <span className="font-bold text-slate-900">{filteredDestinations.length}</span> destinasi di Lampung
                  </p>
                </div>

                {filteredDestinations.length === 0 ? (
                  <div className="glass-card-container rounded-3xl p-12 text-center space-y-3">
                    <Filter className="w-10 h-10 text-slate-300 mx-auto" />
                    <h3 className="text-base font-bold text-slate-800">Tidak ada destinasi ditemukan</h3>
                    <p className="text-xs text-slate-500">Coba atur ulang kata kunci pencarian atau filter kategori kamu.</p>
                    <button
                      onClick={() => {
                        setSearchKeyword('');
                        setSelectedCategory('Semua');
                        setSelectedRegency('Semua');
                        setSearchParams({});
                      }}
                      className="px-4 py-2 bg-[#0D9488] text-white text-xs font-bold rounded-full hover:bg-[#0F766E] transition-colors"
                    >
                      Reset Semua Filter
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {filteredDestinations.map((item) => (
                      <div
                        key={item.id}
                        onMouseEnter={() => setHoveredDestinationId(item.id)}
                        onMouseLeave={() => setHoveredDestinationId(null)}
                        onClick={() => {
                          setSelectedDestination(item);
                          if (leafletInstanceRef.current) {
                            leafletInstanceRef.current.panTo(item.coords, { animate: true });
                          }
                        }}
                        className={`group glass-card-container rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer border flex flex-col justify-between ${selectedDestination?.id === item.id || hoveredDestinationId === item.id
                          ? 'border-[#0D9488] ring-2 ring-[#0D9488]/20 bg-white'
                          : 'border-slate-200/80 hover:border-slate-300'
                          }`}
                      >
                        {/* Card Image Header */}
                        <div className="relative aspect-[16/10] overflow-hidden bg-slate-100">
                          <img
                            src={item.image}
                            alt={item.name}
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = '/assets/images/heroes/hero-pahawang-bg.png';
                            }}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent" />

                          {/* Top Category Badge & Heart button */}
                          <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-[#0D9488] text-white shadow-md">
                                {item.category}
                              </span>
                              {(user?.preferences || []).includes(item.category) && (
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-amber-500 text-white shadow-md flex items-center gap-0.5 animate-pulse">
                                  <Sparkles className="w-2.5 h-2.5" />
                                  <span>Sesuai Minatmu</span>
                                </span>
                              )}
                            </div>
                            <button
                              onClick={(e) => toggleFavorite(item.id, e)}
                              className={`w-7 h-7 rounded-full flex items-center justify-center backdrop-blur-md transition-colors ${favorites.includes(item.id)
                                ? 'bg-red-500 text-white'
                                : 'bg-slate-900/40 text-white hover:bg-slate-900/70'
                                }`}
                            >
                              <Heart className={`w-3.5 h-3.5 ${favorites.includes(item.id) ? 'fill-current' : ''}`} />
                            </button>
                          </div>

                          {/* Bottom Info on Image */}
                          <div className="absolute bottom-2.5 left-3 right-3 text-white flex items-center justify-between">
                            <div className="flex items-center gap-1 text-siger-400 font-bold text-xs">
                              <Star className="w-3.5 h-3.5 fill-current" />
                              <span>{item.rating}</span>
                              <span className="text-slate-300 text-[10px] font-normal">({item.reviews})</span>
                            </div>
                            <span className="text-[10px] bg-slate-900/60 px-2 py-0.5 rounded-md backdrop-blur-sm text-slate-200">
                              {item.regency}
                            </span>
                          </div>
                        </div>

                        {/* Card Content Body */}
                        <div className="p-4 space-y-2 flex-1 flex flex-col justify-between">
                          <div className="space-y-1">
                            <h3 className="text-sm font-bold font-display text-slate-900 group-hover:text-[#0D9488] transition-colors leading-snug">
                              {item.name}
                            </h3>
                            <p className="text-[11px] text-slate-500 font-sans flex items-center gap-1 line-clamp-1">
                              <MapPin className="w-3 h-3 text-[#0D9488] shrink-0" />
                              <span>{item.location}</span>
                            </p>
                          </div>

                          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                            <div>
                              <p className="text-[10px] text-slate-400">Estimasi Tiket</p>
                              <p className="text-xs font-extrabold text-[#0D9488]">{item.price}</p>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedDestination(item);
                              }}
                              className="px-3 py-1.5 rounded-xl bg-teal-50 hover:bg-[#0D9488] text-[#0D9488] hover:text-white text-[11px] font-bold transition-all flex items-center gap-1"
                            >
                              <span>Detail</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* RIGHT: INTERACTIVE SPATIAL MAP (5 Cols - Sticky Container) */}
              <div className="lg:col-span-5 sticky top-24">
                <div className="glass-card-container rounded-[28px] overflow-hidden shadow-lg border border-slate-200/80 flex flex-col h-[600px]">
                  {/* Map Header */}
                  <div className="px-5 py-3.5 bg-white border-b border-slate-200/80 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-siger-500 animate-pulse" />
                      <span className="text-xs font-bold text-slate-900">Map Spasial Interaktif Lampung</span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-medium bg-slate-100 px-2 py-0.5 rounded-md">
                      {filteredDestinations.length} Pin Aktif
                    </span>
                  </div>

                  {/* Leaflet Map Canvas */}
                  <div ref={mapRef} className="flex-1 w-full h-full z-10 bg-slate-100" />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* QUICK DETAIL DRAWER / MODAL */}
      {selectedDestination && (
        <div
          className="fixed inset-0 z-50 glass-modal-backdrop flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
          onClick={() => setSelectedDestination(null)}
        >
          <div
            className="bg-white w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl border border-slate-200 my-auto relative animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => setSelectedDestination(null)}
              className="absolute top-4 right-4 z-20 w-9 h-9 rounded-full bg-slate-900/60 hover:bg-slate-900 text-white flex items-center justify-center backdrop-blur-md transition-colors"
              aria-label="Tutup Detail"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Modal Image Header */}
            <div className="relative aspect-[16/9] w-full overflow-hidden bg-slate-900">
              <img
                src={selectedDestination.image}
                alt={selectedDestination.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent" />

              <div className="absolute bottom-4 left-6 right-6 text-white space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-0.5 rounded-full text-xs font-bold bg-[#0D9488]">
                    {selectedDestination.category}
                  </span>
                  <span className="text-xs bg-slate-900/60 px-2.5 py-0.5 rounded-full text-slate-200 border border-white/20">
                    {selectedDestination.regency}
                  </span>
                </div>
                <h2 className="text-2xl font-display font-extrabold">{selectedDestination.name}</h2>
                <p className="text-xs text-slate-300 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-[#2DD4BF]" />
                  <span>{selectedDestination.location}</span>
                </p>
              </div>
            </div>

            {/* Modal Body Info */}
            <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
              {/* Quick Info Grid */}
              <div className="grid grid-cols-3 gap-3 text-center bg-slate-50 rounded-2xl p-3 border border-slate-200/60">
                <div className="space-y-0.5">
                  <p className="text-[10px] text-slate-400 font-medium">Rating Pengguna</p>
                  <p className="text-xs font-bold text-slate-900 flex items-center justify-center gap-1 text-siger-500">
                    <Star className="w-3.5 h-3.5 fill-current" />
                    <span>{selectedDestination.rating} ({selectedDestination.reviews})</span>
                  </p>
                </div>
                <div className="space-y-0.5 border-x border-slate-200">
                  <p className="text-[10px] text-slate-400 font-medium">Jam Operasional</p>
                  <p className="text-xs font-bold text-slate-900 flex items-center justify-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-[#0D9488]" />
                    <span>{selectedDestination.hours}</span>
                  </p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-[10px] text-slate-400 font-medium">Estimasi Tiket</p>
                  <p className="text-xs font-extrabold text-[#0D9488]">{selectedDestination.price}</p>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Tentang Destinasi</h4>
                <p className="text-xs text-slate-600 leading-relaxed font-sans">{selectedDestination.description}</p>
              </div>

              {/* FASE 9: Season & Weather Advisory Banner */}
              <div className="bg-gradient-to-r from-teal-50/80 via-white to-amber-50/80 rounded-2xl p-3.5 border border-teal-200/80 space-y-1.5 shadow-2xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-extrabold text-[#0D9488] flex items-center gap-1.5">
                    <Compass className="w-4 h-4" />
                    Rekomendasi Musim & Cuaca AI:
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-[#0D9488] text-white">
                    Mei - Oktober (Cerah Ideal) ☀️
                  </span>
                </div>
                <p className="text-xs text-slate-700 font-sans leading-relaxed">
                  Visibilitas udara & cuaca laut di wilayah <strong>{selectedDestination.regency}</strong> sedang sangat baik untuk aktivitas outing, fotografi, dan jalan-jalan!
                </p>
              </div>

              {/* AI Recommendation Reason */}
              <div className="bg-teal-50/70 border border-teal-200/80 rounded-2xl p-4 space-y-1">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-siger-500" />
                  <h4 className="text-xs font-bold text-slate-900">Rekomendasi AI Raden Gajah</h4>
                </div>
                <p className="text-xs text-slate-700 font-sans leading-relaxed">{selectedDestination.aiReason}</p>
              </div>

              {/* Facilities List */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Fasilitas & Layanan</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedDestination.facilities.map((fac) => (
                    <span key={fac} className="px-3 py-1 rounded-xl bg-slate-100 text-slate-700 text-xs font-medium flex items-center gap-1.5">
                      <Tag className="w-3 h-3 text-[#0D9488]" />
                      <span>{fac}</span>
                    </span>
                  ))}
                </div>
              </div>

              {/* Ulasan & Rating Section */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Ulasan & Rating Penjelajah</h4>
                    <p className="text-[10px] text-slate-500 font-sans">Didukung AI IndoBERT Sentiment Inferencing</p>
                  </div>
                  <button
                    onClick={() => setIsWriteReviewModalOpen(true)}
                    className="px-3.5 py-1.5 rounded-full bg-[#0D9488] hover:bg-[#0F766E] text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1.5"
                  >
                    <Star className="w-3.5 h-3.5 fill-current text-amber-300" />
                    <span>+ Tulis Ulasan (+30 XP)</span>
                  </button>
                </div>

                {/* Reviews List */}
                <div className="space-y-2.5">
                  {isLoadingReviews ? (
                    <div className="p-4 text-center text-xs text-slate-400">Memuat ulasan penjelajah...</div>
                  ) : reviewsData && reviewsData.reviews.length > 0 ? (
                    reviewsData.reviews.map((rev) => (
                      <div key={rev.id} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-teal-100 text-[#0D9488] font-bold text-[10px] flex items-center justify-center">
                              {rev.user?.fullName?.charAt(0) || 'U'}
                            </div>
                            <span className="text-xs font-bold text-slate-900">{rev.user?.fullName || 'Penjelajah Kelana'}</span>
                          </div>

                          {/* Sentiment Badge */}
                          <span
                            className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold ${
                              rev.sentimentLabel === 'POSITIVE'
                                ? 'bg-emerald-100 text-emerald-800'
                                : rev.sentimentLabel === 'NEGATIVE'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-slate-200 text-slate-700'
                            }`}
                          >
                            {rev.sentimentLabel === 'POSITIVE' ? 'Sentimen Positif ✨' : rev.sentimentLabel === 'NEGATIVE' ? 'Perlu Perbaikan ⚠️' : 'Sentimen Netral 💬'}
                          </span>
                        </div>

                        <div className="flex items-center gap-1 text-amber-400">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`w-3 h-3 ${star <= rev.rating ? 'fill-current text-amber-400' : 'text-slate-300'}`}
                            />
                          ))}
                          <span className="text-[10px] text-slate-400 font-sans ml-1">
                            {new Date(rev.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                          </span>
                        </div>

                        <p className="text-xs text-slate-700 font-sans leading-relaxed">{rev.reviewText}</p>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/60 text-center space-y-1">
                      <p className="text-xs font-semibold text-slate-700">Belum ada ulasan untuk destinasi ini</p>
                      <p className="text-[10px] text-slate-500">Jadilah penjelajah pertama yang memberi ulasan dan dapatkan +30 XP!</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-4 bg-slate-50 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-3">
              <button
                onClick={(e) => toggleFavorite(selectedDestination.id, e)}
                className={`px-4 py-2.5 rounded-full text-xs font-bold flex items-center gap-2 transition-all ${favorites.includes(selectedDestination.id)
                  ? 'bg-red-500 text-white'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
              >
                <Heart className={`w-3.5 h-3.5 ${favorites.includes(selectedDestination.id) ? 'fill-current' : ''}`} />
                <span>{favorites.includes(selectedDestination.id) ? 'Tersimpan' : 'Simpan Favorit'}</span>
              </button>

              <a
                href={`https://www.google.com/maps/search/?api=1&query=${selectedDestination.coords[0]},${selectedDestination.coords[1]}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-5 py-2.5 rounded-full bg-[#0D9488] hover:bg-[#0F766E] text-white text-xs font-bold shadow-md shadow-[#0D9488]/20 flex items-center gap-2 transition-all"
              >
                <span>Buka di Google Maps</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      )}
      {/* WRITE REVIEW MODAL */}
      {isWriteReviewModalOpen && selectedDestination && (
        <div
          className="fixed inset-0 z-50 glass-modal-backdrop flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setIsWriteReviewModalOpen(false)}
        >
          <div
            className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 my-auto relative animate-in fade-in zoom-in-95 duration-200 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-extrabold font-display text-slate-900">Beri Ulasan Destinasi</h3>
                <p className="text-xs text-slate-500 font-sans">{selectedDestination.name}</p>
              </div>
              <button
                onClick={() => setIsWriteReviewModalOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleReviewSubmit} className="space-y-4">
              {/* Star Rating Select */}
              <div className="space-y-1.5 text-center">
                <label className="text-xs font-bold text-slate-700">Pilih Rating Bintang</label>
                <div className="flex items-center justify-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReviewRating(star)}
                      className="p-1.5 transition-transform hover:scale-125 focus:outline-none"
                    >
                      <Star
                        className={`w-7 h-7 ${star <= reviewRating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Review Text */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Pengalaman Kunjungan Kamu</label>
                <textarea
                  rows={4}
                  required
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  placeholder="Ceritakan pengalaman unik, kebersihan, akses jalan, atau kuliner favoritmu di destinasi ini..."
                  className="w-full rounded-2xl border border-slate-200 p-3 text-xs text-slate-800 placeholder-slate-400 focus:border-[#0D9488] focus:ring-2 focus:ring-[#0D9488]/20 outline-none transition-all resize-none font-sans"
                />
              </div>

              <div className="bg-amber-50 rounded-xl p-3 border border-amber-200/60 flex items-center gap-2 text-[11px] text-amber-800 font-medium">
                <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Kirim ulasan untuk mendapatkan +30 XP & analisis sentimen AI!</span>
              </div>

              {/* Submit Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsWriteReviewModalOpen(false)}
                  className="px-4 py-2 rounded-full border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-all"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReview || !reviewText.trim()}
                  className="px-5 py-2 rounded-full bg-[#0D9488] hover:bg-[#0F766E] text-white text-xs font-bold shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSubmittingReview ? (
                    <span>Mengirim...</span>
                  ) : (
                    <>
                      <span>Kirim Ulasan (+30 XP)</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};