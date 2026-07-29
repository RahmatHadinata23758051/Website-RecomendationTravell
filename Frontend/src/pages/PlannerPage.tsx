import React, { useState } from 'react';
import {
  Sparkles,
  Calendar,
  DollarSign,
  Users,
  Compass,
  Clock,
  MapPin,
  Share2,
  Bookmark,
  Printer,
  CheckCircle2,
  Copy,
  X,
  Tag,
  Palmtree,
  Mountain,
  Landmark,
  Utensils,
  Footprints,
  Info,
  Car,
} from 'lucide-react';

interface ItinerarySlot {
  time: string;
  activityTitle: string;
  category: 'Pantai' | 'Alam' | 'Budaya' | 'Kuliner' | 'Adventure';
  location: string;
  estimatedCost: string;
  numericCost: number;
  image: string;
  aiTip: string;
  travelTime?: string;
}

interface DaySchedule {
  dayNumber: number;
  title: string;
  slots: ItinerarySlot[];
}

export const PlannerPage: React.FC = () => {
  // Wizard Input State
  const [durationDays, setDurationDays] = useState<number>(3);
  const [budgetTier, setBudgetTier] = useState<'Ekonomis' | 'Standar' | 'Mewah'>('Standar');
  const [selectedPreferences, setSelectedPreferences] = useState<string[]>([
    'Pantai & Bahari',
    'Kuliner Lampung',
  ]);
  const [tripType, setTripType] = useState<'Solo' | 'Pasangan' | 'Keluarga' | 'Teman'>('Pasangan');

  // AI Generation State
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generatedItinerary, setGeneratedItinerary] = useState<DaySchedule[] | null>(null);
  const [activeDayTab, setActiveDayTab] = useState<number>(1);

  // Modals & Notifications
  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  const preferencesList = [
    { id: 'Pantai & Bahari', icon: Palmtree },
    { id: 'Wisata Alam & Hutan', icon: Mountain },
    { id: 'Kuliner Lampung', icon: Utensils },
    { id: 'Budaya & Sejarah', icon: Landmark },
    { id: 'Petualangan Extrem', icon: Footprints },
  ];

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const togglePreference = (id: string) => {
    if (selectedPreferences.includes(id)) {
      if (selectedPreferences.length > 1) {
        setSelectedPreferences(selectedPreferences.filter((item) => item !== id));
      }
    } else {
      setSelectedPreferences([...selectedPreferences, id]);
    }
  };

  // Mock AI Generator Handler
  const handleGenerateItinerary = (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);
    setGeneratedItinerary(null);

    // Simulate AI Processing
    setTimeout(() => {
      const mockResult: DaySchedule[] = [
        {
          dayNumber: 1,
          title: 'Eksplorasi Kota & Wisata Budaya Bandar Lampung',
          slots: [
            {
              time: '08:00 - 10:30 WIB',
              activityTitle: 'Museum Lampung (Ruwa Jurai)',
              category: 'Budaya',
              location: 'Rajabasa, Bandar Lampung',
              estimatedCost: 'Rp 5.000 / orang',
              numericCost: 5000,
              image: 'https://images.unsplash.com/photo-1566127444979-b3d2b654e3d7?auto=format&fit=crop&w=800&q=80',
              aiTip: 'Datang pagi hari untuk tur pemandu gratis mengenai sejarah kain Tapis kuno Lampung.',
              travelTime: '20 menit perjalanan ke restoran',
            },
            {
              time: '11:30 - 13:00 WIB',
              activityTitle: 'Makan Siang Seruit Khas Lampung',
              category: 'Kuliner',
              location: 'Pusat Kota Bandar Lampung',
              estimatedCost: 'Rp 45.000 / orang',
              numericCost: 45000,
              image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80',
              aiTip: 'Nikmati olahan ikan segar dengan sambal tempoyak durian khas Lampung yang menggugah selera.',
              travelTime: '35 menit perjalanan ke dermaga',
            },
            {
              time: '15:00 - 18:00 WIB',
              activityTitle: 'Sunset di Puncak Mas Lampung',
              category: 'Alam',
              location: 'Sukadanaham, Bandar Lampung',
              estimatedCost: 'Rp 20.000 / orang',
              numericCost: 20000,
              image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80',
              aiTip: 'Lokasi terbaik untuk menikmati lanskap pemandangan Teluk Lampung dari ketinggian.',
            },
          ],
        },
        {
          dayNumber: 2,
          title: 'Petualangan Bahari & Snorkeling Pulau Pahawang',
          slots: [
            {
              time: '07:30 - 08:30 WIB',
              activityTitle: 'Perjalanan ke Dermaga Ketapang Pesawaran',
              category: 'Adventure',
              location: 'Pesawaran, Lampung',
              estimatedCost: 'Rp 15.000 (Sewa Motor/Bensin)',
              numericCost: 15000,
              image: '/assets/images/heroes/hero-pahawang-bg.png',
              aiTip: 'Pastikan membawa sunscreen dan sarung waterproof pelindung HP.',
              travelTime: '45 menit menyeberang dengan perahu',
            },
            {
              time: '09:00 - 14:00 WIB',
              activityTitle: 'Island Hopping & Snorkeling Pulau Pahawang Besar',
              category: 'Pantai',
              location: 'Pesawaran',
              estimatedCost: 'Rp 150.000 / orang (Tur Perahu & Alat)',
              numericCost: 150000,
              image: '/assets/images/heroes/hero-pahawang-bg.png',
              aiTip: 'Spot foto bawah laut bersama Ikan Nemo alami yang ramah dengan wisatawan.',
              travelTime: '30 menit kembali ke daratan',
            },
            {
              time: '16:00 - 18:30 WIB',
              activityTitle: 'Santai Sore di Pantai Mutun',
              category: 'Pantai',
              location: 'Pesawaran',
              estimatedCost: 'Rp 10.000 / orang',
              numericCost: 10000,
              image: 'https://images.unsplash.com/photo-1502680390469-be75c86b636f?auto=format&fit=crop&w=800&q=80',
              aiTip: 'Suasana pantai tenang dengan angin sepoi-sepoi dan wahana banana boat.',
            },
          ],
        },
        {
          dayNumber: 3,
          title: 'Eksplorasi Konservasi & Sentra Tapis Lampung',
          slots: [
            {
              time: '08:30 - 12:00 WIB',
              activityTitle: 'Wisata Edukasi Taman Nasional Way Kambas',
              category: 'Alam',
              location: 'Lampung Timur',
              estimatedCost: 'Rp 25.000 / orang',
              numericCost: 25000,
              image: 'https://images.unsplash.com/photo-1534567153574-2b12153a87f0?auto=format&fit=crop&w=800&q=80',
              aiTip: 'Interaksi langsung dengan Gajah Sumatera yang dilindungi di pusat pelatihan.',
              travelTime: '1 jam perjalanan kembali ke pusat kota',
            },
            {
              time: '13:30 - 16:00 WIB',
              activityTitle: 'Belanja Oleh-Oleh Kerajinan Tapis & Kopi Lampung',
              category: 'Budaya',
              location: 'Pusat Oleh-Oleh Yen Yen, Bandar Lampung',
              estimatedCost: 'Rp 100.000 (Estimasi Souvenir)',
              numericCost: 100000,
              image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80',
              aiTip: 'Dapatkan Kopi Robusta Lampung murni dan camilan Kripik Pisang Cokelat khas Lampung.',
            },
          ],
        },
      ];

      setGeneratedItinerary(mockResult.slice(0, durationDays));
      setIsGenerating(false);
      setActiveDayTab(1);
      triggerToast('Itinerary AI berhasil dibuat!');
    }, 1800);
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

        {/* HERO SECTION BANNER */}
        <div className="glass-card-container rounded-[28px] p-6 sm:p-8 relative overflow-hidden space-y-3">
          <div className="absolute top-0 right-0 w-80 h-full bg-gradient-to-l from-teal-500/10 to-transparent pointer-events-none" />
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-50 border border-amber-200">
            <Sparkles className="w-3.5 h-3.5 text-siger-500" />
            <span className="text-[11px] font-semibold text-amber-700">
              AI Itinerary Generator &bull; Raden Gajah Engine
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-display font-extrabold text-slate-900 tracking-tight leading-tight">
            Perencana Liburan Multi-Hari AI
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 font-sans max-w-2xl leading-relaxed">
            Susun jadwal perjalanan harian otomatis dari jam ke jam yang disesuaikan dengan minat, durasi, budget, dan tipe rombonganmu di Lampung.
          </p>
        </div>

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
            <span className="text-xs text-slate-500 font-medium">100% Otomatis & Akurat</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

            {/* 1. DURATION DAYS */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-[#0D9488]" />
                <span>Durasi Perjalanan</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 3].map((days) => (
                  <button
                    key={days}
                    type="button"
                    onClick={() => setDurationDays(days)}
                    className={`py-2 px-3 rounded-2xl text-xs font-bold transition-all border ${
                      durationDays === days
                        ? 'bg-[#0D9488] text-white border-[#0D9488] shadow-md'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {days} Hari
                  </button>
                ))}
              </div>
            </div>

            {/* 2. BUDGET TIER */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-siger-500" />
                <span>Estimasi Budget</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['Ekonomis', 'Standar', 'Mewah'] as const).map((tier) => (
                  <button
                    key={tier}
                    type="button"
                    onClick={() => setBudgetTier(tier)}
                    className={`py-2 px-2 rounded-2xl text-[11px] font-bold transition-all border ${
                      budgetTier === tier
                        ? 'bg-[#0D9488] text-white border-[#0D9488] shadow-md'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {tier}
                  </button>
                ))}
              </div>
            </div>

            {/* 3. TRIP TYPE */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-[#0D9488]" />
                <span>Anggota Rombongan</span>
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {(['Solo', 'Pasangan', 'Keluarga', 'Teman'] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setTripType(type)}
                    className={`py-2 px-1 rounded-2xl text-[10px] font-bold transition-all border text-center ${
                      tripType === type
                        ? 'bg-[#0D9488] text-white border-[#0D9488] shadow-md'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* 4. SUBMIT BUTTON */}
            <div className="flex items-end">
              <button
                type="submit"
                disabled={isGenerating}
                className="w-full py-3 rounded-2xl bg-[#0D9488] hover:bg-[#0F766E] text-white text-xs font-extrabold shadow-lg shadow-[#0D9488]/30 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-60"
              >
                {isGenerating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Menyusun Itinerary...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-siger-400" />
                    <span>Generate Itinerary AI</span>
                  </>
                )}
              </button>
            </div>

          </div>

          {/* MULTI-SELECT PREFERENCES */}
          <div className="space-y-2.5 pt-2 border-t border-slate-100">
            <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Tag className="w-4 h-4 text-siger-500" />
              <span>Minat & Preferensi Wisata (Pilih beberapa)</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {preferencesList.map(({ id, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => togglePreference(id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all border ${
                    selectedPreferences.includes(id)
                      ? 'bg-amber-100 text-amber-800 border-amber-300 shadow-sm'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{id}</span>
                </button>
              ))}
            </div>
          </div>
        </form>

        {/* LOADING ANIMATION STATE */}
        {isGenerating && (
          <div className="glass-card-container rounded-[28px] p-12 text-center space-y-4 animate-pulse">
            <div className="w-16 h-16 rounded-full bg-teal-100 text-[#0D9488] flex items-center justify-center mx-auto shadow-inner">
              <Sparkles className="w-8 h-8 animate-spin" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900">AI Raden Gajah Sedang Bekerja...</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Menganalisis rute perjalanan terbaik, estimasi waktu tempuh, dan rekomendasi kuliner di Lampung.
              </p>
            </div>
          </div>
        )}

        {/* ITINERARY RESULT DISPLAY */}
        {generatedItinerary && !isGenerating && (
          <div className="space-y-6 animate-in fade-in duration-300">
            
            {/* ITINERARY HEADER & ACTION BAR */}
            <div className="glass-card-container rounded-[24px] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-[#0D9488] text-white">
                    {durationDays} Hari Trip
                  </span>
                  <span className="text-xs font-bold text-slate-600">
                    Budget: <span className="text-[#0D9488]">{budgetTier}</span>
                  </span>
                </div>
                <h2 className="text-xl font-display font-extrabold text-slate-900">
                  Rencana Perjalanan Lampung Terbaik
                </h2>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => triggerToast('Itinerary tersimpan ke daftar favorit!')}
                  className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  <Bookmark className="w-3.5 h-3.5 text-[#0D9488]" />
                  <span>Simpan</span>
                </button>
                <button
                  onClick={() => window.print()}
                  className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  <Printer className="w-3.5 h-3.5 text-slate-600" />
                  <span>Print</span>
                </button>
                <button
                  onClick={() => setIsShareModalOpen(true)}
                  className="px-4 py-2 rounded-xl bg-[#0D9488] hover:bg-[#0F766E] text-white text-xs font-extrabold shadow-md flex items-center gap-1.5 transition-colors"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Bagikan Link</span>
                </button>
              </div>
            </div>

            {/* DAY TABS */}
            <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
              {generatedItinerary.map((day) => (
                <button
                  key={day.dayNumber}
                  onClick={() => setActiveDayTab(day.dayNumber)}
                  className={`px-5 py-2 rounded-2xl text-xs font-bold transition-all whitespace-nowrap ${
                    activeDayTab === day.dayNumber
                      ? 'bg-[#0D9488] text-white shadow-md'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  Hari {day.dayNumber}
                </button>
              ))}
            </div>

            {/* ACTIVE DAY TIMELINE SCHEDULER */}
            {generatedItinerary.map(
              (day) =>
                day.dayNumber === activeDayTab && (
                  <div key={day.dayNumber} className="space-y-6">
                    <div className="bg-white rounded-2xl p-4 border border-slate-200 flex items-center justify-between">
                      <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-siger-500" />
                        <span>{day.title}</span>
                      </h3>
                      <span className="text-xs text-slate-500 font-medium">
                        {day.slots.length} Aktivitas Terjadwal
                      </span>
                    </div>

                    {/* Timeline Slots */}
                    <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-2.5 sm:before:left-3.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
                      {day.slots.map((slot, index) => (
                        <div key={index} className="relative group">
                          {/* Timeline Dot */}
                          <div className="absolute -left-6 sm:-left-8 top-4 w-5 h-5 rounded-full bg-white border-2 border-[#0D9488] flex items-center justify-center z-10 shadow-sm group-hover:scale-110 transition-transform">
                            <div className="w-2 h-2 rounded-full bg-[#0D9488]" />
                          </div>

                          {/* Time Slot Card */}
                          <div className="glass-card-container rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all border border-slate-200 p-4 sm:p-5 space-y-3">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                              <div className="flex items-center gap-2">
                                <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-teal-50 text-[#0D9488] border border-teal-200 flex items-center gap-1">
                                  <Clock className="w-3.5 h-3.5" />
                                  <span>{slot.time}</span>
                                </span>
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-900 text-white">
                                  {slot.category}
                                </span>
                              </div>
                              <span className="text-xs font-bold text-[#0D9488]">{slot.estimatedCost}</span>
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
                                <div className="mt-2 bg-amber-50/80 border border-amber-200/80 rounded-xl p-2.5 flex items-start gap-2 text-xs text-amber-900">
                                  <Info className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                                  <span className="text-[11px] font-medium leading-tight">{slot.aiTip}</span>
                                </div>
                              </div>
                            </div>

                            {/* Travel Time Indicator to Next Location */}
                            {slot.travelTime && (
                              <div className="pt-2 border-t border-slate-100 flex items-center gap-1.5 text-[11px] text-slate-500 font-semibold">
                                <Car className="w-3.5 h-3.5 text-[#0D9488]" />
                                <span>{slot.travelTime}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
            )}

            {/* ESTIMATED TOTAL COST BREAKDOWN */}
            <div className="glass-card-container rounded-[24px] p-6 space-y-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-siger-500" />
                <span>Rincian Estimasi Total Pengeluaran Perjalanan</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 text-xs">
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/80 space-y-0.5">
                  <p className="text-[10px] text-slate-400 font-medium">Tiket & Destinasi</p>
                  <p className="text-sm font-bold text-slate-900">
                    Rp {calculateTotalCost().toLocaleString('id-ID')}
                  </p>
                </div>
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/80 space-y-0.5">
                  <p className="text-[10px] text-slate-400 font-medium">Estimasi Transportasi Lokal</p>
                  <p className="text-sm font-bold text-slate-900">Rp 120.000</p>
                </div>
                <div className="bg-teal-50/80 p-3 rounded-2xl border border-teal-200 space-y-0.5">
                  <p className="text-[10px] text-teal-700 font-bold">Total Estimasi Keseluruhan</p>
                  <p className="text-sm font-extrabold text-[#0D9488]">
                    Rp {(calculateTotalCost() + 120000).toLocaleString('id-ID')}
                  </p>
                </div>
              </div>
            </div>

          </div>
        )}

      </div>

      {/* SHARE PUBLIC LINK MODAL */}
      {isShareModalOpen && (
        <div
          className="fixed inset-0 z-50 glass-modal-backdrop flex items-center justify-center p-4"
          onClick={() => setIsShareModalOpen(false)}
        >
          <div
            className="bg-white w-full max-w-md rounded-3xl p-6 space-y-5 shadow-2xl border border-slate-200 relative animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setIsShareModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="space-y-1">
              <div className="w-10 h-10 rounded-2xl bg-teal-100 text-[#0D9488] flex items-center justify-center">
                <Share2 className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold font-display text-slate-900">
                Bagikan Rencana Perjalanan
              </h3>
              <p className="text-xs text-slate-500 font-sans">
                Siapa saja dengan link ini dapat melihat itinerary liburan Lampung buatanmu.
              </p>
            </div>

            <div className="flex items-center gap-2 bg-slate-100 p-2 rounded-2xl border border-slate-200">
              <input
                type="text"
                readOnly
                value={`${window.location.origin}/share/lampung-itinerary-9842`}
                className="w-full bg-transparent text-xs text-slate-700 font-mono focus:outline-none px-2 truncate"
              />
              <button
                onClick={handleCopyShareLink}
                className="px-3 py-1.5 rounded-xl bg-[#0D9488] hover:bg-[#0F766E] text-white text-xs font-bold shrink-0 flex items-center gap-1 transition-all"
              >
                {copiedLink ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Tersalin!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Salin</span>
                  </>
                )}
              </button>
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setIsShareModalOpen(false)}
                className="px-4 py-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
              >
                Selesai
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
