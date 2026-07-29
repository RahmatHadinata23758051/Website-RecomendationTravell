import React, { useState, useEffect } from 'react';
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
import { RouteMap3D, RouteSlot } from '../components/RouteMap3D';

interface ItinerarySlot extends RouteSlot {
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
  const [selectedSlotIndex, setSelectedSlotIndex] = useState<number | null>(null);

  // Modals & Notifications
  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  const regenciesList = [
    'Kota Bandar Lampung',
    'Pesawaran',
    'Lampung Selatan',
    'Pesisir Barat',
    'Tanggamus',
    'Lampung Timur',
    'Lampung Barat',
    'Way Kanan',
    'Kota Metro',
    'Pringsewu',
    'Tulang Bawang Barat',
    'Lampung Utara',
    'Lampung Tengah',
    'Tulang Bawang',
    'Mesuji',
    'Semua Kabupaten',
  ];

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

  // AI Generator Handler with Real Regency Data & Coordinates
  const handleGenerateItinerary = (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);
    setGeneratedItinerary(null);
    setSelectedSlotIndex(null);

    setTimeout(() => {
      // Build dynamic days based on selected Regency
      let mockResult: DaySchedule[] = [];

      if (selectedRegency === 'Pesawaran') {
        mockResult = [
          {
            dayNumber: 1,
            title: 'Eksplorasi Pulau Pahawang & Snorkeling Bahari Pesawaran',
            slots: [
              {
                time: '08:00 - 09:00 WIB',
                activityTitle: 'Dermaga Ketapang Pesawaran',
                category: 'Adventure',
                location: 'Ketapang, Teluk Pandan, Pesawaran',
                estimatedCost: 'Rp 15.000 / motor',
                numericCost: 15000,
                coords: [-5.5782, 105.2341],
                image: '/assets/images/regencies/pesawaran.jpg',
                aiTip: 'Dermaga utama penyeberangan perahu jelajah ke kepulauan Pahawang & Kelagian.',
                travelTime: '30 menit perahu ke Pulau Pahawang',
              },
              {
                time: '09:30 - 13:00 WIB',
                activityTitle: 'Snorkeling Taman Laut & Pulau Pahawang Besar',
                category: 'Pantai',
                location: 'Pulau Pahawang Besar, Pesawaran',
                estimatedCost: 'Rp 150.000 / orang',
                numericCost: 150000,
                coords: [-5.6743, 105.2198],
                image: '/assets/images/regencies/pesawaran.jpg',
                aiTip: 'Spot foto ikonik bersama Ikan Nemo bawah laut dan terumbu karang alami.',
                travelTime: '20 menit perahu ke Pasir Timbul',
              },
              {
                time: '13:30 - 15:30 WIB',
                activityTitle: 'Pasir Timbul Pulau Pahawang Kecil',
                category: 'Pantai',
                location: 'Pulau Pahawang Kecil, Pesawaran',
                estimatedCost: 'Gratis (Sudah termasuk tur)',
                numericCost: 0,
                coords: [-5.6821, 105.2289],
                image: '/assets/images/regencies/pesawaran.jpg',
                aiTip: 'Hamparan pasir putih melingkar di tengah laut yang hanya muncul saat air surut.',
                travelTime: '35 menit kembali ke daratan',
              },
              {
                time: '16:30 - 18:30 WIB',
                activityTitle: 'Sunset & Kuliner Seafood Pantai Mutun',
                category: 'Kuliner',
                location: 'Pantai Mutun, Pesawaran',
                estimatedCost: 'Rp 45.000 / orang',
                numericCost: 45000,
                coords: [-5.5231, 105.2512],
                image: '/assets/images/regencies/pesawaran.jpg',
                aiTip: 'Bersantai menikmati es kelapa muda dan kelapa bakar manis saat matahari terbenam.',
              },
            ],
          },
          {
            dayNumber: 2,
            title: 'Petualangan Air Terjun & Hutan Tropis Pesawaran',
            slots: [
              {
                time: '08:30 - 11:30 WIB',
                activityTitle: 'Air Terjun Ciupang Pesawaran',
                category: 'Alam',
                location: 'Desa Sumberjaya, Way Ratai, Pesawaran',
                estimatedCost: 'Rp 10.000 / orang',
                numericCost: 10000,
                coords: [-5.5412, 105.1234],
                image: '/assets/images/regencies/pesawaran.jpg',
                aiTip: 'Air terjun unik berundak-undak batu hitam tebal terlindung pepohonan rimbun.',
                travelTime: '40 menit berkendara',
              },
              {
                time: '12:30 - 15:00 WIB',
                activityTitle: 'Pantai Sari Ringgung & Masjid Terapung',
                category: 'Budaya',
                location: 'Sidodadi, Teluk Pandan, Pesawaran',
                estimatedCost: 'Rp 20.000 / orang',
                numericCost: 20000,
                coords: [-5.5567, 105.2412],
                image: '/assets/images/regencies/pesawaran.jpg',
                aiTip: 'Kunjungi Masjid Terapung Al-Amin di tengah laut Sari Ringgung yang estetik.',
              },
            ],
          },
        ];
      } else if (selectedRegency === 'Pesisir Barat') {
        mockResult = [
          {
            dayNumber: 1,
            title: 'Petualangan Ombak Surfing Krui & Wisata Bahari Pesisir Barat',
            slots: [
              {
                time: '08:00 - 11:00 WIB',
                activityTitle: 'Surfing & Santai Pantai Tanjung Setia',
                category: 'Adventure',
                location: 'Tanjung Setia, Pesisir Selatan, Pesisir Barat',
                estimatedCost: 'Rp 25.000 / orang',
                numericCost: 25000,
                coords: [-5.3087, 103.9927],
                image: '/assets/images/regencies/pesisir-barat.jpg',
                aiTip: 'Surga ombak kelas dunia bagi peselancar mancanegara dengan gulungan ombak yang stabil.',
                travelTime: '20 menit berkendara ke Krui pusat',
              },
              {
                time: '11:30 - 14:00 WIB',
                activityTitle: 'Pantai Labuhan Jukung Krui',
                category: 'Pantai',
                location: 'Pesisir Tengah, Kabupaten Pesisir Barat',
                estimatedCost: 'Rp 15.000 / orang',
                numericCost: 15000,
                coords: [-5.1909, 103.9310],
                image: '/assets/images/regencies/pesisir-barat.jpg',
                aiTip: 'Pantai landmark utama Kota Krui dengan fasilitas lengkap & landmark tugu obeliks.',
                travelTime: '15 menit perjalanan makan siang',
              },
              {
                time: '14:30 - 16:00 WIB',
                activityTitle: 'Makan Siang Olahan Ikan Tuhuk (Blue Marlin)',
                category: 'Kuliner',
                location: 'Pusat Kuliner Krui, Pesisir Barat',
                estimatedCost: 'Rp 50.000 / orang',
                numericCost: 50000,
                coords: [-5.1843, 103.9363],
                image: '/assets/images/regencies/pesisir-barat.jpg',
                aiTip: 'Cicipi sate & sup Ikan Tuhuk khas Krui yang teksturnya mirip daging empuk manis.',
                travelTime: '30 menit penyeberangan perahu ke Pulau Pisang',
              },
              {
                time: '16:30 - 18:30 WIB',
                activityTitle: 'Sunset Eksotis Pulau Pisang',
                category: 'Alam',
                location: 'Kecamatan Pulau Pisang, Pesisir Barat',
                estimatedCost: 'Rp 30.000 / orang',
                numericCost: 30000,
                coords: [-5.1123, 103.8741],
                image: '/assets/images/regencies/pesisir-barat.jpg',
                aiTip: 'Pulau terpencil dengan mercusuar tua peninggalan zaman kolonial dan pantai pasir halus.',
              },
            ],
          },
        ];
      } else if (selectedRegency === 'Lampung Selatan') {
        mockResult = [
          {
            dayNumber: 1,
            title: 'Wisata Monumen Ikonik & Pantai Marina Kalianda',
            slots: [
              {
                time: '08:00 - 10:30 WIB',
                activityTitle: 'Menara Siger Bakauheni',
                category: 'Budaya',
                location: 'Bakauheni, Lampung Selatan',
                estimatedCost: 'Rp 15.000 / orang',
                numericCost: 15000,
                coords: [-5.8712, 105.7534],
                image: '/assets/images/regencies/lampung-selatan.jpg',
                aiTip: 'Landmark mahkota mahakarya Lampung di titik Nol Sumatera dengan pemandangan Selat Sunda.',
                travelTime: '30 menit berkendara ke Kalianda',
              },
              {
                time: '11:30 - 15:00 WIB',
                activityTitle: 'Pantai Marina Kalianda',
                category: 'Pantai',
                location: 'Merak Belantung, Kalianda, Lampung Selatan',
                estimatedCost: 'Rp 30.000 / orang',
                numericCost: 30000,
                coords: [-5.6234, 105.5891],
                image: '/assets/images/regencies/lampung-selatan.jpg',
                aiTip: 'Pemandangan tebing batu karang eksotis dengan dentuman ombak laut yang dramatis.',
                travelTime: '20 menit ke Minang Rua',
              },
              {
                time: '15:30 - 18:00 WIB',
                activityTitle: 'Pantai Minang Rua & Green Canyon',
                category: 'Alam',
                location: 'Kawi, Bakauheni, Lampung Selatan',
                estimatedCost: 'Rp 20.000 / orang',
                numericCost: 20000,
                coords: [-5.7912, 105.7123],
                image: '/assets/images/regencies/lampung-selatan.jpg',
                aiTip: 'Jelajahi gua penyu alami dan aliran sungai Green Canyon yang sejuk.',
              },
            ],
          },
        ];
      } else {
        // Default Bandar Lampung / General
        mockResult = [
          {
            dayNumber: 1,
            title: `Eksplorasi Perkotaan & Sunset Puncak ${selectedRegency}`,
            slots: [
              {
                time: '08:30 - 11:00 WIB',
                activityTitle: 'Museum Lampung (Ruwa Jurai)',
                category: 'Budaya',
                location: 'Rajabasa, Bandar Lampung',
                estimatedCost: 'Rp 5.000 / orang',
                numericCost: 5000,
                coords: [-5.3721, 105.2412],
                image: '/assets/images/regencies/bandar-lampung.jpg',
                aiTip: 'Datang pagi hari untuk tur pemandu gratis mengenai sejarah kain Tapis kuno Lampung.',
                travelTime: '20 menit perjalanan ke resto',
              },
              {
                time: '11:30 - 13:30 WIB',
                activityTitle: 'Makan Siang Khas Seruit Tempoyak',
                category: 'Kuliner',
                location: 'Pusat Kota Bandar Lampung',
                estimatedCost: 'Rp 45.000 / orang',
                numericCost: 45000,
                coords: [-5.4212, 105.2612],
                image: '/assets/images/regencies/bandar-lampung.jpg',
                aiTip: 'Nikmati olahan ikan segar dengan sambal tempoyak durian khas Lampung yang menggugah selera.',
                travelTime: '25 menit ke bukit puncak',
              },
              {
                time: '14:30 - 18:00 WIB',
                activityTitle: 'Puncak Mas & Panorama Teluk Lampung',
                category: 'Alam',
                location: 'Sukadanaham, Bandar Lampung',
                estimatedCost: 'Rp 20.000 / orang',
                numericCost: 20000,
                coords: [-5.4312, 105.2212],
                image: '/assets/images/regencies/bandar-lampung.jpg',
                aiTip: 'Lokasi terbaik untuk menikmati lanskap pemandangan Teluk Lampung dari ketinggian.',
              },
            ],
          },
          {
            dayNumber: 2,
            title: 'Wisata Edukasi & Pusat Souvenir Khas Lampung',
            slots: [
              {
                time: '09:00 - 12:00 WIB',
                activityTitle: 'Taman Wisata Lembah Hijau',
                category: 'Alam',
                location: 'Tanjung Karang Barat, Bandar Lampung',
                estimatedCost: 'Rp 35.000 / orang',
                numericCost: 35000,
                coords: [-5.4123, 105.2341],
                image: '/assets/images/regencies/bandar-lampung.jpg',
                aiTip: 'Taman rekreasi hijau keluarga dengan fasilitas waterboom & taman satwa.',
                travelTime: '20 menit ke pusat oleh-oleh',
              },
              {
                time: '13:00 - 16:00 WIB',
                activityTitle: 'Belanja Souvenir Tapis & Kripik Pisang Yen Yen',
                category: 'Budaya',
                location: 'Teluk Betung, Bandar Lampung',
                estimatedCost: 'Rp 100.000 / estimasi',
                numericCost: 100000,
                coords: [-5.4412, 105.2567],
                image: '/assets/images/regencies/bandar-lampung.jpg',
                aiTip: 'Dapatkan Keripik Pisang Cokelat murni dan kain Tapis sulam asli Lampung.',
              },
            ],
          },
        ];
      }

      setGeneratedItinerary(mockResult.slice(0, durationDays));
      setIsGenerating(false);
      setActiveDayTab(1);
      triggerToast(`Itinerary AI ${selectedRegency} Berhasil Dibuat!`);
    }, 1600);
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

  // Get active day slots
  const activeDaySlots =
    generatedItinerary?.find((day) => day.dayNumber === activeDayTab)?.slots || [];

  const mascotMessages = [
    'Tabik Pun! 🐘 Mau liburan seru di Lampung? Pilih Kabupaten impianmu di bawah yuk!',
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
        {/* Gradient overlays for contrast & smooth transition */}
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
                  Pilih Kabupaten/Kota impianmu di Lampung, lalu biarkan AI menyusun rute peta spasial 3D & jadwal perjalanan harian dari jam ke jam secara akurat!
                </p>
              </div>

              {/* Right Column: Muli Lampung Mascot with Animated Chat Bubble */}
              <div className="lg:col-span-5 flex items-center justify-center lg:justify-end gap-3 pt-2 lg:pt-0">
                {/* Speech Bubble */}
                <div className="relative bg-white/95 border border-teal-200 rounded-2xl p-4 shadow-xl max-w-xs transition-all duration-300">
                  <p className="text-xs font-semibold text-slate-800 leading-relaxed font-sans min-h-[36px] flex items-center">
                    {mascotMessages[mascotMsgIndex]}
                  </p>
                  {/* Tail pointing right to Mascot */}
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
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-[#0D9488]"
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
                <span>Durasi Perjalanan</span>
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {[1, 2, 3].map((days) => (
                  <button
                    key={days}
                    type="button"
                    onClick={() => setDurationDays(days)}
                    className={`py-2 px-2 rounded-2xl text-xs font-bold transition-all border ${
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

            {/* 3. BUDGET TIER */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-siger-500" />
                <span>Estimasi Budget</span>
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {(['Ekonomis', 'Standar', 'Mewah'] as const).map((tier) => (
                  <button
                    key={tier}
                    type="button"
                    onClick={() => setBudgetTier(tier)}
                    className={`py-2 px-1 rounded-2xl text-[11px] font-bold transition-all border ${
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

            {/* 4. TRIP TYPE */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-[#0D9488]" />
                <span>Rombongan</span>
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {(['Solo', 'Pasangan', 'Keluarga', 'Teman'] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setTripType(type)}
                    className={`py-1.5 px-1 rounded-xl text-[10px] font-bold transition-all border text-center ${
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

            {/* 5. SUBMIT BUTTON */}
            <div className="flex items-end">
              <button
                type="submit"
                disabled={isGenerating}
                className="w-full py-3 rounded-2xl bg-[#0D9488] hover:bg-[#0F766E] text-white text-xs font-extrabold shadow-lg shadow-[#0D9488]/30 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-60"
              >
                {isGenerating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Menyusun Rute...</span>
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
              <h3 className="text-base font-bold text-slate-900">
                AI Raden Gajah Sedang Menyusun Rute {selectedRegency}...
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Menganalisis koordinat peta 3D, estimasi rute perjalanan, dan tempat wisata paling populer di {selectedRegency}.
              </p>
            </div>
          </div>
        )}

        {/* ITINERARY RESULT DISPLAY (2-COLUMN SPLIT VIEW) */}
        {generatedItinerary && !isGenerating && (
          <div className="space-y-6 animate-in fade-in duration-300">
            
            {/* ITINERARY HEADER & ACTION BAR */}
            <div className="glass-card-container rounded-[24px] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-[#0D9488] text-white">
                    {selectedRegency} &bull; {durationDays} Hari
                  </span>
                  <span className="text-xs font-bold text-slate-600">
                    Budget: <span className="text-[#0D9488]">{budgetTier}</span>
                  </span>
                </div>
                <h2 className="text-xl font-display font-extrabold text-slate-900">
                  Rencana Perjalanan & Rute Spasial 3D
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
                  onClick={() => {
                    setActiveDayTab(day.dayNumber);
                    setSelectedSlotIndex(null);
                  }}
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

            {/* 2-COLUMN LAYOUT: TIMELINE SCHEDULE (LEFT) & 3D ROUTE MAP (RIGHT) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* LEFT COLUMN: ACTIVE DAY TIMELINE SCHEDULER (COL-SPAN-7) */}
              <div className="lg:col-span-7 space-y-6">
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
                          {day.slots.map((slot, index) => {
                            const isSlotSelected = selectedSlotIndex === index;

                            return (
                              <div
                                key={index}
                                onClick={() => setSelectedSlotIndex(index)}
                                className="relative group cursor-pointer"
                              >
                                {/* Timeline Dot & Waypoint Badge Number */}
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
                                      {slot.aiTip && (
                                        <div className="mt-2 bg-amber-50/80 border border-amber-200/80 rounded-xl p-2.5 flex items-start gap-2 text-xs text-amber-900">
                                          <Info className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                                          <span className="text-[11px] font-medium leading-tight">{slot.aiTip}</span>
                                        </div>
                                      )}
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
                            );
                          })}
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

              {/* RIGHT COLUMN: 3D TILTED ROUTE MAP (COL-SPAN-5) */}
              <div className="lg:col-span-5 lg:sticky lg:top-28">
                <RouteMap3D
                  slots={activeDaySlots}
                  selectedSlotIndex={selectedSlotIndex}
                  onSelectSlot={(idx) => setSelectedSlotIndex(idx)}
                  regencyName={selectedRegency}
                />
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
