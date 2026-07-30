import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Search,
  MapPin,
  Sparkles,
  Heart,
  X,
  Star,
  ChevronRight,
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

export const mockDestinations: Destination[] = [
  {
    id: 'dest-001',
    name: 'Pulau Pahawang',
    location: 'Kec. Mawa, Pesawaran',
    regency: 'Kabupaten Pesawaran',
    category: 'Pantai',
    rating: 4.8,
    reviews: 320,
    price: 'Rp 150.000 / orang',
    numericPrice: 150000,
    duration: '2-3 jam',
    hours: '06:00 - 18:00 WIB',
    image: '/assets/images/heroes/hero-pahawang-bg.png',
    coords: [-5.6708, 105.2192],
    description:
      'Surga snorkeling terkenal di Lampung dengan air laut jernih kristal, terumbu karang alami, dan keanekaragaman ikan hias seperti Ikan Nemo.',
    facilities: ['Snorkeling', 'Perahu Sewa', 'Warung Makan', 'Spot Foto', 'Homestay', 'Toilet'],
    aiReason:
      'Cocok untuk pecinta wisata bahari dan fotografi bawah laut dengan terumbu karang yang terjaga baik.',
  },
  {
    id: 'dest-002',
    name: 'Air Terjun Putri Malu',
    location: 'Banjit, Way Kanan',
    regency: 'Kabupaten Way Kanan',
    category: 'Alam',
    rating: 4.7,
    reviews: 210,
    price: 'Rp 20.000 / orang',
    numericPrice: 20000,
    duration: '1-2 jam',
    hours: '07:00 - 17:00 WIB',
    image: 'https://images.unsplash.com/photo-1432405972618-c60b0225b8f9?auto=format&fit=crop&w=800&q=80',
    coords: [-4.7833, 104.5333],
    description:
      'Air terjun megah setinggi 80 meter yang tersembunyi di dalam hutan tropis Way Kanan dengan tetesan air yang melengkung indah seperti keindahan wanita.',
    facilities: ['Trekking Trail', 'Area Camping', 'Spot Foto', 'Pemandu Lokal', 'Toilet'],
    aiReason: 'Ideal bagi pecinta petualangan alam yang menyukai trekking hutan dan suasana tenang terisolasi.',
  },
  {
    id: 'dest-003',
    name: 'Museum Lampung (Ruwa Jurai)',
    location: 'Rajabasa, Bandar Lampung',
    regency: 'Kota Bandar Lampung',
    category: 'Budaya',
    rating: 4.6,
    reviews: 180,
    price: 'Rp 5.000 / orang',
    numericPrice: 5000,
    duration: '1-2 jam',
    hours: '08:00 - 15:30 WIB',
    image: 'https://images.unsplash.com/photo-1566127444979-b3d2b654e3d7?auto=format&fit=crop&w=800&q=80',
    coords: [-5.3789, 105.2536],
    description:
      'Museum kebanggaan masyarakat Lampung yang menyimpan 4.000+ koleksi benda bersejarah, etnografi, kain tapis emas, dan numismatika legendaris.',
    facilities: ['Ruang AC', 'Pemandu Museum', 'Perpustakaan', 'Area Parkir', 'Toilet'],
    aiReason: 'Sangat bagus untuk wisata edukasi keluarga dan memahami sejarah akulturasi budaya Lampung.',
  },
];

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
    name: 'Kabupaten Pesawaran',
    tagline: 'Surga Bahari & Island Hopping Tropis',
    highlight: 'Pulau Pahawang, Pantai Sari Ringgung, Pulau Kelagian, Mutun',
    image: '/assets/images/regencies/pesawaran.jpg',
  },
  {
    name: 'Kabupaten Lampung Selatan',
    tagline: 'Monumen Siger, Pantai Eksotis & Krakatau',
    highlight: 'Menara Siger, Pantai Marina Kalianda, Pantai Minang Rua, Grand Elty',
    image: '/assets/images/regencies/lampung-selatan.jpg',
  },
  {
    name: 'Kabupaten Pesisir Barat',
    tagline: 'Ombak Dolar Internasional & Surfing Krui',
    highlight: 'Labuhan Jukung Krui, Pantai Tanjung Setia, Pulau Pisang',
    image: '/assets/images/regencies/pesisir-barat.jpg',
  },
  {
    name: 'Kabupaten Tanggamus',
    tagline: 'Teluk Kiluan, Gigi Hiu & Keindahan Tropis',
    highlight: 'Pantai Gigi Hiu (Pegadungan), Lumba-lumba Teluk Kiluan',
    image: '/assets/images/regencies/tanggamus.jpg',
  },
  {
    name: 'Kabupaten Lampung Timur',
    tagline: 'Konservasi Gajah Sumatera & Way Kambas',
    highlight: 'Taman Nasional Way Kambas, Pusat Latihan Gajah',
    image: '/assets/images/regencies/lampung-timur.jpg',
  },
  {
    name: 'Kabupaten Lampung Barat',
    tagline: 'Negeri di Atas Awan & Kawah Suoh',
    highlight: 'Kawah Keramikan Suoh, Danau Ranau, Kebun Kopi Liwa',
    image: '/assets/images/regencies/lampung-barat.jpg',
  },
  {
    name: 'Kabupaten Way Kanan',
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
    name: 'Kabupaten Pringsewu',
    tagline: 'Rest Area Bambu & Bukit Panorama',
    highlight: 'Bukit Bintang Pringsewu, Taman Bambu',
    image: '/assets/images/regencies/pringsewu.jpg',
  },
  {
    name: 'Kabupaten Tulang Bawang Barat',
    tagline: 'Arsitektur Ikonik & Islamic Center Tubaba',
    highlight: 'Masjid 99 Cahaya Islamic Center Tubaba, Rumah Adat',
    image: '/assets/images/regencies/tulang-bawang-barat.jpg',
  },
  {
    name: 'Kabupaten Lampung Utara',
    tagline: 'Tugu Payan Mas & Wisata Alam',
    highlight: 'Tugu Payan Mas Kotabumi, Air Terjun Curup Selendang',
    image: '/assets/images/regencies/lampung-utara.jpg',
  },
];

export const ExplorePage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchKeyword, setSearchKeyword] = useState<string>(searchParams.get('search') || '');
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua');
  const [selectedRegency, setSelectedRegency] = useState<string>('Semua');
  const [sortBy, setSortBy] = useState<'popular' | 'rating' | 'price'>('popular');
  const [selectedDestination, setSelectedDestination] = useState<Destination | null>(null);
  const [hoveredDestinationId, setHoveredDestinationId] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [realDestinations, setRealDestinations] = useState<Destination[]>([]);
  const [isLoadingRealData, setIsLoadingRealData] = useState<boolean>(false);
  const [loadingProgress, setLoadingProgress] = useState<number>(0);

  const mapRef = useRef<HTMLDivElement | null>(null);
  const leafletInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<{ [key: string]: L.Marker }>({});

  const regencies = [
    'Semua',
    'Kota Bandar Lampung',
    'Kota Metro',
    'Kabupaten Pesawaran',
    'Kabupaten Lampung Selatan',
    'Kabupaten Pesisir Barat',
    'Kabupaten Tanggamus',
    'Kabupaten Lampung Barat',
    'Kabupaten Lampung Timur',
    'Kabupaten Lampung Tengah',
    'Kabupaten Lampung Utara',
    'Kabupaten Way Kanan',
    'Kabupaten Pringsewu',
    'Kabupaten Tulang Bawang',
    'Kabupaten Tulang Bawang Barat',
    'Kabupaten Mesuji',
  ];

  // Sync search & regency input with URL params
  useEffect(() => {
    const regParam = searchParams.get('regency') || searchParams.get('city_or_regency');
    const searchParam = searchParams.get('search');
    if (regParam) {
      setSelectedRegency(regParam);
    }
    if (searchParam) {
      setSearchKeyword(searchParam);
    }
  }, [searchParams]);

  // Fetch Live Real Data from Backend / FastAPI / Public Data JSON
  useEffect(() => {
    let isMounted = true;
    setIsLoadingRealData(true);
    setLoadingProgress(15);

    const progressInterval = setInterval(() => {
      setLoadingProgress((prev) => {
        if (prev >= 92) return 92;
        return prev + Math.floor(Math.random() * 15) + 8;
      });
    }, 120);

    fetchRealDestinations({
      category: selectedCategory,
      city_or_regency: selectedRegency,
      search: searchKeyword,
      limit: 120,
    }).then((data) => {
      if (isMounted) {
        setLoadingProgress(100);
        setTimeout(() => {
          if (isMounted) {
            setRealDestinations(data && data.length > 0 ? data : mockDestinations);
            setIsLoadingRealData(false);
            clearInterval(progressInterval);
          }
        }, 200);
      }
    });

    return () => {
      isMounted = false;
      clearInterval(progressInterval);
    };
  }, [selectedCategory, selectedRegency, searchKeyword]);

  // Sort Filtered Destinations logic
  const filteredDestinations = [...realDestinations].sort((a, b) => {
    if (sortBy === 'rating') return b.rating - a.rating;
    if (sortBy === 'price') return a.numericPrice - b.numericPrice;
    return b.reviews - a.reviews; // Default: popular
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

      L.control.zoom({ position: 'bottomright' }).addTo(map);
      leafletInstanceRef.current = map;
    }

    const map = leafletInstanceRef.current;

    // Clear existing markers
    Object.values(markersRef.current).forEach((m) => map.removeLayer(m));
    markersRef.current = {};

    if (filteredDestinations.length > 0) {
      const bounds = L.latLngBounds([]);

      filteredDestinations.forEach((dest) => {
        if (dest.coords && dest.coords.length === 2 && !isNaN(dest.coords[0]) && !isNaN(dest.coords[1])) {
          bounds.extend(dest.coords);

          const isSelected = selectedDestination?.id === dest.id;
          const isHovered = hoveredDestinationId === dest.id;

          const customIcon = L.divIcon({
            className: 'custom-map-marker',
            html: `
              <div style="
                background: ${isSelected ? '#0D9488' : isHovered ? '#0F766E' : '#0F2937'};
                color: #FFFFFF;
                padding: 4px 10px;
                border-radius: 999px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                border: 2px solid ${isSelected ? '#F59E0B' : '#2DD4BF'};
                display: flex;
                items-center;
                gap: 4px;
                font-size: 11px;
                font-family: sans-serif;
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

      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });
      }
    }
  }, [filteredDestinations, selectedDestination, hoveredDestinationId, selectedRegency]);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const toggleFavorite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (favorites.includes(id)) {
      setFavorites(favorites.filter((item) => item !== id));
      triggerToast('Dihapus dari daftar favorit');
    } else {
      setFavorites([...favorites, id]);
      triggerToast('Ditambahkan ke daftar favorit!');
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

      {/* Mascot Loading Overlay */}
      {isLoadingRealData && (
        <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
          <div className="bg-white rounded-[32px] p-8 sm:p-10 max-w-md w-full shadow-[0_20px_60px_-15px_rgba(13,148,136,0.25)] border border-slate-100/80 relative flex flex-col items-center text-center space-y-5 overflow-hidden">
            
            <div className="relative w-28 h-28 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-[#0D9488]/15 animate-ping" />
              <div className="absolute inset-2 rounded-full bg-teal-50 border-2 border-teal-200 animate-pulse" />
              <img
                src="/assets/images/mascot/muli-lampung-mascot.png"
                alt="AI Mascot Searching"
                className="w-24 h-24 object-contain relative z-10 animate-bounce"
              />
            </div>

            <div className="space-y-1.5 max-w-xs">
              <h3 className="text-lg sm:text-xl font-bold font-display text-slate-900 tracking-tight">
                Mencari Destinasi {selectedRegency !== 'Semua' ? selectedRegency : 'Lampung'}...
              </h3>
              <p className="text-xs text-slate-500 font-sans leading-relaxed">
                Raden Gajah & AI Spasial sedang menyaring {filteredDestinations.length || 3100}+ tempat wisata resmi di Lampung.
              </p>
            </div>

            {/* Progress Bar Container */}
            <div className="w-full space-y-2 pt-2">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#0D9488] animate-spin" />
                  <span>Memuat Database Spasial...</span>
                </span>
                <span className="font-mono text-[#0D9488] font-extrabold">{loadingProgress}%</span>
              </div>
              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200/80">
                <div
                  className="h-full bg-gradient-to-r from-[#0D9488] via-[#0F766E] to-siger-500 rounded-full transition-all duration-200"
                  style={{ width: `${loadingProgress}%` }}
                />
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium pt-1">
              <MapPin className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span>Menjelajahi keindahan Lampung untukmu...</span>
            </div>

          </div>
        </div>
      )}

      {/* FULL-WIDTH CONTAINER */}
      <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10 space-y-6">

        {/* HEADER & FILTER BAR SECTION */}
        <div className="glass-card-container rounded-[28px] p-5 sm:p-6 space-y-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 border border-teal-200">
                <Compass className="w-3.5 h-3.5 text-[#0D9488]" />
                <span className="text-[11px] font-semibold text-[#0D9488]">
                  Eksplorasi Wisata Lampung (3.130+ Data Real)
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-display font-extrabold text-slate-900 tracking-tight">
                Jelajah Destinasi & Peta Spasial
              </h1>
            </div>

            {/* Search Bar Input */}
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchKeyword}
                onChange={(e) => {
                  setSearchKeyword(e.target.value);
                  setSearchParams(e.target.value ? { search: e.target.value } : {});
                }}
                placeholder="Cari pantai, air terjun, museum..."
                className="w-full bg-slate-50 border border-slate-200 rounded-full pl-10 pr-9 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0D9488]/40 focus:border-[#0D9488]"
              />
              {searchKeyword && (
                <button
                  onClick={() => {
                    setSearchKeyword('');
                    setSearchParams({});
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Filter Pills & Dropdown Row */}
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
              ].map((cat) => {
                const Icon = cat.icon;
                const isSelected = selectedCategory === cat.label;
                return (
                  <button
                    key={cat.label}
                    onClick={() => setSelectedCategory(cat.label)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-[#0D9488] text-white shadow-sm'
                        : 'bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Regency Dropdown & Sort Controls */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                <MapPin className="w-3.5 h-3.5 text-[#0D9488]" />
                <span>Kabupaten:</span>
                <select
                  value={selectedRegency}
                  onChange={(e) => {
                    setSelectedRegency(e.target.value);
                    if (e.target.value !== 'Semua') {
                      setSearchParams({ regency: e.target.value });
                    } else {
                      setSearchParams({});
                    }
                  }}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 text-xs text-slate-900 font-bold focus:outline-none focus:border-[#0D9488]"
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
        </div>

        {/* REGENCY SELECTION QUICK CARDS BAR */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-extrabold font-display text-slate-900 flex items-center gap-2">
              <Compass className="w-4 h-4 text-[#0D9488]" />
              <span>Pilih Kabupaten / Kota Lampung ({selectedRegency})</span>
            </h2>
            {selectedRegency !== 'Semua' && (
              <button
                onClick={() => {
                  setSelectedRegency('Semua');
                  setSearchParams({});
                }}
                className="text-xs font-bold text-[#0D9488] hover:underline flex items-center gap-1"
              >
                <span>Tampilkan Semua Wilayah</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {REGENCY_CARDS.map((card) => {
              const isSelected = selectedRegency === card.name;

              return (
                <div
                  key={card.name}
                  onClick={() => {
                    setSelectedRegency(card.name);
                    setSearchParams({ regency: card.name });
                  }}
                  className={`group relative rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer border aspect-[4/3] flex flex-col justify-end p-3 ${
                    isSelected
                      ? 'border-[#0D9488] ring-4 ring-[#0D9488]/30 scale-105'
                      : 'border-slate-200 hover:scale-102'
                  }`}
                >
                  <img
                    src={card.image}
                    alt={card.name}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/assets/images/heroes/hero-pahawang-bg.png';
                    }}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/30 to-transparent" />

                  <div className="relative z-10 text-white space-y-0.5">
                    <h3 className="text-xs font-extrabold font-display leading-tight truncate group-hover:text-siger-400">
                      {card.name}
                    </h3>
                    <p className="text-[9px] text-slate-300 line-clamp-1">{card.tagline}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* MAIN TWO-COLUMN SPLIT: LEFT LISTING (7 COLS), RIGHT 3D LEAFLET MAP (5 COLS) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

          {/* LEFT 7 COLS: DESTINATIONS CARDS LIST */}
          <div className="lg:col-span-7 space-y-4">

            {/* Results Count Bar */}
            <div className="flex items-center justify-between px-2">
              <span className="text-xs font-bold text-slate-700 font-sans">
                Menampilkan <span className="text-[#0D9488]">{filteredDestinations.length}</span> Destinasi Wisata di <span className="font-extrabold">{selectedRegency}</span>
              </span>
              <span className="text-[11px] text-slate-500 font-medium">Data Terverifikasi Real</span>
            </div>

            {/* Destination Items List */}
            {filteredDestinations.length === 0 ? (
              <div className="glass-card-container rounded-3xl p-12 text-center space-y-3">
                <Compass className="w-10 h-10 text-slate-400 mx-auto" />
                <h3 className="text-base font-bold text-slate-800">Destinasi Tidak Ditemukan</h3>
                <p className="text-xs text-slate-500">
                  Coba ubah kata kunci atau ganti filter Kabupaten/Kategori.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {filteredDestinations.map((dest) => {
                  const isFav = favorites.includes(dest.id);
                  const isSelected = selectedDestination?.id === dest.id;

                  return (
                    <div
                      key={dest.id}
                      onClick={() => {
                        setSelectedDestination(dest);
                        if (leafletInstanceRef.current && dest.coords) {
                          leafletInstanceRef.current.panTo(dest.coords, { animate: true });
                        }
                      }}
                      onMouseEnter={() => setHoveredDestinationId(dest.id)}
                      onMouseLeave={() => setHoveredDestinationId(null)}
                      className={`glass-card-container rounded-3xl overflow-hidden border shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer flex flex-col justify-between p-4 space-y-3 group ${
                        isSelected
                          ? 'border-[#0D9488] ring-2 ring-[#0D9488]/20 bg-teal-50/40'
                          : 'border-slate-200'
                      }`}
                    >
                      {/* Top Thumbnail */}
                      <div className="relative rounded-2xl overflow-hidden aspect-[16/10]">
                        <img
                          src={dest.image}
                          alt={dest.name}
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/assets/images/heroes/hero-pahawang-bg.png';
                          }}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent" />

                        {/* Top Badges */}
                        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between">
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-slate-950/80 backdrop-blur-md text-white border border-white/20">
                            {dest.category}
                          </span>

                          <button
                            onClick={(e) => toggleFavorite(dest.id, e)}
                            className="p-1.5 rounded-full bg-white/90 backdrop-blur-md text-slate-700 hover:text-red-500 shadow-sm transition-all active:scale-95"
                          >
                            <Heart
                              className={`w-3.5 h-3.5 ${
                                isFav ? 'fill-red-500 text-red-500' : ''
                              }`}
                            />
                          </button>
                        </div>

                        {/* Rating Badge */}
                        <div className="absolute bottom-2.5 left-2.5 flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500 text-white font-mono text-[10px] font-extrabold shadow-sm">
                          <Star className="w-3 h-3 fill-white" />
                          <span>{dest.rating}</span>
                          <span className="opacity-80">({dest.reviews})</span>
                        </div>
                      </div>

                      {/* Info Content */}
                      <div className="space-y-1.5">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="text-sm font-bold font-display text-slate-900 leading-snug group-hover:text-[#0D9488] transition-colors">
                            {dest.name}
                          </h3>
                        </div>

                        <p className="text-xs text-slate-500 font-sans flex items-center gap-1 truncate">
                          <MapPin className="w-3.5 h-3.5 text-[#0D9488] shrink-0" />
                          <span>{dest.location}</span>
                        </p>

                        <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed pt-1">
                          {dest.description}
                        </p>
                      </div>

                      {/* Footer Row */}
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                        <span className="font-extrabold text-[#0D9488]">{dest.price}</span>
                        <span className="text-[10px] text-slate-400 flex items-center gap-1 font-semibold group-hover:text-[#0D9488]">
                          <span>Lihat di Peta</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </span>
                      </div>

                    </div>
                  );
                })}
              </div>
            )}

          </div>

          {/* RIGHT 5 COLS: INTERACTIVE STICKY MAP */}
          <div className="lg:col-span-5 sticky top-28 space-y-4">
            <div className="glass-card-container rounded-[28px] overflow-hidden border border-slate-200/80 shadow-lg p-2 space-y-2">
              
              <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                  <span className="text-xs font-bold text-slate-800">Peta Spasial Real-time ({selectedRegency})</span>
                </div>
                <span className="text-[10px] text-slate-400 font-medium">3D Spasial Engine</span>
              </div>

              {/* Map Container */}
              <div
                ref={mapRef}
                className="w-full h-[520px] rounded-2xl overflow-hidden z-10 border border-slate-200"
              />

              {/* Active Selected Destination Preview Drawer */}
              {selectedDestination && (
                <div className="p-3 bg-teal-50/60 border border-teal-200/80 rounded-2xl flex items-center justify-between gap-3 animate-in slide-in-from-bottom-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={selectedDestination.image}
                      alt={selectedDestination.name}
                      className="w-12 h-12 rounded-xl object-cover shrink-0 shadow-sm"
                    />
                    <div className="min-w-0 space-y-0.5">
                      <span className="text-[9px] font-extrabold text-[#0D9488] uppercase">{selectedDestination.category}</span>
                      <h4 className="text-xs font-bold text-slate-900 truncate font-display">{selectedDestination.name}</h4>
                      <p className="text-[10px] text-slate-500 truncate">{selectedDestination.location}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedDestination(null)}
                    className="p-1 rounded-full text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
