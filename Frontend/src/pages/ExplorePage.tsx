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
  ExternalLink,
  Palmtree,
  Mountain,
  Landmark,
  Utensils,
  Footprints,
  SlidersHorizontal,
  Compass,
  CheckCircle2,
  Map as MapIcon,
  LayoutGrid,
} from 'lucide-react';
import L from 'leaflet';

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
    regency: 'Pesawaran',
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
    regency: 'Way Kanan',
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
    regency: 'Bandar Lampung',
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
      'Pusat edukasi dan pelestarian warisan kebudayaan suku Lampung, menyajikan artefak bersejarah, kain tapis kuno, pakaian adat, dan miniatur rumah panggung tradisional.',
    facilities: ['Ruang Pameran Ber-AC', 'Mushola', 'Area Parkir Luas', 'Toko Souvenir', 'Toilet'],
    aiReason: 'Sangat direkomendasikan untuk keluarga dan pelajar yang ingin memahami sejarah kain tapis serta kebudayaan asli Lampung.',
  },
  {
    id: 'dest-004',
    name: 'Kuliner Seruit Khas Lampung',
    location: 'Pusat Kota Bandar Lampung',
    regency: 'Bandar Lampung',
    category: 'Kuliner',
    rating: 4.9,
    reviews: 290,
    price: 'Rp 35.000 / porsi',
    numericPrice: 35000,
    duration: '1 jam',
    hours: '10:00 - 22:00 WIB',
    image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80',
    coords: [-5.4292, 105.2611],
    description:
      'Hidangan tradisional khas suku Lampung berupa ikan bakar yang diaduk bersama sambal terasi, tempoyak (durian fermentasi), dan lalapan segar.',
    facilities: ['Area Lesehan', 'Parkir Luas', 'WiFi Gratis', 'Ruang Ber-AC'],
    aiReason: 'Kuliner wajib coba bagi peminat eksplorasi cita rasa kuliner tradisional nusantara yang otentik.',
  },
  {
    id: 'dest-005',
    name: 'Gunung Anak Krakatau',
    location: 'Selat Sunda, Lampung Selatan',
    regency: 'Lampung Selatan',
    category: 'Adventure',
    rating: 4.8,
    reviews: 150,
    price: 'Rp 350.000 / orang',
    numericPrice: 350000,
    duration: '3-4 jam',
    hours: '05:00 - 17:00 WIB',
    image: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80',
    coords: [-6.1021, 105.4230],
    description:
      'Eksplorasi gunung berapi legendaris di tengah laut Selat Sunda dengan pemandangan lanskap vulkanik eksotis dan pasir hitam khas.',
    facilities: ['Speedboat', 'Pemandu Profesional', 'Pelampung Keselamatan', 'Izin Simaksi'],
    aiReason: 'Pengalaman sekali seumur hidup bagi petualang yang ingin menyaksikan aktivitas geologi vulkanik dunia.',
  },
  {
    id: 'dest-006',
    name: 'Pantai Gigi Hiu (Pegadungan)',
    location: 'Kelumbayan, Tanggamus',
    regency: 'Tanggamus',
    category: 'Pantai',
    rating: 4.9,
    reviews: 240,
    price: 'Rp 20.000 / orang',
    numericPrice: 20000,
    duration: '2 jam',
    hours: '24 Jam',
    image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80',
    coords: [-5.7531, 105.0215],
    description:
      'Gugusan karang tajam menjulang menyerupai gigi hiu raksasa yang dihantam ombak Samudra Hindia, menjadi lokasi favorit para fotografer profesional.',
    facilities: ['Spot Fotografi', 'Gazebo Istirahat', 'Warung Kopi', 'Area Parkir'],
    aiReason: 'Destinasi lanskap ikonik paling dramatis di Sumatera untuk lanskap sunset dan astrofotografi malam.',
  },
  {
    id: 'dest-007',
    name: 'Taman Nasional Way Kambas',
    location: 'Labuhan Ratu, Lampung Timur',
    regency: 'Lampung Timur',
    category: 'Alam',
    rating: 4.8,
    reviews: 410,
    price: 'Rp 25.000 / orang',
    numericPrice: 25000,
    duration: '3 jam',
    hours: '08:00 - 16:00 WIB',
    image: 'https://images.unsplash.com/photo-1534567153574-2b12153a87f0?auto=format&fit=crop&w=800&q=80',
    coords: [-5.0833, 105.7500],
    description:
      'Pusat konservasi dan pelatihan gajah Sumatera tertua di Indonesia, habitat asli harimau Sumatera dan badak Sumatera yang dilindungi.',
    facilities: ['Pusat Konservasi Gajah', 'Jungle Safari', 'Pemandu Wisata', 'Pusat Informasi'],
    aiReason: 'Sangat direkomendasikan untuk keanekaragaman hayati dan edukasi konservasi satwa dilindungi.',
  },
  {
    id: 'dest-008',
    name: 'Pantai Mandiri Krui',
    location: 'Krui, Pesisir Barat',
    regency: 'Pesisir Barat',
    category: 'Adventure',
    rating: 4.9,
    reviews: 310,
    price: 'Gratis (Parkir Rp 5.000)',
    numericPrice: 0,
    duration: '2-4 jam',
    hours: '24 Jam',
    image: 'https://images.unsplash.com/photo-1502680390469-be75c86b636f?auto=format&fit=crop&w=800&q=80',
    coords: [-5.2158, 103.9214],
    description:
      'Garis pantai pasir hitam berkilau yang terkenal di kalangan peselancar mancanegara dengan ombak kelas dunia dan pemandangan sunset memukau.',
    facilities: ['Spot Surfing', 'Cafe Pantai', 'Penyewaan Papan Selancar', 'Homestay Cafe'],
    aiReason: 'Surga bagi peselancar profesional maupun penikmat sunset dengan suasana pantai tropis yang santai.',
  },
];

export const ExplorePage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchKeyword, setSearchKeyword] = useState<string>(searchParams.get('search') || '');
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua');
  const [selectedRegency, setSelectedRegency] = useState<string>('Semua');
  const [sortBy, setSortBy] = useState<'popular' | 'rating' | 'price'>('popular');
  const [viewMode, setViewMode] = useState<'split' | 'map' | 'list'>('split');
  const [selectedDestination, setSelectedDestination] = useState<Destination | null>(null);
  const [hoveredDestinationId, setHoveredDestinationId] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const mapRef = useRef<HTMLDivElement | null>(null);
  const leafletInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<{ [key: string]: L.Marker }>({});

  const regencies = [
    'Semua',
    'Bandar Lampung',
    'Pesawaran',
    'Lampung Selatan',
    'Tanggamus',
    'Lampung Timur',
    'Way Kanan',
    'Pesisir Barat',
  ];

  // Sync search input with URL params
  useEffect(() => {
    const query = searchParams.get('search');
    if (query !== null) {
      setSearchKeyword(query);
    }
  }, [searchParams]);

  // Filtered Destinations logic
  const filteredDestinations = mockDestinations
    .filter((item) => {
      const matchKeyword =
        item.name.toLowerCase().includes(searchKeyword.toLowerCase()) ||
        item.location.toLowerCase().includes(searchKeyword.toLowerCase()) ||
        item.regency.toLowerCase().includes(searchKeyword.toLowerCase()) ||
        item.category.toLowerCase().includes(searchKeyword.toLowerCase());
      const matchCategory = selectedCategory === 'Semua' || item.category === selectedCategory;
      const matchRegency = selectedRegency === 'Semua' || item.regency === selectedRegency;
      return matchKeyword && matchCategory && matchRegency;
    })
    .sort((a, b) => {
      if (sortBy === 'rating') return b.rating - a.rating;
      if (sortBy === 'price') return a.numericPrice - b.numericPrice;
      return b.reviews - a.reviews; // Default: popular
    });

  // Initialize Leaflet Map with CartoDB Voyage Tiles (Sleek Modern White Map Style)
  useEffect(() => {
    if (!mapRef.current) return;

    if (!leafletInstanceRef.current) {
      const map = L.map(mapRef.current, {
        center: [-5.35, 105.1], // Balanced center over Lampung
        zoom: 9,
        zoomControl: false,
      });

      // CartoDB Voyage Tiles — Modern, ultra-clean, minimal clutter
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyage/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://carto.com/">CARTO</a> &copy; OpenStreetMap',
        maxZoom: 19,
        subdomains: 'abcd',
      }).addTo(map);

      L.control.zoom({ position: 'bottomright' }).addTo(map);
      leafletInstanceRef.current = map;
    }

    const map = leafletInstanceRef.current;
    setTimeout(() => map.invalidateSize(), 200);

    // Clear existing markers
    Object.values(markersRef.current).forEach((marker) => marker.remove());
    markersRef.current = {};

    // Add custom Siger Pins for filtered destinations
    filteredDestinations.forEach((dest) => {
      const isSelected = selectedDestination?.id === dest.id;
      const isHovered = hoveredDestinationId === dest.id;

      // Premium Custom Siger Pin HTML Marker
      const customIcon = L.divIcon({
        className: 'custom-map-siger-pin',
        html: `
          <div style="
            display: inline-flex;
            align-items: center;
            gap: 7px;
            background: ${isSelected ? '#0D9488' : isHovered ? '#115E59' : '#FFFFFF'};
            color: ${isSelected || isHovered ? '#FFFFFF' : '#0F172A'};
            padding: 6px 12px;
            border-radius: 9999px;
            border: 2px solid ${isSelected ? '#F59E0B' : isHovered ? '#F59E0B' : '#0D9488'};
            box-shadow: 0 8px 24px -4px rgba(15, 23, 42, 0.25);
            font-family: 'Plus Jakarta Sans', sans-serif;
            font-size: 11.5px;
            font-weight: 800;
            cursor: pointer;
            white-space: nowrap;
            transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
            transform: ${isSelected || isHovered ? 'scale(1.12) translateY(-4px)' : 'scale(1.0)'};
            z-index: ${isSelected ? '9999' : '100'};
          ">
            <img src="/assets/images/logos/siger-gold-icon.png" style="height: 16px; width: auto; object-contain: fit;" alt="" />
            <span>${dest.name}</span>
            <span style="
              background: ${isSelected ? '#F59E0B' : '#0D9488'};
              color: #FFFFFF;
              font-size: 9.5px;
              padding: 2px 6px;
              border-radius: 999px;
              margin-left: 2px;
            ">&#9733; ${dest.rating}</span>
          </div>
        `,
        iconSize: [140, 40],
        iconAnchor: [70, 20],
      });

      const marker = L.marker(dest.coords, { icon: customIcon }).addTo(map);

      marker.on('click', () => {
        setSelectedDestination(dest);
        map.panTo(dest.coords, { animate: true });
      });

      markersRef.current[dest.id] = marker;
    });
  }, [filteredDestinations, selectedDestination, hoveredDestinationId, viewMode]);

  // Handle Toast
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
    <div className="flex flex-col min-h-[100dvh] pt-20 bg-[#F4F8FA]">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#0F2937] text-white px-5 py-3 rounded-2xl shadow-2xl border border-siger-400/30 flex items-center gap-3 transition-all animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-[#2DD4BF]" />
          <span className="text-xs font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* FULL-WIDTH TOP FILTER & HEADER BAR (Edge-to-Edge) */}
      <div className="w-full px-4 sm:px-6 lg:px-8 py-3 bg-white/90 backdrop-blur-md border-b border-slate-200/80 sticky top-16 z-30 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          
          {/* Left: Title + Search input */}
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <div className="flex items-center gap-2 shrink-0">
              <Compass className="w-5 h-5 text-[#0D9488]" />
              <h1 className="text-lg font-display font-extrabold text-slate-900 tracking-tight">
                Peta Spasial Lampung
              </h1>
              <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-700 border border-amber-300">
                {filteredDestinations.length} Destinasi
              </span>
            </div>

            {/* Compact Search Bar */}
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                value={searchKeyword}
                onChange={(e) => {
                  setSearchKeyword(e.target.value);
                  setSearchParams(e.target.value ? { search: e.target.value } : {});
                }}
                placeholder="Cari destinasi, pantai, museum..."
                className="w-full bg-slate-100/90 border border-slate-200 rounded-full pl-8 pr-8 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0D9488]/40 focus:bg-white"
              />
              {searchKeyword && (
                <button
                  onClick={() => {
                    setSearchKeyword('');
                    setSearchParams({});
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Right: Filters & View Mode Toggles */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {/* Category Pills */}
            <div className="hidden xl:flex items-center gap-1.5">
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
                  className={`flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-bold transition-all ${
                    selectedCategory === label
                      ? 'bg-[#0D9488] text-white shadow-sm'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                  }`}
                >
                  <Icon className="w-3 h-3" />
                  <span>{label}</span>
                </button>
              ))}
            </div>

            {/* Regency Dropdown */}
            <div className="flex items-center gap-1 text-xs text-slate-600 font-semibold bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200">
              <MapPin className="w-3.5 h-3.5 text-[#0D9488]" />
              <select
                value={selectedRegency}
                onChange={(e) => setSelectedRegency(e.target.value)}
                className="bg-transparent focus:outline-none text-xs text-slate-900 font-bold"
              >
                {regencies.map((reg) => (
                  <option key={reg} value={reg}>
                    {reg}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-1 text-xs text-slate-600 font-semibold bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200">
              <SlidersHorizontal className="w-3.5 h-3.5 text-siger-500" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-transparent focus:outline-none text-xs text-slate-900 font-bold"
              >
                <option value="popular">Populer</option>
                <option value="rating">Rating</option>
                <option value="price">Termurah</option>
              </select>
            </div>

            {/* View Mode Toggle Buttons */}
            <div className="flex items-center bg-slate-200/80 p-0.5 rounded-full border border-slate-300">
              <button
                onClick={() => setViewMode('split')}
                title="Tampilan Split Map & List"
                className={`p-1.5 rounded-full transition-all ${
                  viewMode === 'split' ? 'bg-white text-[#0D9488] shadow-sm font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('map')}
                title="Tampilan Peta Full Screen"
                className={`p-1.5 rounded-full transition-all ${
                  viewMode === 'map' ? 'bg-white text-[#0D9488] shadow-sm font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <MapIcon className="w-4 h-4" />
              </button>
            </div>

          </div>
        </div>
      </div>

      {/* FULL VIEWPORT WIDTH CONTENT CONTAINER */}
      <div className="w-full flex-1 px-2 sm:px-4 lg:px-6 py-4">
        <div className="w-full h-[calc(100vh-8.5rem)] flex flex-col lg:flex-row gap-4">

          {/* LEFT: DESTINATION CARDS PANEL (Flexible 45%-50% Width) */}
          {(viewMode === 'split' || viewMode === 'list') && (
            <div
              className={`${
                viewMode === 'list' ? 'w-full max-w-7xl mx-auto' : 'w-full lg:w-5/12 xl:w-4/12'
              } h-full overflow-y-auto pr-1 space-y-3 custom-scrollbar`}
            >
              {filteredDestinations.length === 0 ? (
                <div className="bg-white rounded-3xl p-12 text-center space-y-3 border border-slate-200">
                  <Filter className="w-10 h-10 text-slate-300 mx-auto" />
                  <h3 className="text-base font-bold text-slate-800">Tidak ada destinasi ditemukan</h3>
                  <p className="text-xs text-slate-500">Coba ubah kata kunci pencarian atau filter wilayah kamu.</p>
                  <button
                    onClick={() => {
                      setSearchKeyword('');
                      setSelectedCategory('Semua');
                      setSelectedRegency('Semua');
                      setSearchParams({});
                    }}
                    className="px-4 py-2 bg-[#0D9488] text-white text-xs font-bold rounded-full hover:bg-[#0F766E] transition-colors"
                  >
                    Reset Filter
                  </button>
                </div>
              ) : (
                <div className={`grid ${viewMode === 'list' ? 'grid-cols-1 md:grid-cols-3 xl:grid-cols-4' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-1'} gap-3.5`}>
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
                      className={`group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer border flex flex-col justify-between ${
                        selectedDestination?.id === item.id || hoveredDestinationId === item.id
                          ? 'border-[#0D9488] ring-2 ring-[#0D9488]/30 shadow-md'
                          : 'border-slate-200/90 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex flex-row lg:flex-row items-center p-3 gap-3">
                        {/* Image Thumbnail */}
                        <div className="relative w-28 sm:w-32 h-24 rounded-xl overflow-hidden bg-slate-900 shrink-0">
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          />
                          <span className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-[#0D9488] text-white shadow">
                            {item.category}
                          </span>
                        </div>

                        {/* Card Info */}
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-start justify-between gap-1">
                            <h3 className="text-xs sm:text-sm font-bold font-display text-slate-900 group-hover:text-[#0D9488] transition-colors leading-snug line-clamp-1">
                              {item.name}
                            </h3>
                            <button
                              onClick={(e) => toggleFavorite(item.id, e)}
                              className={`p-1 rounded-full text-xs shrink-0 ${
                                favorites.includes(item.id) ? 'text-red-500' : 'text-slate-300 hover:text-red-400'
                              }`}
                            >
                              <Heart className={`w-3.5 h-3.5 ${favorites.includes(item.id) ? 'fill-current' : ''}`} />
                            </button>
                          </div>

                          <p className="text-[11px] text-slate-500 font-sans flex items-center gap-1 truncate">
                            <MapPin className="w-3 h-3 text-[#0D9488] shrink-0" />
                            <span>{item.location}</span>
                          </p>

                          <div className="flex items-center gap-2 pt-1">
                            <div className="flex items-center gap-1 text-siger-500 font-bold text-xs">
                              <Star className="w-3.5 h-3.5 fill-current" />
                              <span>{item.rating}</span>
                              <span className="text-slate-400 text-[10px] font-normal">({item.reviews})</span>
                            </div>
                            <span className="text-[10px] text-slate-400">&bull;</span>
                            <span className="text-[10px] font-extrabold text-[#0D9488]">{item.price}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* RIGHT: FULL VIEWPORT INTERACTIVE SPATIAL MAP (Flexible 50%-55% or 100% Width) */}
          {(viewMode === 'split' || viewMode === 'map') && (
            <div className={`${viewMode === 'map' ? 'w-full' : 'w-full lg:w-7/12 xl:w-8/12'} h-full relative rounded-3xl overflow-hidden shadow-lg border border-slate-200`}>
              {/* Map Canvas */}
              <div ref={mapRef} className="w-full h-full z-10" />

              {/* Map Floating Legend */}
              <div className="absolute top-4 left-4 z-20 bg-white/90 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-slate-200 shadow-md flex items-center gap-3 text-xs font-semibold text-slate-800">
                <div className="flex items-center gap-1.5">
                  <img src="/assets/images/logos/siger-gold-icon.png" alt="" className="h-4 w-auto" />
                  <span>Pin Siger Lampung</span>
                </div>
                <span className="text-slate-300">|</span>
                <span className="text-[11px] text-slate-500">{filteredDestinations.length} Lokasi Terdaftar</span>
              </div>
            </div>
          )}

        </div>
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
            </div>

            {/* Modal Actions */}
            <div className="p-4 bg-slate-50 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-3">
              <button
                onClick={(e) => toggleFavorite(selectedDestination.id, e)}
                className={`px-4 py-2.5 rounded-full text-xs font-bold flex items-center gap-2 transition-all ${
                  favorites.includes(selectedDestination.id)
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
    </div>
  );
};
