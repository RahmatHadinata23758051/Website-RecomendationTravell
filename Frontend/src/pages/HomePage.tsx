import React, { useState, useEffect } from 'react';
import {
  Search,
  MapPin,
  Sparkles,
  Heart,
  ChevronRight,
  ShieldCheck,
  Headphones,
  ArrowUpRight,
  Utensils,
  Mountain,
  Palmtree,
  Landmark,
  Footprints,
  Bot,
  Compass,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { fetchRealDestinations } from '../services/destinationsApi';
import {
  WiDaySunny,
  WiNightClear,
  WiDayCloudy,
  WiNightAltCloudy,
  WiCloudy,
  WiDayRain,
  WiThunderstorm,
  WiDayHaze,
} from 'react-icons/wi';

interface DestinationCard {
  id: string;
  name: string;
  location: string;
  category: 'Pantai' | 'Alam' | 'Budaya' | 'Kuliner' | 'Adventure';
  rating: number;
  reviews: number;
  duration: string;
  image: string;
}

const mockRecommendations: DestinationCard[] = [
  {
    id: 'dest-001',
    name: 'Pulau Pahawang',
    location: 'Pesawaran',
    category: 'Pantai',
    rating: 4.8,
    reviews: 320,
    duration: '2-3 jam',
    image: '/assets/images/heroes/hero-pahawang-bg.png',
  },
  {
    id: 'dest-002',
    name: 'Air Terjun Putri Malu',
    location: 'Pesawaran',
    category: 'Alam',
    rating: 4.7,
    reviews: 210,
    duration: '1-2 jam',
    image: 'https://images.unsplash.com/photo-1432405972618-c60b0225b8f9?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'dest-003',
    name: 'Museum Lampung',
    location: 'Bandar Lampung',
    category: 'Budaya',
    rating: 4.6,
    reviews: 180,
    duration: '1-2 jam',
    image: 'https://images.unsplash.com/photo-1566127444979-b3d2b654e3d7?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'dest-004',
    name: 'Seruit Lampung',
    location: 'Kuliner Khas',
    category: 'Kuliner',
    rating: 4.9,
    reviews: 290,
    duration: '1 jam',
    image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'dest-005',
    name: 'Gunung Anak Krakatau',
    location: 'Lampung Selatan',
    category: 'Adventure',
    rating: 4.8,
    reviews: 150,
    duration: '3-4 jam',
    image: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80',
  },
];

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Pantai');
  const [recommendations, setRecommendations] = useState<DestinationCard[]>(mockRecommendations);

  useEffect(() => {
    fetchRealDestinations({ limit: 12 }).then((data) => {
      if (data && data.length > 0) {
        const mapped: DestinationCard[] = data.map((d) => ({
          id: d.id,
          name: d.name,
          location: d.regency || d.location,
          category: d.category,
          rating: d.rating,
          reviews: d.reviews,
          duration: d.duration,
          image: d.image,
        }));
        setRecommendations(mapped);
      }
    });
  }, []);

  // OpenWeather API Integration for Provinsi Lampung with key 84071adb3c0d5f4d42ec9ab6b245e2df
  const [weatherData, setWeatherData] = useState<{
    temp: number;
    condition: string;
    iconCode: string;
    location: string;
    province: string;
  }>({
    temp: 28,
    condition: 'Cerah',
    iconCode: '01d',
    location: 'Lampung',
    province: 'Provinsi Lampung',
  });

  useEffect(() => {
    const fetchLampungWeather = async () => {
      try {
        const apiKey = import.meta.env.VITE_OPENWEATHER_API_KEY || '84071adb3c0d5f4d42ec9ab6b245e2df';
        const response = await fetch(
          `https://api.openweathermap.org/data/2.5/weather?q=Bandar%20Lampung,ID&units=metric&appid=${apiKey}&lang=id`
        );
        if (response.ok) {
          const data = await response.json();
          setWeatherData({
            temp: Math.round(data.main.temp),
            condition: data.weather[0]?.description
              ? data.weather[0].description.charAt(0).toUpperCase() + data.weather[0].description.slice(1)
              : 'Cerah',
            iconCode: data.weather[0]?.icon || '01d',
            location: 'Lampung',
            province: 'Provinsi Lampung',
          });
          return;
        }
        // Fallback to free Open-Meteo API if needed
        const freeRes = await fetch(
          'https://api.open-meteo.com/v1/forecast?latitude=-5.45&longitude=105.26&current_weather=true'
        );
        if (freeRes.ok) {
          const freeData = await freeRes.json();
          const code = freeData.current_weather?.weathercode ?? 0;
          const isClear = code <= 3;
          setWeatherData({
            temp: Math.round(freeData.current_weather?.temperature ?? 28),
            condition: isClear ? 'Cerah' : 'Berawan',
            iconCode: isClear ? '01d' : '03d',
            location: 'Lampung',
            province: 'Provinsi Lampung',
          });
        }
      } catch {
        // Keep initial state
      }
    };

    fetchLampungWeather();
  }, []);

  const renderWeatherIcon = (iconCode: string) => {
    switch (iconCode) {
      case '01d':
        return <WiDaySunny className="w-8 h-8 text-amber-500" />;
      case '01n':
        return <WiNightClear className="w-8 h-8 text-indigo-400" />;
      case '02d':
        return <WiDayCloudy className="w-8 h-8 text-amber-500" />;
      case '02n':
        return <WiNightAltCloudy className="w-8 h-8 text-indigo-400" />;
      case '03d':
      case '03n':
      case '04d':
      case '04n':
        return <WiCloudy className="w-8 h-8 text-slate-500" />;
      case '09d':
      case '09n':
      case '10d':
      case '10n':
        return <WiDayRain className="w-8 h-8 text-cyan-500" />;
      case '11d':
      case '11n':
        return <WiThunderstorm className="w-8 h-8 text-purple-600" />;
      case '50d':
      case '50n':
        return <WiDayHaze className="w-8 h-8 text-amber-600" />;
      default:
        return <WiDaySunny className="w-8 h-8 text-amber-500" />;
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchKeyword.trim()) {
      navigate(`/explore?search=${encodeURIComponent(searchKeyword)}`);
    }
  };

  return (
    <div className="flex flex-col min-h-[100dvh]">

      {/* ================================================================
          HERO SECTION
          - Beach image: FULL VIEWPORT WIDTH, starts from very TOP (behind navbar)
          - Tapis pattern: full height from top-left edge
          - No gaps, no breaks, no max-width on background
          ================================================================ */}
      <section className="relative w-screen overflow-hidden" style={{ marginLeft: 'calc(-50vw + 50%)', width: '100vw' }}>
        {/* FULL-BLEED Beach Background — edge-to-edge, top-to-bottom */}
        <img
          src="/assets/images/heroes/hero-pahawang-bg.png"
          alt="Panorama Pantai Pahawang Lampung"
          className="absolute inset-0 w-full h-full object-cover object-center z-0"
        />
        {/* Left white gradient for text readability */}
        <div className="absolute inset-0 bg-gradient-to-r from-white/[0.93] via-white/60 to-transparent z-[1]" />
        {/* Bottom fade — multi-layered for smooth transition (NO patahan) */}
        <div className="absolute inset-0 z-[1]" style={{ background: 'linear-gradient(to bottom, transparent 40%, rgba(244,248,250,0.3) 60%, rgba(244,248,250,0.7) 80%, #F4F8FA 100%)' }} />

        {/* Tapis Gold Ornamental Pattern — FULL from top-left edge
            Using the actual image which has the pattern concentrated on its left side.
            The image itself is already very subtle/faint, so we use high opacity. */}
        <img
          src="/assets/images/patterns/lampung-tapis-pattern-transparent.png"
          alt=""
          aria-hidden="true"
          className="absolute top-0 left-0 w-[650px] h-auto opacity-80 pointer-events-none select-none z-[2]"
        />

        {/* Hero Content — centered within max-width, padded from top for fixed navbar */}
        <div className="relative z-10 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-28 pb-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start min-h-[420px]">

            {/* LEFT: Text, Search, Buttons */}
            <div className="lg:col-span-7 flex flex-col justify-center space-y-7">
              {/* AI Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/80 border border-siger-400/60 shadow-sm backdrop-blur-sm self-start">
                <Sparkles className="w-3.5 h-3.5 text-siger-500" />
                <span className="text-[11px] font-semibold text-slate-700">
                  Rekomendasi Wisata AI &bull; 100% Lokal Lampung
                </span>
              </div>

              {/* Heading */}
              <div className="space-y-3">
                <h1 className="text-4xl sm:text-5xl lg:text-[3.5rem] font-display font-extrabold text-slate-900 tracking-tight leading-[1.1]">
                  Selamat Datang di{' '}
                  <br className="hidden sm:block" />
                  <span className="relative inline-block text-[#0D9488]">
                    Kelana Lampung
                    <img
                      src="/assets/images/logos/siger-gold-icon.png"
                      alt="Siger Crown"
                      className="absolute -top-4 -right-7 h-8 w-auto object-contain pointer-events-none select-none"
                    />
                  </span>
                </h1>
                <p className="text-sm text-slate-600 font-sans max-w-md leading-relaxed">
                  Temukan destinasi terbaik di Lampung dengan rekomendasi
                  berbasis AI yang personal, akurat, dan sesuai dengan minatmu.
                </p>
              </div>

              {/* Search Bar */}
              <form
                onSubmit={handleSearchSubmit}
                className="w-full max-w-lg bg-white rounded-full p-2 pl-5 border border-slate-200/80 shadow-lg flex items-center gap-3 transition-all focus-within:ring-2 focus-within:ring-[#0D9488]/40 focus-within:border-[#0D9488]/50"
              >
                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                  <Search className="w-4 h-4 text-slate-400 shrink-0" />
                  <input
                    type="text"
                    value={searchKeyword}
                    onChange={(e) => setSearchKeyword(e.target.value)}
                    placeholder="Cari destinasi, aktivitas, kuliner, atau pengalaman..."
                    className="w-full bg-transparent text-xs text-slate-900 focus:outline-none placeholder:text-slate-400 font-sans"
                  />
                </div>
                <div className="hidden sm:flex items-center gap-1.5 border-l border-slate-200 pl-3 pr-1 shrink-0">
                  <MapPin className="w-3.5 h-3.5 text-siger-500" />
                  <span className="text-[11px] text-slate-600 font-medium whitespace-nowrap">
                    Lokasi Anda
                  </span>
                </div>
                <button
                  type="submit"
                  className="w-9 h-9 rounded-full bg-[#0D9488] hover:bg-[#0F766E] text-white flex items-center justify-center shrink-0 shadow-md transition-all active:scale-95"
                  aria-label="Cari Destinasi"
                >
                  <Search className="w-4 h-4" />
                </button>
              </form>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={() => navigate('/explore')}
                  className="px-5 py-2.5 rounded-full bg-[#0D9488] hover:bg-[#0F766E] text-white text-xs font-bold shadow-md shadow-[#0D9488]/20 flex items-center gap-2 transition-all active:scale-[0.98]"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Destinasi Populer</span>
                </button>
                <button
                  onClick={() => navigate('/explore')}
                  className="px-5 py-2.5 rounded-full bg-white/90 hover:bg-white text-slate-800 border border-siger-400/70 text-xs font-bold shadow-sm flex items-center gap-2 transition-all active:scale-[0.98] backdrop-blur-sm"
                >
                  <Sparkles className="w-3.5 h-3.5 text-siger-500" />
                  <span>Mulai Menjelajah</span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-siger-600" />
                </button>
              </div>
            </div>

            {/* RIGHT: Weather Widget */}
            <div className="lg:col-span-5 flex items-end justify-center lg:justify-end lg:items-end pb-4">
              <div className="glass-weather-card rounded-3xl p-5 w-full max-w-[340px] border border-white/90 shadow-2xl">
                <div className="flex items-center justify-between border-b border-slate-200/50 pb-3 mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                      {renderWeatherIcon(weatherData.iconCode)}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">{weatherData.temp}°C</p>
                      <p className="text-[10px] text-slate-500 font-medium">{weatherData.condition}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 bg-white/70 px-3 py-1.5 rounded-full border border-slate-200/50">
                    <MapPin className="w-3 h-3 text-[#0D9488]" />
                    <div className="text-right">
                      <p className="text-xs font-bold text-slate-900">{weatherData.location}</p>
                      <p className="text-[9px] text-slate-500 font-medium">{weatherData.province}</p>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-5 gap-1 text-center">
                  {[
                    { key: 'Pantai', icon: Palmtree, label: 'Pantai' },
                    { key: 'Alam', icon: Mountain, label: 'Alam' },
                    { key: 'Budaya', icon: Landmark, label: 'Budaya' },
                    { key: 'Kuliner', icon: Utensils, label: 'Kuliner' },
                    { key: 'Adventure', icon: Footprints, label: 'Adventure' },
                  ].map(({ key, icon: Icon, label }) => (
                    <button
                      key={key}
                      onClick={() => setSelectedCategory(key)}
                      className={`flex flex-col items-center gap-1 p-2 rounded-2xl transition-all ${selectedCategory === key
                          ? 'bg-[#0D9488] text-white shadow-md'
                          : 'hover:bg-slate-100/80 text-slate-600'
                        }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="text-[9px] font-semibold">{label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ================================================================
          CONTENT SECTIONS BELOW HERO
          ================================================================ */}
      <div className="bg-[#F4F8FA] flex-1">
        <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-2 pb-8 space-y-6">

          {/* REKOMENDASI AI UNTUKMU */}
          <section className="glass-card-container rounded-[28px] p-6 sm:p-8 space-y-5">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-siger-500" />
                  <h2 className="text-lg sm:text-xl font-display font-bold text-slate-900">
                    Rekomendasi AI Untukmu
                  </h2>
                </div>
                <p className="text-xs text-slate-500 font-sans">
                  Pilihan destinasi terbaik sesuai minat dan preferensimu
                </p>
              </div>
              <button
                onClick={() => navigate('/explore')}
                className="text-xs font-bold text-[#0D9488] hover:text-[#0F766E] flex items-center gap-1 transition-colors shrink-0"
              >
                <span>Lihat Semua</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="relative">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {recommendations.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => navigate('/explore')}
                    className="group relative rounded-2xl overflow-hidden bg-slate-900 shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer aspect-[3/4] flex flex-col justify-between p-3.5"
                  >
                    <img
                      src={item.image}
                      alt={item.name}
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-slate-950/5" />
                    <div className="relative z-10 flex items-center justify-between">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#0D9488]/90 text-white backdrop-blur-md">
                        {item.category}
                      </span>
                      <button
                        className="w-7 h-7 rounded-full bg-slate-900/50 text-white hover:bg-red-500 flex items-center justify-center backdrop-blur-md transition-colors"
                        aria-label="Simpan Favorit"
                      >
                        <Heart className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="relative z-10 text-white space-y-1">
                      <h3 className="text-xs font-bold font-display leading-tight group-hover:text-siger-400 transition-colors">
                        {item.name}
                      </h3>
                      <p className="text-[10px] text-slate-300 font-sans">{item.location}</p>
                      <div className="flex items-center justify-between pt-1 border-t border-white/20 text-[9px]">
                        <div className="flex items-center gap-1 text-siger-400 font-bold">
                          <span>&#9733; {item.rating}</span>
                          <span className="text-slate-400 font-normal">({item.reviews})</span>
                        </div>
                        <span className="text-slate-300">{item.duration}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <button
                className="hidden lg:flex absolute -right-4 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white text-slate-600 shadow-xl border border-slate-200 items-center justify-center hover:bg-slate-50 transition-all z-20"
                aria-label="Selanjutnya"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </section>

          {/* FEATURE HIGHLIGHTS BAR — Mockup-matched style with Tapis pattern on left & right */}
          <section className="relative glass-card-container rounded-[24px] px-8 sm:px-12 py-4 sm:py-5 overflow-hidden">
            {/* Left & Right Tapis Gold Pattern Motifs matching card height */}
            <img
              src="/assets/images/patterns/lampung-tapis-pattern-transparent.png"
              alt=""
              aria-hidden="true"
              className="absolute left-0 top-0 h-full w-28 object-cover object-left opacity-40 pointer-events-none select-none"
            />
            <img
              src="/assets/images/patterns/lampung-tapis-pattern-transparent.png"
              alt=""
              aria-hidden="true"
              className="absolute right-0 top-0 h-full w-28 object-cover object-left opacity-40 scale-x-[-1] pointer-events-none select-none"
            />

            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-siger-400/40 to-transparent" />
            <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                {
                  icon: Bot,
                  title: 'Rekomendasi AI Cerdas',
                  desc: 'AI menganalisis preferensi untuk memberikan rekomendasi terbaik',
                },
                {
                  icon: ShieldCheck,
                  title: 'Informasi Terpercaya',
                  desc: 'Semua informasi diverifikasi dan selalu diperbarui',
                },
                {
                  icon: Compass,
                  title: 'Panduan Lengkap',
                  desc: 'Dapatkan panduan, tips, dan itinerary perjalanan lengkap',
                },
                {
                  icon: Headphones,
                  title: 'Bantuan 24/7',
                  desc: 'Tim kami siap membantu perjalananmu kapan saja',
                },
              ].map(({ icon: Icon, title, desc }) => (
                <div key={title} className="flex items-center gap-3">
                  {/* Rounded circle icon — matches mockup reference */}
                  <div className="w-10 h-10 rounded-full bg-[#E6FAF5] border border-[#0D9488]/15 flex items-center justify-center shrink-0">
                    <Icon className="w-[18px] h-[18px] text-[#0D9488]" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-[11px] font-bold text-slate-900 leading-tight">{title}</h4>
                    <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

        </div>
      </div>
    </div>
  );
};
