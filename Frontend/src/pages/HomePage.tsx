import React, { useState } from 'react';
import {
  Search,
  MapPin,
  Sparkles,
  Sun,
  Compass,
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
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

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
    location: 'Way Kanan',
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

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchKeyword.trim()) {
      navigate(`/explore?search=${encodeURIComponent(searchKeyword)}`);
    }
  };

  return (
    <div className="relative min-h-[100dvh] flex flex-col justify-between overflow-x-hidden">
      {/* Top Left Watermark Background Pattern */}
      <div
        className="absolute top-0 left-0 w-[500px] h-[500px] opacity-10 pointer-events-none bg-no-repeat bg-contain"
        style={{ backgroundImage: 'url(/assets/images/patterns/lampung-tapis-pattern.png)' }}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-16 space-y-12">
        {/* HERO SECTION - MATCHING MOCKUP 1:1 */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center pt-2">
          {/* Left Column: Heading & Search Inputs */}
          <div className="lg:col-span-7 space-y-6">
            {/* AI Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/80 border border-siger-400 shadow-sm backdrop-blur-md">
              <Sparkles className="w-3.5 h-3.5 text-siger-500" />
              <span className="text-[11px] font-semibold text-slate-700">
                Rekomendasi Wisata AI • 100% Lokal Lampung
              </span>
            </div>

            {/* H1 Title with Siger Crown Accent */}
            <div className="space-y-2">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-extrabold text-slate-900 tracking-tight leading-[1.15]">
                Selamat Datang di <br />
                <span className="relative text-[#0D9488] inline-block">
                  Kelana Lampung
                  <img
                    src="/assets/images/logos/siger-gold-icon.png"
                    alt="Siger Crown Accent"
                    className="absolute -top-4 right-0 h-7 w-auto object-contain pointer-events-none"
                  />
                </span>
              </h1>
              <p className="text-sm sm:text-base text-slate-600 font-sans max-w-xl leading-relaxed pt-2">
                Temukan destinasi terbaik di Lampung dengan rekomendasi berbasis AI yang personal,
                akurat, dan sesuai dengan minatmu.
              </p>
            </div>

            {/* Search Bar Input Pill */}
            <form
              onSubmit={handleSearchSubmit}
              className="bg-white rounded-full p-2 pl-6 border border-slate-200/80 shadow-xl flex items-center justify-between gap-3 transition-all focus-within:ring-2 focus-within:ring-primary-600"
            >
              <div className="flex items-center gap-3 flex-1">
                <Search className="w-4 h-4 text-slate-400 shrink-0" />
                <input
                  type="text"
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  placeholder="Cari destinasi, aktivitas, kuliner, atau pengalaman..."
                  className="w-full bg-transparent text-xs text-slate-900 focus:outline-none placeholder:text-slate-400 font-sans"
                />
              </div>

              <div className="hidden sm:flex items-center gap-2 border-l border-slate-200 pl-4 pr-2">
                <MapPin className="w-3.5 h-3.5 text-siger-500 shrink-0" />
                <span className="text-xs text-slate-600 font-medium whitespace-nowrap">
                  Lokasi Anda
                </span>
              </div>

              <button
                type="submit"
                className="w-10 h-10 rounded-full bg-[#0D9488] hover:bg-[#0F766E] text-white flex items-center justify-center shrink-0 shadow-md transition-all active:scale-95"
                aria-label="Cari Destinasi"
              >
                <Search className="w-4 h-4" />
              </button>
            </form>

            {/* Action Pill Buttons */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <button
                onClick={() => navigate('/explore')}
                className="px-6 py-3 rounded-full bg-[#0D9488] hover:bg-[#0F766E] text-white text-xs font-bold shadow-md shadow-[#0D9488]/20 flex items-center gap-2 transition-all active:scale-[0.98]"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Destinasi Populer</span>
              </button>

              <button
                onClick={() => navigate('/explore')}
                className="px-6 py-3 rounded-full bg-white hover:bg-slate-50 text-slate-800 border border-siger-400 text-xs font-bold shadow-sm flex items-center gap-2 transition-all active:scale-[0.98]"
              >
                <span>Mulai Menjelajah</span>
                <ArrowUpRight className="w-4 h-4 text-siger-600" />
              </button>
            </div>
          </div>

          {/* Right Column: Hero Beach Image & Weather Card Widget */}
          <div className="lg:col-span-5 relative">
            {/* Hero Beach Image */}
            <div className="relative rounded-[36px] overflow-hidden shadow-2xl border-4 border-white aspect-[4/3] sm:aspect-[16/11]">
              <img
                src="/assets/images/heroes/hero-pahawang-bg.png"
                alt="Pesisir Pantai Lampung Pahawang Island"
                className="w-full h-full object-cover object-center"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 via-transparent to-transparent" />
            </div>

            {/* Floating Glassmorphism Weather & Category Card Widget */}
            <div className="absolute -bottom-6 -left-4 sm:left-6 right-4 sm:right-6 glass-weather-card rounded-3xl p-5 border border-white/90 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* Weather Info Header */}
              <div className="flex items-center justify-between border-b border-slate-200/60 pb-3 mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-100/80 text-amber-500 flex items-center justify-center">
                    <Sun className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">28°C</p>
                    <p className="text-[10px] text-slate-500 font-medium">Cerah</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 bg-white/70 px-3 py-1.5 rounded-full border border-slate-200/60">
                  <MapPin className="w-3.5 h-3.5 text-[#0D9488]" />
                  <div className="text-right">
                    <p className="text-xs font-bold text-slate-900">Pahawang Island</p>
                    <p className="text-[9px] text-slate-500 font-medium">Pesawaran</p>
                  </div>
                </div>
              </div>

              {/* Category Quick Filter Icons */}
              <div className="grid grid-cols-5 gap-2 text-center">
                <button
                  onClick={() => setSelectedCategory('Pantai')}
                  className={`flex flex-col items-center gap-1 p-2 rounded-2xl transition-all ${
                    selectedCategory === 'Pantai'
                      ? 'bg-[#0D9488] text-white shadow-md'
                      : 'hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <Palmtree className="w-4 h-4" />
                  <span className="text-[10px] font-semibold">Pantai</span>
                </button>

                <button
                  onClick={() => setSelectedCategory('Alam')}
                  className={`flex flex-col items-center gap-1 p-2 rounded-2xl transition-all ${
                    selectedCategory === 'Alam'
                      ? 'bg-[#0D9488] text-white shadow-md'
                      : 'hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <Mountain className="w-4 h-4" />
                  <span className="text-[10px] font-semibold">Alam</span>
                </button>

                <button
                  onClick={() => setSelectedCategory('Budaya')}
                  className={`flex flex-col items-center gap-1 p-2 rounded-2xl transition-all ${
                    selectedCategory === 'Budaya'
                      ? 'bg-[#0D9488] text-white shadow-md'
                      : 'hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <Landmark className="w-4 h-4" />
                  <span className="text-[10px] font-semibold">Budaya</span>
                </button>

                <button
                  onClick={() => setSelectedCategory('Kuliner')}
                  className={`flex flex-col items-center gap-1 p-2 rounded-2xl transition-all ${
                    selectedCategory === 'Kuliner'
                      ? 'bg-[#0D9488] text-white shadow-md'
                      : 'hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <Utensils className="w-4 h-4" />
                  <span className="text-[10px] font-semibold">Kuliner</span>
                </button>

                <button
                  onClick={() => setSelectedCategory('Adventure')}
                  className={`flex flex-col items-center gap-1 p-2 rounded-2xl transition-all ${
                    selectedCategory === 'Adventure'
                      ? 'bg-[#0D9488] text-white shadow-md'
                      : 'hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <Footprints className="w-4 h-4" />
                  <span className="text-[10px] font-semibold">Adventure</span>
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 2: REKOMENDASI AI UNTUKMU - CARD CAROUSEL GRID */}
        <section className="glass-card-container rounded-[32px] p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-siger-500" />
                <h2 className="text-xl sm:text-2xl font-display font-bold text-slate-900">
                  Rekomendasi AI Untukmu
                </h2>
              </div>
              <p className="text-xs text-slate-500 font-sans mt-0.5">
                Pilihan destinasi terbaik sesuai minat dan preferensimu
              </p>
            </div>

            <button
              onClick={() => navigate('/explore')}
              className="text-xs font-bold text-[#0D9488] hover:text-[#0F766E] flex items-center gap-1 transition-colors"
            >
              <span>Lihat Semua</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Cards Carousel Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {mockRecommendations.map((item) => (
              <div
                key={item.id}
                onClick={() => navigate('/explore')}
                className="group relative rounded-2xl overflow-hidden bg-slate-900 shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer aspect-[3/4] flex flex-col justify-between p-4"
              >
                {/* Background Image */}
                <img
                  src={item.image}
                  alt={item.name}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/30 to-slate-950/10" />

                {/* Top Badge & Heart Trigger */}
                <div className="relative z-10 flex items-center justify-between">
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#0D9488]/90 text-white backdrop-blur-md">
                    {item.category}
                  </span>
                  <button
                    className="w-7 h-7 rounded-full bg-slate-900/60 text-white hover:bg-red-500 flex items-center justify-center backdrop-blur-md transition-colors"
                    aria-label="Simpan Favorit"
                  >
                    <Heart className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Bottom Destination Info */}
                <div className="relative z-10 text-white space-y-1">
                  <h3 className="text-sm font-bold font-display leading-tight group-hover:text-siger-400 transition-colors">
                    {item.name}
                  </h3>
                  <p className="text-[10px] text-slate-300 font-sans">{item.location}</p>

                  <div className="flex items-center justify-between pt-1 border-t border-white/20 text-[10px]">
                    <div className="flex items-center gap-1 text-siger-400 font-bold">
                      <span>★ {item.rating}</span>
                      <span className="text-slate-400 font-normal">({item.reviews})</span>
                    </div>
                    <span className="text-slate-300">{item.duration}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* SECTION 3: FEATURE HIGHLIGHTS BAR */}
        <section className="glass-card-container rounded-3xl p-6 sm:p-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-teal-50 text-[#0D9488] flex items-center justify-center shrink-0">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">Rekomendasi AI Cerdas</h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  AI menganalisis preferensi untuk memberikan rekomendasi terbaik
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-teal-50 text-[#0D9488] flex items-center justify-center shrink-0">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">Informasi Terpercaya</h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Semua informasi diverifikasi dan selalu diperbarui
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-teal-50 text-[#0D9488] flex items-center justify-center shrink-0">
                <Compass className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">Panduan Lengkap</h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Dapatkan panduan, tips, dan itinerary perjalanan lengkap
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-teal-50 text-[#0D9488] flex items-center justify-center shrink-0">
                <Headphones className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">Bantuan 24/7</h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Tim kami siap membantu perjalananmu kapan saja
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};
