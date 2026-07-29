import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Heart,
  Trash2,
  Search,
  MapPin,
  Star,
  ExternalLink,
  Clock,
  Sparkles,
  Compass,
  CheckCircle2,
  Tag,
  X,
  Palmtree,
  Mountain,
  Landmark,
  Utensils,
  Footprints,
} from 'lucide-react';
import { Destination, mockDestinations } from './ExplorePage';

export const FavoritesPage: React.FC = () => {
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua');
  const [selectedDestination, setSelectedDestination] = useState<Destination | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Load initial favorites from localStorage or default seed
  useEffect(() => {
    const saved = localStorage.getItem('kelana_lampung_favorites');
    if (saved) {
      try {
        setFavoriteIds(JSON.parse(saved));
      } catch (e) {
        setFavoriteIds(['dest-001', 'dest-004', 'dest-007']);
      }
    } else {
      // Default seed demo favorites if none saved yet
      const seed = ['dest-001', 'dest-004', 'dest-007'];
      setFavoriteIds(seed);
      localStorage.setItem('kelana_lampung_favorites', JSON.stringify(seed));
    }
  }, []);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const removeFavorite = (id: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = favoriteIds.filter((item) => item !== id);
    setFavoriteIds(updated);
    localStorage.setItem('kelana_lampung_favorites', JSON.stringify(updated));
    triggerToast(`"${name}" dihapus dari favorit`);
  };

  const clearAllFavorites = () => {
    if (window.confirm('Apakah Anda yakin ingin menghapus semua destinasi favorit?')) {
      setFavoriteIds([]);
      localStorage.setItem('kelana_lampung_favorites', JSON.stringify([]));
      triggerToast('Semua favorit berhasil dihapus');
    }
  };

  // Filtered list of favorite destinations
  const favoriteDestinations = mockDestinations.filter((dest) =>
    favoriteIds.includes(dest.id)
  );

  const filteredFavorites = favoriteDestinations.filter((item) => {
    const matchKeyword =
      item.name.toLowerCase().includes(searchKeyword.toLowerCase()) ||
      item.location.toLowerCase().includes(searchKeyword.toLowerCase()) ||
      item.regency.toLowerCase().includes(searchKeyword.toLowerCase());
    const matchCategory =
      selectedCategory === 'Semua' || item.category === selectedCategory;
    return matchKeyword && matchCategory;
  });

  return (
    <div className="flex flex-col min-h-[100dvh] pt-24 pb-16">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#0F2937] text-white px-5 py-3 rounded-2xl shadow-2xl border border-siger-400/30 flex items-center gap-3 transition-all animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-[#2DD4BF]" />
          <span className="text-xs font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Main Container */}
      <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 space-y-8">

        {/* HERO HEADER */}
        <div className="glass-card-container rounded-[28px] p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-red-50 border border-red-200">
              <Heart className="w-3.5 h-3.5 text-red-500 fill-current" />
              <span className="text-[11px] font-semibold text-red-700">
                Koleksi Pribadi Wisata Lampung
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-display font-extrabold text-slate-900 tracking-tight">
              Destinasi & Itinerary Favorit Saya
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 font-sans max-w-xl">
              Simpan dan kelola destinasi impianmu agar mudah diakses saat merencanakan liburan di Lampung.
            </p>
          </div>

          {/* Quick Counter */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-center shrink-0 min-w-[140px]">
            <p className="text-[11px] text-slate-500 font-medium">Total Favorit</p>
            <p className="text-3xl font-display font-extrabold text-[#0D9488]">
              {favoriteIds.length} <span className="text-xs font-bold text-slate-400">Lokasi</span>
            </p>
          </div>
        </div>

        {/* FILTER & SEARCH BAR */}
        {favoriteIds.length > 0 && (
          <div className="glass-card-container rounded-[24px] p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
            
            {/* Search Input */}
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                placeholder="Cari favorit tersimpan..."
                className="w-full bg-slate-50 border border-slate-200 rounded-full pl-10 pr-4 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0D9488]/40 focus:border-[#0D9488]"
              />
            </div>

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
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                    selectedCategory === label
                      ? 'bg-[#0D9488] text-white shadow-md'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{label}</span>
                </button>
              ))}
            </div>

            {/* Clear All Button */}
            <button
              onClick={clearAllFavorites}
              className="px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold transition-colors flex items-center gap-1.5 shrink-0 self-end md:self-auto"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Hapus Semua</span>
            </button>
          </div>
        )}

        {/* FAVORITES GRID / EMPTY STATE */}
        {favoriteIds.length === 0 ? (
          /* EMPTY STATE */
          <div className="glass-card-container rounded-[28px] p-12 text-center space-y-4 max-w-lg mx-auto">
            <div className="w-20 h-20 rounded-full bg-red-50 text-red-400 flex items-center justify-center mx-auto border border-red-100 shadow-inner">
              <Heart className="w-10 h-10 stroke-[1.5]" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-xl font-display font-bold text-slate-900">
                Belum Ada Favorit Tersimpan
              </h3>
              <p className="text-xs text-slate-500 font-sans leading-relaxed">
                Jelajahi keindahan wisata Lampung dan tekan ikon hati pada destinasi favoritmu agar tersimpan di halaman ini.
              </p>
            </div>
            <Link
              to="/explore"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#0D9488] hover:bg-[#0F766E] text-white text-xs font-extrabold shadow-lg shadow-[#0D9488]/30 transition-all hover:scale-105"
            >
              <Compass className="w-4 h-4" />
              <span>Mulai Jelajahi Wisata Lampung</span>
            </Link>
          </div>
        ) : filteredFavorites.length === 0 ? (
          /* NO FILTER MATCH STATE */
          <div className="glass-card-container rounded-[28px] p-10 text-center space-y-3">
            <Search className="w-8 h-8 text-slate-300 mx-auto" />
            <h3 className="text-sm font-bold text-slate-800">Tidak ada favorit yang cocok</h3>
            <p className="text-xs text-slate-500">Coba atur ulang kata kunci pencarian atau filter kategori kamu.</p>
            <button
              onClick={() => {
                setSearchKeyword('');
                setSelectedCategory('Semua');
              }}
              className="px-4 py-2 bg-[#0D9488] text-white text-xs font-bold rounded-full hover:bg-[#0F766E] transition-colors"
            >
              Reset Filter
            </button>
          </div>
        ) : (
          /* FAVORITES CARDS GRID */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredFavorites.map((item) => (
              <div
                key={item.id}
                onClick={() => setSelectedDestination(item)}
                className="group glass-card-container rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer border border-slate-200/80 hover:border-slate-300 flex flex-col justify-between"
              >
                {/* Image Header */}
                <div className="relative aspect-[16/10] overflow-hidden bg-slate-100">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent" />

                  {/* Top Category Badge & Remove Button */}
                  <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-[#0D9488] text-white shadow-md">
                      {item.category}
                    </span>
                    <button
                      onClick={(e) => removeFavorite(item.id, item.name, e)}
                      title="Hapus dari favorit"
                      className="w-7 h-7 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center shadow-md transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Bottom Info Overlay */}
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
                <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
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
                      <span>Lihat Detail</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>

      {/* QUICK DETAIL MODAL */}
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
                onClick={(e) => {
                  removeFavorite(selectedDestination.id, selectedDestination.name, e);
                  setSelectedDestination(null);
                }}
                className="px-4 py-2.5 rounded-full bg-red-500 hover:bg-red-600 text-white text-xs font-bold flex items-center gap-2 transition-all shadow-md"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hapus dari Favorit</span>
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
