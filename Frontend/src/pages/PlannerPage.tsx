import React, { useState } from 'react';
import {
  Calendar,
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
  Loader2,
} from 'lucide-react';
import { RouteMap3D, RouteSlot } from '../components/RouteMap3D';
import { generateAiPlannerItinerary, swapPlannerSlotApi } from '../services/destinationsApi';
import { useAuth } from '../context/AuthContext';
import { apiClient, getApiErrorMessage } from '../lib/api';
import { logUserActivity } from '../services/activitiesApi';
import { WeatherWidget } from '../components/WeatherWidget';
import { SafeImage } from '../components/SafeImage';

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
  const [generateError, setGenerateError] = useState<string | null>(null);
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

  // Auth & Saved Itinerary State
  const { isAuthenticated, openAuthModal, addXp } = useAuth();
  const [isSavingItinerary, setIsSavingItinerary] = useState<boolean>(false);

  const handleSaveItinerary = async () => {
    if (!isAuthenticated) {
      triggerToast('Silakan masuk akun terlebih dahulu untuk menyimpan rute!');
      openAuthModal('login');
      return;
    }

    if (!generatedItinerary) return;

    setIsSavingItinerary(true);
    try {
      await apiClient.post('/itineraries', {
        title: `Liburan ${selectedRegency} (${durationDays} Hari)`,
        daysJson: generatedItinerary,
      });
      await addXp(50, 'create_route');
      await logUserActivity(
        'CREATE_ROUTE',
        `Membuat Rute ${selectedRegency} (${durationDays} Hari)`,
        '+50 XP',
        'map',
      );
      triggerToast('Itinerary berhasil disimpan ke profil Anda! (+50 XP 🎉)');
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Gagal menyimpan itinerary';
      triggerToast(msg);
    } finally {
      setIsSavingItinerary(false);
    }
  };

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
    { name: 'Semua', icon: Compass },
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

  // AI Generator Handler (server-side planner only; failures surface honestly)
  const handleGenerateItinerary = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);
    setGeneratedItinerary(null);
    setGenerateError(null);
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

      const itinerary = response?.itinerary;
      if (Array.isArray(itinerary) && itinerary.length > 0) {
        setGeneratedItinerary(itinerary);
        setActiveDayTab(1);
        triggerToast(`Itinerary AI ${selectedRegency} Berhasil Dibuat!`);
      } else {
        setGenerateError('Server tidak mengembalikan itinerary. Coba ubah preferensi atau coba lagi.');
      }
    } catch (err) {
      setGenerateError(
        getApiErrorMessage(err, 'Gagal membuat itinerary. Silakan coba beberapa saat lagi.'),
      );
    } finally {
      setIsGenerating(false);
    }
  };
  // Open Swap Slot Modal & Fetch Alternatives
  const handleOpenSwapModal = async (slot: ItinerarySlot, dayNumber: number, slotIndex: number) => {
    setSwapTargetInfo({ dayNumber, slotIndex, slot });
    setSwapModalOpen(true);
    setIsLoadingSwap(true);

    const currentExcludeIds = generatedItinerary
      ? (generatedItinerary.flatMap((d) => d.slots.map((s) => s.canonical_id).filter(Boolean)) as string[])
      : [];

    try {
      const alternatives = await swapPlannerSlotApi({
        city_or_regency: selectedRegency,
        category: slot.category,
        exclude_ids: currentExcludeIds,
      });
      setSwapAlternatives(alternatives);
    } catch (err) {
      setSwapAlternatives([]);
      triggerToast(getApiErrorMessage(err, 'Gagal memuat alternatif spot.'));
    } finally {
      setIsLoadingSwap(false);
    }
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

  return (
    <div className="flex flex-col min-h-[100dvh] pt-24 pb-16 bg-[#F4F8FA]">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#0F2937] text-white px-5 py-3 rounded-2xl shadow-xl border border-slate-200/50 flex items-center gap-3 transition-all">
          <CheckCircle2 className="w-5 h-5 text-[#2DD4BF]" />
          <span className="text-xs font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* CLEAN TOOL HEADER — no hero image, no mascot, no AI branding */}
      <header className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10 mb-6">
        <div className="space-y-2">
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Perencana Perjalanan Lampung
          </h1>
          <p className="text-sm text-slate-600 max-w-2xl">
            Pilih kabupaten, kategori, budget & ritme &rarr; dapatkan rute harian & peta spasial.
          </p>
        </div>
      </header>

      {/* Main Container */}
      <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10 space-y-6">

        {/* FASE 9: WEATHER & SEASON ALERT WIDGET */}
        <WeatherWidget />

        {/* PLANNER FORM */}
        <form
          onSubmit={handleGenerateItinerary}
          className="bg-white rounded-[24px] border border-slate-200 p-6 sm:p-8 space-y-6 shadow-sm"
        >
          <div className="border-b border-slate-200 pb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold font-display text-slate-900 flex items-center gap-2">
              <Compass className="w-5 h-5 text-[#0D9488]" />
              <span>Preferensi Perjalanan</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">

            {/* 1. SELECT REGENCY */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-800">
                <span>Pilih Kabupaten/Kota</span>
              </label>
              <select
                value={selectedRegency}
                onChange={(e) => setSelectedRegency(e.target.value)}
                className="w-full min-h-[44px] bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2.5 text-xs font-bold text-slate-900 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:outline-none focus:border-[#0D9488]"
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
              <label className="text-xs font-bold text-slate-800">
                <span>Durasi Hari</span>
              </label>
              <select
                value={durationDays}
                onChange={(e) => setDurationDays(Number(e.target.value))}
                className="w-full min-h-[44px] bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2.5 text-xs font-bold text-slate-900 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:outline-none focus:border-[#0D9488]"
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
                <span>Kategori Wisata (Multi-Pilih)</span>
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
                      aria-pressed={isSelected}
                      className={`px-3.5 py-2 min-h-[44px] rounded-full text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:outline-none ${
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
              <label className="text-xs font-bold text-slate-800">
                <span>Batas Budget</span>
              </label>
              <select
                value={selectedBudget}
                onChange={(e) => setSelectedBudget(e.target.value)}
                className="w-full min-h-[44px] bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2.5 text-xs font-bold text-slate-900 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:outline-none focus:border-[#0D9488]"
              >
                <option value="Ekonomis">Ekonomis (&lt; Rp 100rb/hari)</option>
                <option value="Standar">Standar (Rp 100rb - 300rb)</option>
                <option value="Mewah">Mewah (&gt; Rp 300rb/hari)</option>
              </select>
            </div>

            {/* 5. PACE STYLE */}
            <div className="space-y-2 lg:col-span-5 flex flex-col sm:flex-row sm:items-center justify-between border-t border-slate-100 pt-4 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-800">
                  <span>Ritme Liburan (Pace)</span>
                </label>
                <p className="text-[11px] text-slate-500">Tentukan kepadatan jam kunjungan destinasi harianmu</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedPace('Santai')}
                  aria-pressed={selectedPace === 'Santai'}
                  className={`px-4 py-2.5 min-h-[44px] rounded-2xl text-xs font-bold transition-all focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:outline-none ${
                    selectedPace === 'Santai'
                      ? 'bg-[#0D9488] text-white shadow-md'
                      : 'bg-slate-100 text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>Santai (3 Slot/Hari)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedPace('Padat')}
                  aria-pressed={selectedPace === 'Padat'}
                  className={`px-4 py-2.5 min-h-[44px] rounded-2xl text-xs font-bold transition-all focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:outline-none ${
                    selectedPace === 'Padat'
                      ? 'bg-[#0D9488] text-white shadow-md'
                      : 'bg-slate-100 text-slate-600 hover:text-slate-900'
                  }`}
                >
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
              className="bg-[#0D9488] hover:bg-[#0F766E] text-white font-extrabold text-xs sm:text-sm px-6 py-3 min-h-[44px] rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-2 disabled:opacity-50 active:scale-95 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:outline-none"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Menyusun rute...</span>
                </>
              ) : (
                <span>Buat Rute</span>
              )}
            </button>
          </div>
        </form>

        {/* HONEST ERROR STATE */}
        {generateError && !isGenerating && (
          <div
            role="alert"
            className="rounded-[24px] border border-rose-200 bg-rose-50/80 p-6 sm:p-8 text-center space-y-3 shadow-sm"
          >
            <h3 className="font-display text-lg font-bold text-rose-900">
              Gagal Menyusun Itinerary
            </h3>
            <p className="mx-auto max-w-md text-xs sm:text-sm text-rose-700 leading-relaxed">
              {generateError}
            </p>
            <button
              type="button"
              onClick={handleGenerateItinerary}
              className="mt-2 inline-flex items-center gap-2 rounded-xl bg-rose-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-rose-700 active:scale-95"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Coba Lagi</span>
            </button>
          </div>
        )}

        {/* INLINE LOADING STATE — no mascot, no marketing copy */}
        {isGenerating && (
          <div className="bg-white rounded-[24px] border border-slate-200 p-8 text-center space-y-3 animate-pulse">
            <Loader2 className="w-8 h-8 text-[#0D9488] animate-spin mx-auto" />
            <p className="text-xs font-medium text-slate-600">Menyusun rute di {selectedRegency}...</p>
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
                  className="bg-white border border-slate-200 text-slate-700 hover:text-[#0D9488] px-4 py-2.5 min-h-[44px] rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 active:scale-95 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:outline-none"
                >
                  {copiedLink ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Share2 className="w-4 h-4" />}
                  <span>{copiedLink ? 'Tersalin!' : 'Bagikan Link'}</span>
                </button>
                <button
                  type="button"
                  disabled={isSavingItinerary}
                  onClick={handleSaveItinerary}
                  className="bg-white border border-slate-200 text-slate-700 hover:text-[#0D9488] px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
                >
                  <Bookmark className={`w-4 h-4 ${isSavingItinerary ? 'animate-spin text-[#0D9488]' : ''}`} />
                  <span>{isSavingItinerary ? 'Menyimpan...' : 'Simpan Rute'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="bg-white border border-slate-200 text-slate-700 hover:text-[#0D9488] px-4 py-2.5 min-h-[44px] rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 active:scale-95 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:outline-none"
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
                      className={`px-4 py-2.5 min-h-[44px] rounded-2xl text-xs font-extrabold transition-all whitespace-nowrap flex items-center gap-2 shadow-sm focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:outline-none ${
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
                                  className="px-3 py-1.5 min-h-[44px] rounded-full text-xs font-bold bg-white border border-teal-200 text-[#0D9488] hover:bg-[#0F766E] hover:text-white transition-all flex items-center gap-1.5 shadow-sm active:scale-95 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:outline-none"
                                  title="Tukar spot wisata ini dengan alternatif lain"
                                  aria-label={`Ganti spot ${slot.activityTitle}`}
                                >
                                  <RotateCw className="w-3.5 h-3.5" />
                                  <span>Ganti Spot</span>
                                </button>
                              </div>
                            </div>

                            {/* Destination Main Row */}
                            <div className="flex items-start gap-4">
                              <SafeImage
                                src={slot.image}
                                alt={slot.activityTitle}
                                className="w-20 sm:w-24 h-20 sm:h-24 rounded-xl object-cover shrink-0 shadow-sm"
                                fallbackSrc="/assets/images/heroes/hero-pahawang-bg.png"
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
                    Pilih Alternatif Spot
                  </h3>
                  <p className="text-xs text-slate-500">
                    Mengganti: <span className="font-semibold text-slate-800">{swapTargetInfo.slot.activityTitle}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSwapModalOpen(false)}
                className="p-2.5 min-w-[44px] min-h-[44px] rounded-full text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-all flex items-center justify-center focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:outline-none"
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
                        <SafeImage
                          src={alt.image}
                          alt={alt.activityTitle}
                          className="w-14 h-14 rounded-xl object-cover shrink-0 shadow-sm"
                          fallbackSrc="/assets/images/heroes/hero-pahawang-bg.png"
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
                        className="px-3 py-2 min-h-[44px] rounded-xl bg-[#0D9488] text-white text-xs font-bold shrink-0 shadow-sm group-hover:scale-105 transition-all focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:outline-none"
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
