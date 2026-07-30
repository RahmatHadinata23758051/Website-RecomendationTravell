import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Calendar,
  DollarSign,
  Compass,
  Clock,
  MapPin,
  Share2,
  Bookmark,
  Printer,
  CheckCircle2,
  X,
  Palmtree,
  Mountain,
  Landmark,
  Utensils,
  Footprints,
  Info,
  Car,
  RotateCw,
  RefreshCw,
  Zap,
  Sun,
} from 'lucide-react';
import { RouteMap3D, RouteSlot } from '../components/RouteMap3D';
import { generateAiPlannerItinerary, swapPlannerSlotApi } from '../services/destinationsApi';

interface ItinerarySlot extends RouteSlot {
  canonical_id?: string;
  numericCost: number;
}

interface DaySchedule {
  dayNumber: number;
  title: string;
  slots: ItinerarySlot[];
}

export const PlannerPage: React.FC = () => {
  // Wizard Input State
  const [selectedRegency, setSelectedRegency] = useState<string>('Kota Bandar Lampung');
  const [durationDays, setDurationDays] = useState<number>(3);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(['Semua']);
  const [selectedBudget, setSelectedBudget] = useState<string>('Standar');
  const [selectedPace, setSelectedPace] = useState<string>('Santai');

  // Generator & Interactive State
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generatedItinerary, setGeneratedItinerary] = useState<DaySchedule[] | null>(null);
  const [activeDayTab, setActiveDayTab] = useState<number>(1);
  const [selectedSlotIndex, setSelectedSlotIndex] = useState<number | null>(null);

  // Toast & Share State
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  // Spot Swap Modal State
  const [swapModalOpen, setSwapModalOpen] = useState<boolean>(false);
  const [swapTargetInfo, setSwapTargetInfo] = useState<{ dayNumber: number; slotIndex: number; slot: ItinerarySlot } | null>(null);
  const [swapAlternatives, setSwapAlternatives] = useState<any[]>([]);
  const [isLoadingSwap, setIsLoadingSwap] = useState<boolean>(false);

  const regenciesList = [
    'Kota Bandar Lampung',
    'Kota Metro',
    'Kabupaten Pesawaran',
    'Kabupaten Pesisir Barat',
    'Kabupaten Lampung Selatan',
    'Kabupaten Lampung Barat',
    'Kabupaten Tanggamus',
    'Kabupaten Pringsewu',
    'Kabupaten Lampung Tengah',
    'Kabupaten Lampung Utara',
    'Kabupaten Lampung Timur',
    'Kabupaten Way Kanan',
    'Kabupaten Tulang Bawang',
    'Kabupaten Tulang Bawang Barat',
    'Kabupaten Mesuji',
  ];

  const categories = [
    { name: 'Semua', icon: Sparkles },
    { name: 'Pantai', icon: Palmtree },
    { name: 'Alam', icon: Mountain },
    { name: 'Budaya', icon: Landmark },
    { name: 'Kuliner', icon: Utensils },
    { name: 'Adventure', icon: Footprints },
  ];

  const handleToggleCategory = (catName: string) => {
    if (catName === 'Semua') {
      setSelectedCategories(['Semua']);
      return;
    }
    let updated = selectedCategories.filter((c) => c !== 'Semua');
    if (updated.includes(catName)) {
      updated = updated.filter((c) => c !== catName);
      if (updated.length === 0) updated = ['Semua'];
    } else {
      updated.push(catName);
    }
    setSelectedCategories(updated);
  };

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // AI Generator Handler with Live API & Fallback
  const handleGenerateItinerary = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);
    setGeneratedItinerary(null);
    setSelectedSlotIndex(null);

    const catsPayload = selectedCategories.includes('Semua')
      ? []
      : selectedCategories;

    try {
      const response = await generateAiPlannerItinerary({
        city_or_regency: selectedRegency,
        categories: catsPayload,
        primary_category: catsPayload.join(','),
        budget_level: selectedBudget,
        pace_style: selectedPace,
        duration_days: durationDays,
      });

      if (response && response.itinerary && Array.isArray(response.itinerary) && response.itinerary.length > 0) {
        setGeneratedItinerary(response.itinerary);
        setIsGenerating(false);
        setActiveDayTab(1);
        triggerToast(`Itinerary AI ${selectedRegency} Berhasil Dibuat!`);
        return;
      }
    } catch (err) {
      console.warn('Live API itinerary failed, using client fallback', err);
    }

    const regencyCoordsMap: Record<string, { lat: number; lng: number }> = {
      'Kota Bandar Lampung': { lat: -5.4129, lng: 105.2589 },
      'Kabupaten Pesawaran': { lat: -5.5248, lng: 105.1500 },
      'Kabupaten Pesisir Barat': { lat: -5.2130, lng: 103.9573 },
      'Kabupaten Lampung Selatan': { lat: -5.6503, lng: 105.5189 },
      'Kabupaten Lampung Barat': { lat: -5.0820, lng: 104.2164 },
      'Kabupaten Tanggamus': { lat: -5.4680, lng: 104.6855 },
      'Kabupaten Way Kanan': { lat: -4.5776, lng: 104.5609 },
      'Kabupaten Lampung Timur': { lat: -5.2053, lng: 105.6165 },
      'Kabupaten Lampung Tengah': { lat: -4.8840, lng: 105.2429 },
      'Kabupaten Lampung Utara': { lat: -4.8609, lng: 104.7337 },
      'Kota Metro': { lat: -5.1266, lng: 105.3099 },
      'Kabupaten Pringsewu': { lat: -5.3761, lng: 104.9670 },
      'Kabupaten Tulang Bawang': { lat: -4.3516, lng: 105.4805 },
      'Kabupaten Tulang Bawang Barat': { lat: -4.4540, lng: 105.0930 },
      'Kabupaten Mesuji': { lat: -4.0312, lng: 105.3776 },
    };

    const targetCoords = regencyCoordsMap[selectedRegency] || { lat: -5.4292, lng: 105.2611 };

    // Fallback Mock Result if Live API unavailable
    setTimeout(() => {
      let mockResult: DaySchedule[] = [];
      const primaryCat = !selectedCategories.includes('Semua') ? selectedCategories[0] : 'Pantai';

      for (let d = 1; d <= durationDays; d++) {
        mockResult.push({
          dayNumber: d,
          title: `Hari ${d}: Jelajah Wisata ${selectedRegency}`,
          slots: [
            {
              canonical_id: `mock-${d}-1`,
              time: '08:30 - 11:30 WIB',
              activityTitle: `Destinasi Wisata Unggulan ${selectedRegency}`,
              category: primaryCat,
              location: `Kawasan Wisata ${selectedRegency}`,
              estimatedCost: 'Rp 25.000 / orang',
              numericCost: 25000,
              coords: [targetCoords.lat + (d - 1) * 0.02, targetCoords.lng + (d - 1) * 0.015],
              image: '/assets/images/heroes/hero-pahawang-bg.png',
              aiTip: `Spot unggulan terpopuler di ${selectedRegency} dengan lanskap eksotik.`,
              travelTime: 'Lokasi awal hari',
            },
            {
              canonical_id: `mock-${d}-2`,
              time: '12:00 - 14:00 WIB',
              activityTitle: `Makan Siang & Kuliner Khas ${selectedRegency}`,
              category: 'Kuliner',
              location: `Pusat Kuliner ${selectedRegency}`,
              estimatedCost: 'Rp 35.000 / orang',
              numericCost: 35000,
              coords: [targetCoords.lat + (d - 1) * 0.02 + 0.012, targetCoords.lng + (d - 1) * 0.015 + 0.01],
              image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80',
              aiTip: `Mencicipi masakan khas Lampung otentik dengan racikan rempah istimewa.`,
              travelTime: '15 menit perjalanan',
            },
            {
              canonical_id: `mock-${d}-3`,
              time: '15:30 - 18:30 WIB',
              activityTitle: `Pesona Sunset & Bukit Panorama ${selectedRegency}`,
              category: 'Alam',
              location: `Dataran Tinggi ${selectedRegency}`,
              estimatedCost: 'Rp 20.000 / orang',
              numericCost: 20000,
              coords: [targetCoords.lat + (d - 1) * 0.02 - 0.015, targetCoords.lng + (d - 1) * 0.015 - 0.012],
              image: 'https://images.unsplash.com/photo-1432405972618-c60b0225b8f9?auto=format&fit=crop&w=800&q=80',
              aiTip: `Spot foto matahari terbenam paling indah dan adem.`,
              travelTime: '20 menit perjalanan',
            },
          ],
        });
      }

      setGeneratedItinerary(mockResult);
      setIsGenerating(false);
      setActiveDayTab(1);
      triggerToast(`Itinerary AI ${selectedRegency} Berhasil Dibuat!`);
    }, 1200);
  };

  // Open Swap Slot Modal & Fetch Alternatives
  const handleOpenSwapModal = async (slot: ItinerarySlot, dayNumber: number, slotIndex: number) => {
    setSwapTargetInfo({ dayNumber, slotIndex, slot });
    setSwapModalOpen(true);
    setIsLoadingSwap(true);

    const currentExcludeIds = generatedItinerary
      ? (generatedItinerary.flatMap((d) => d.slots.map((s) => s.canonical_id).filter(Boolean)) as string[])
      : [];

    const alternatives = await swapPlannerSlotApi({
      city_or_regency: selectedRegency,
      category: slot.category,
      exclude_ids: currentExcludeIds,
    });

    setSwapAlternatives(alternatives);
    setIsLoadingSwap(false);
  };

  // Replace Slot with Selected Alternative
  const handleReplaceSlot = (newAlternative: any) => {
    if (!swapTargetInfo || !generatedItinerary) return;

    const { dayNumber, slotIndex } = swapTargetInfo;

    const updatedItinerary = generatedItinerary.map((day) => {
      if (day.dayNumber === dayNumber) {
        const updatedSlots = [...day.slots];
        updatedSlots[slotIndex] = {
          ...updatedSlots[slotIndex],
          canonical_id: newAlternative.canonical_id,
          activityTitle: newAlternative.activityTitle,
          category: newAlternative.category,
          location: newAlternative.location,
          estimatedCost: newAlternative.estimatedCost,
          numericCost: newAlternative.numericCost,
          coords: newAlternative.coords,
          image: newAlternative.image,
          aiTip: newAlternative.aiTip,
        };
        return { ...day, slots: updatedSlots };
      }
      return day;
    });

    setGeneratedItinerary(updatedItinerary);
    setSwapModalOpen(false);
    setSwapTargetInfo(null);
    triggerToast(`Spot berhasil diganti ke ${newAlternative.activityTitle}!`);
  };

  const calculateTotalCost = () => {
    if (!generatedItinerary) return 0;
    return generatedItinerary.reduce((totalDay, day) => {
      return totalDay + day.slots.reduce((totalSlot, slot) => totalSlot + slot.numericCost, 0);
    }, 0);
  };

  const handleCopyShareLink = () => {
    navigator.clipboard.writeText(window.location.origin + '/share/lampung-itinerary-9842');
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const activeDaySlots =
    generatedItinerary?.find((day) => day.dayNumber === activeDayTab)?.slots || [];

  const mascotMessages = [
    'Tabik Pun! Mau liburan seru di Lampung? Pilih Kabupaten & beberapa Kategori favoritmu yuk!',
    'Raden Gajah & Muli Lampung siap menyusun rute peta spasial 3D harian untukmu!',
    'Mau budget Ekonomis, Standar, atau Mewah? Semua bisa disesuaikan!',
    'Tips: Wisata bahari Pesawaran & Pesisir Barat paling pas dikunjungi pagi hari lho!',
  ];

  const [mascotMsgIndex, setMascotMsgIndex] = useState<number>(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setMascotMsgIndex((prev) => (prev + 1) % mascotMessages.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [mascotMessages.length]);

  return (
    <div className="flex flex-col min-h-[100dvh] pt-24 pb-16">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#0F2937] text-white px-5 py-3 rounded-2xl shadow-2xl border border-siger-400/30 flex items-center gap-3 transition-all animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-[#2DD4BF]" />
          <span className="text-xs font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* FULL-BLEED PAHAWANG BEACH HERO BACKGROUND BANNER */}
      <section className="relative w-screen overflow-hidden -mt-24 mb-8" style={{ marginLeft: 'calc(-50vw + 50%)', width: '100vw' }}>
        {/* Background Image */}
        <img
          src="/assets/images/heroes/hero-pahawang-bg.png"
          alt="Panorama Pantai Pahawang Lampung"
          className="absolute inset-0 w-full h-full object-cover object-center z-0"
        />
        {/* Gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-r from-white/95 via-white/80 to-white/40 z-[1]" />
        <div className="absolute inset-0 z-[1]" style={{ background: 'linear-gradient(to bottom, transparent 30%, rgba(248,250,252,0.6) 70%, #F8FAFC 100%)' }} />

        {/* Hero Content */}
        <div className="relative z-10 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-28 pb-10">
          <div className="glass-card-container rounded-[32px] p-6 sm:p-10 relative overflow-hidden backdrop-blur-xl border border-white/80 shadow-2xl">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              
              {/* Left Column: Text & Title */}
              <div className="lg:col-span-7 space-y-3">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/90 border border-amber-300 shadow-sm">
                  <Sparkles className="w-4 h-4 text-siger-500" />
                  <span className="text-xs font-extrabold text-slate-800">
                    AI Itinerary Generator &bull; Raden Gajah Engine
                  </span>
                </div>

                <h1 className="text-3xl sm:text-5xl font-display font-extrabold text-slate-900 tracking-tight leading-tight">
                  Perencana Liburan Multi-Hari AI
                </h1>
                <p className="text-xs sm:text-base text-slate-600 font-sans leading-relaxed">
                  Pilih Kabupaten/Kota & beberapa kategori impianmu di Lampung, lalu biarkan AI menyusun rute peta spasial 3D & jadwal perjalanan harian secara akurat!
                </p>
              </div>

              {/* Right Column: Muli Lampung Mascot with Animated Chat Bubble */}
              <div className="lg:col-span-5 flex items-center justify-center lg:justify-end gap-3 pt-2 lg:pt-0">
                {/* Speech Bubble */}
                <div className="relative bg-white/95 border border-teal-200 rounded-2xl p-4 shadow-xl max-w-xs transition-all duration-300">
                  <p className="text-xs font-semibold text-slate-800 leading-relaxed font-sans min-h-[36px] flex items-center">
                    {mascotMessages[mascotMsgIndex]}
                  </p>
                  <div className="hidden sm:block absolute top-1/2 -right-2 -translate-y-1/2 w-0 h-0 border-y-8 border-y-transparent border-l-8 border-l-white" />
                </div>

                {/* Mascot Avatar */}
                <div className="relative w-20 h-20 sm:w-24 sm:h-24 shrink-0 flex items-center justify-center">
                  <div className="absolute inset-1 rounded-full bg-teal-100/70 animate-pulse" />
                  <img
                    src="/assets/images/mascot/muli-lampung-mascot.png"
                    alt="Muli Lampung Mascot"
                    className="w-20 h-20 sm:w-24 sm:h-24 object-contain relative z-10 transition-transform hover:scale-105"
                  />
                </div>
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 space-y-8">

        {/* AI WIZARD FORM INPUT */}
        <form
          onSubmit={handleGenerateItinerary}
          className="glass-card-container rounded-[28px] p-6 sm:p-8 space-y-6"
        >
          <div className="border-b border-slate-200/80 pb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold font-display text-slate-900 flex items-center gap-2">
              <Compass className="w-5 h-5 text-[#0D9488]" />
              <span>Atur Preferensi Perjalananmu</span>
            </h2>
            <span className="text-xs text-slate-500 font-medium">100% Otomatis & Spasial</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">

            {/* 1. SELECT REGENCY */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-[#0D9488]" />
                <span>Pilih Kabupaten/Kota</span>
              </label>
              <select
                value={selectedRegency}
                onChange={(e) => setSelectedRegency(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-[#0D9488]"
              >
                {regenciesList.map((reg) => (
                  <option key={reg} value={reg}>
                    {reg}
                  </option>
                ))}
              </select>
            </div>

            {/* 2. DURATION DAYS */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-[#0D9488]" />
                <span>Durasi Hari</span>
              </label>
              <select
                value={durationDays}
                onChange={(e) => setDurationDays(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-[#0D9488]"
              >
                <option value={1}>1 Hari (Day Trip)</option>
                <option value={2}>2 Hari (Weekend Getaway)</option>
                <option value={3}>3 Hari (Full Exploration)</option>
                <option value={4}>4 Hari (Grand Tour)</option>
                <option value={5}>5 Hari (Ultimate Holiday)</option>
              </select>
            </div>

            {/* 3. MULTI-SELECT CATEGORY PREFERENCE */}
            <div className="space-y-2 lg:col-span-2">
              <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-[#0D9488]" />
                  <span>Kategori Wisata (Multi-Pilih)</span>
                </span>
                <span className="text-[10px] text-slate-500 font-normal">Pilih &gt;1 kategori</span>
              </label>

              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                {categories.map((cat) => {
                  const Icon = cat.icon;
                  const isSelected = selectedCategories.includes(cat.name);

                  return (
                    <button
                      key={cat.name}
                      type="button"
                      onClick={() => handleToggleCategory(cat.name)}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95 ${
                        isSelected
                          ? 'bg-[#0D9488] text-white shadow-sm ring-2 ring-[#0D9488]/30'
                          : 'bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700'
                      }`}
                    >
                      <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-amber-300' : 'text-slate-500'}`} />
                      <span>{cat.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 4. BUDGET LEVEL */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-[#0D9488]" />
                <span>Batas Budget</span>
              </label>
              <select
                value={selectedBudget}
                onChange={(e) => setSelectedBudget(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-[#0D9488]"
              >
                <option value="Ekonomis">Ekonomis (&lt; Rp 100rb/hari)</option>
                <option value="Standar">Standar (Rp 100rb - 300rb)</option>
                <option value="Mewah">Mewah (&gt; Rp 300rb/hari)</option>
              </select>
            </div>

            {/* 5. PACE STYLE */}
            <div className="space-y-2 lg:col-span-5 flex flex-col sm:flex-row sm:items-center justify-between border-t border-slate-100 pt-4 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-[#0D9488]" />
                  <span>Ritme Liburan (Pace)</span>
                </label>
                <p className="text-[11px] text-slate-500">Tentukan kepadatan jam kunjungan destinasi harianmu</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedPace('Santai')}
                  className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 ${
                    selectedPace === 'Santai'
                      ? 'bg-[#0D9488] text-white shadow-md'
                      : 'bg-slate-100 text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Sun className="w-3.5 h-3.5 text-amber-300" />
                  <span>Santai (3 Slot/Hari)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedPace('Padat')}
                  className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 ${
                    selectedPace === 'Padat'
                      ? 'bg-[#0D9488] text-white shadow-md'
                      : 'bg-slate-100 text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Zap className="w-3.5 h-3.5 text-amber-300" />
                  <span>Padat Wisata (4-5 Slot/Hari)</span>
                </button>
              </div>
            </div>

          </div>

          {/* SUBMIT BUTTON */}
          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={isGenerating}
              className="bg-[#0D9488] hover:bg-[#0F766E] text-white font-extrabold text-xs sm:text-sm px-6 py-3 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-2 disabled:opacity-50 active:scale-95"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Meracik Rute Spasial AI...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>Buat Itinerary AI {selectedRegency}</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* LOADING ANIMATED STATE */}
        {isGenerating && (
          <div className="glass-card-container rounded-[32px] p-12 text-center space-y-5 animate-pulse">
            <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-[#0D9488]/20 animate-ping" />
              <img
                src="/assets/images/mascot/muli-lampung-mascot.png"
                alt="AI Mascot Loading"
                className="w-20 h-20 object-contain relative z-10 animate-bounce"
              />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold font-display text-slate-900">
                Meracik Rute Wisata Terbaik di {selectedRegency}...
              </h3>
              <p className="text-xs text-slate-500 font-sans max-w-md mx-auto">
                AI Raden Gajah sedang menyesuaikan {selectedCategories.join(', ')} di {selectedRegency}, menyisipkan kuliner khas, dan menghitung urutan jarak spasial terpendek.
              </p>
            </div>
          </div>
        )}

        {/* ITINERARY RESULT SECTION */}
        {generatedItinerary && !isGenerating && (
          <div className="space-y-8 animate-in fade-in duration-500">

            {/* ACTION HEADER & SUMMARY BAR */}
            <div className="glass-card-container rounded-[28px] p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold font-display text-slate-900">
                  Rencana Liburan {selectedRegency} ({durationDays} Hari)
                </h3>
                <p className="text-xs text-slate-500 font-sans mt-0.5">
                  Kategori Terpilih: <span className="font-bold text-[#0D9488]">{selectedCategories.join(', ')}</span> &bull; Estimasi Total Biaya: <span className="font-extrabold text-[#0D9488] text-sm">Rp {calculateTotalCost().toLocaleString('id-ID')}</span> / orang
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyShareLink}
                  className="bg-white border border-slate-200 text-slate-700 hover:text-[#0D9488] px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 active:scale-95"
                >
                  {copiedLink ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Share2 className="w-4 h-4" />}
                  <span>{copiedLink ? 'Tersalin!' : 'Bagikan Link'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => triggerToast('Itinerary Disimpan ke Menu Favorit!')}
                  className="bg-white border border-slate-200 text-slate-700 hover:text-[#0D9488] px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 active:scale-95"
                >
                  <Bookmark className="w-4 h-4" />
                  <span>Simpan Rute</span>
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="bg-white border border-slate-200 text-slate-700 hover:text-[#0D9488] px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 active:scale-95"
                >
                  <Printer className="w-4 h-4" />
                  <span>Cetak PDF</span>
                </button>
              </div>
            </div>

            {/* MAIN TWO-COLUMN GRID: 3D MAP & DAILY TIMELINE */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

              {/* LEFT 7 COLS: SPATIAL 3D ROUTE MAP */}
              <div className="lg:col-span-7 sticky top-28 space-y-4">
                <RouteMap3D
                  slots={activeDaySlots}
                  selectedSlotIndex={selectedSlotIndex}
                  onSelectSlot={(idx) => setSelectedSlotIndex(idx)}
                  regencyName={selectedRegency}
                />
              </div>

              {/* RIGHT 5 COLS: DAILY TIMELINE TABS & SLOTS */}
              <div className="lg:col-span-5 space-y-6">

                {/* DAY TABS NAVIGATOR */}
                <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
                  {generatedItinerary.map((day) => (
                    <button
                      key={day.dayNumber}
                      type="button"
                      onClick={() => {
                        setActiveDayTab(day.dayNumber);
                        setSelectedSlotIndex(null);
                      }}
                      className={`px-4 py-2.5 rounded-2xl text-xs font-extrabold transition-all whitespace-nowrap flex items-center gap-2 shadow-sm ${
                        activeDayTab === day.dayNumber
                          ? 'bg-[#0D9488] text-white shadow-md'
                          : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Hari {day.dayNumber}</span>
                    </button>
                  ))}
                </div>

                {/* ACTIVE DAY TIMELINE LIST */}
                <div className="space-y-4">
                  <div className="bg-white/80 backdrop-blur-md border border-slate-200/80 p-4 rounded-2xl">
                    <h4 className="text-sm font-bold text-slate-900 font-display">
                      {generatedItinerary.find((d) => d.dayNumber === activeDayTab)?.title}
                    </h4>
                    <p className="text-[11px] text-slate-500 font-sans mt-0.5">
                      {activeDaySlots.length} Destinasi & Resto Terpilih &bull; Urutan Jarak Efisien
                    </p>
                  </div>

                  <div className="relative pl-6 space-y-6 border-l-2 border-slate-200/80 ml-3">
                    {activeDaySlots.map((slot, index) => {
                      const isSlotSelected = selectedSlotIndex === index;

                      return (
                        <div
                          key={index}
                          onClick={() => setSelectedSlotIndex(index)}
                          className="relative group cursor-pointer"
                        >
                          {/* Timeline Dot Badge Number */}
                          <div
                            className={`absolute -left-6 sm:-left-8 top-4 w-6 h-6 rounded-full flex items-center justify-center z-10 shadow-md font-mono text-[10px] font-extrabold transition-transform ${
                              isSlotSelected
                                ? 'bg-[#0D9488] text-white ring-4 ring-[#0D9488]/30 scale-125'
                                : 'bg-slate-900 text-white border-2 border-white group-hover:scale-110'
                            }`}
                          >
                            {index + 1}
                          </div>

                          {/* Time Slot Card */}
                          <div
                            className={`glass-card-container rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all border p-4 sm:p-5 space-y-3 ${
                              isSlotSelected
                                ? 'border-[#0D9488] bg-teal-50/40 ring-2 ring-[#0D9488]/20'
                                : 'border-slate-200'
                            }`}
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                              <div className="flex items-center gap-2">
                                <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-teal-50 text-[#0D9488] border border-teal-200 flex items-center gap-1">
                                  <Clock className="w-3.5 h-3.5" />
                                  <span>{slot.time}</span>
                                </span>
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-900 text-white">
                                  {slot.category}
                                </span>
                              </div>

                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-[#0D9488]">{slot.estimatedCost}</span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenSwapModal(slot, activeDayTab, index);
                                  }}
                                  className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-white border border-teal-200 text-[#0D9488] hover:bg-[#0D9488] hover:text-white transition-all flex items-center gap-1 shadow-sm active:scale-95"
                                  title="Tukar spot wisata ini dengan rekomendasi AI lain"
                                >
                                  <RotateCw className="w-3 h-3" />
                                  <span>Ganti Spot</span>
                                </button>
                              </div>
                            </div>

                            {/* Destination Main Row */}
                            <div className="flex items-start gap-4">
                              <img
                                src={slot.image}
                                alt={slot.activityTitle}
                                className="w-20 sm:w-24 h-20 sm:h-24 rounded-xl object-cover shrink-0 shadow-sm"
                              />
                              <div className="space-y-1 min-w-0">
                                <h4 className="text-sm font-bold text-slate-900 font-display">
                                  {slot.activityTitle}
                                </h4>
                                <p className="text-xs text-slate-500 font-sans flex items-center gap-1 truncate">
                                  <MapPin className="w-3.5 h-3.5 text-[#0D9488] shrink-0" />
                                  <span>{slot.location}</span>
                                </p>
                                {slot.aiTip && (
                                  <div className="mt-2 bg-amber-50/80 border border-amber-200/80 rounded-xl p-2.5 flex items-start gap-2 text-xs text-amber-900">
                                    <Info className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                                    <span className="text-[11px] font-medium leading-tight">{slot.aiTip}</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Travel Time Indicator */}
                            {slot.travelTime && (
                              <div className="pt-2 border-t border-slate-100 flex items-center gap-1.5 text-[11px] text-slate-500 font-semibold">
                                <Car className="w-3.5 h-3.5 text-[#0D9488]" />
                                <span>{slot.travelTime}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>

            </div>

          </div>
        )}

      </div>

      {/* SPOT SWAP MODAL POPUP */}
      {swapModalOpen && swapTargetInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[32px] max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-teal-50 text-[#0D9488]">
                  <RotateCw className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold font-display text-slate-900">
                    Pilih Alternatif Spot AI
                  </h3>
                  <p className="text-xs text-slate-500">
                    Mengganti: <span className="font-semibold text-slate-800">{swapTargetInfo.slot.activityTitle}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSwapModalOpen(false)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {isLoadingSwap ? (
              <div className="py-10 text-center space-y-3">
                <RefreshCw className="w-8 h-8 text-[#0D9488] animate-spin mx-auto" />
                <p className="text-xs font-bold text-slate-600">Mencari spot alternatif terbaik di {selectedRegency}...</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                {swapAlternatives.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-6">Tidak ditemukan tempat alternatif tambahan di kawasan ini.</p>
                ) : (
                  swapAlternatives.map((alt, idx) => (
                    <div
                      key={idx}
                      onClick={() => handleReplaceSlot(alt)}
                      className="p-3.5 rounded-2xl border border-slate-200 hover:border-[#0D9488] hover:bg-teal-50/30 transition-all cursor-pointer flex items-center justify-between gap-3 group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={alt.image}
                          alt={alt.activityTitle}
                          className="w-14 h-14 rounded-xl object-cover shrink-0 shadow-sm"
                        />
                        <div className="min-w-0 space-y-0.5">
                          <span className="text-[10px] font-extrabold text-[#0D9488] uppercase tracking-wider">{alt.category}</span>
                          <h4 className="text-xs font-bold text-slate-900 truncate font-display group-hover:text-[#0D9488]">
                            {alt.activityTitle}
                          </h4>
                          <p className="text-[11px] text-slate-500 truncate">{alt.location}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="px-3 py-1.5 rounded-xl bg-[#0D9488] text-white text-xs font-bold shrink-0 shadow-sm group-hover:scale-105 transition-all"
                      >
                        Pilih
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
