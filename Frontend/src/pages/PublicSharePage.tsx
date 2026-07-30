import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Sparkles,
  Calendar,
  Clock,
  MapPin,
  Share2,
  Printer,
  Copy,
  CheckCircle2,
  ExternalLink,
  Info,
  Car,
  Compass,
  ArrowRight,
  Check,
} from 'lucide-react';

import { apiClient } from '../lib/api';
import { useAuth } from '../context/AuthContext';

interface ItinerarySlot {
  time: string;
  activityTitle?: string;
  title?: string;
  name?: string;
  category?: 'Pantai' | 'Alam' | 'Budaya' | 'Kuliner' | 'Adventure';
  location?: string;
  estimatedCost?: string;
  estimated_cost?: string;
  numericCost?: number;
  image?: string;
  coords?: [number, number];
  aiTip?: string;
  description?: string;
  travelTime?: string;
}

interface DaySchedule {
  dayNumber?: number;
  day?: number;
  title: string;
  slots: ItinerarySlot[];
}

export const PublicSharePage: React.FC = () => {
  const { shareToken } = useParams<{ shareToken: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, openAuthModal, addXp } = useAuth();
  const [activeDayTab, setActiveDayTab] = useState<number>(1);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [itineraryData, setItineraryData] = useState<any | null>(null);

  useEffect(() => {
    if (shareToken) {
      apiClient
        .get(`/itineraries/share/${shareToken}`)
        .then((res) => {
          if (res.data?.data) {
            setItineraryData(res.data.data);
          }
        })
        .catch(() => {
          // Fallback mock
        });
    }
  }, [shareToken]);

  const mockPublicItinerary: DaySchedule[] = [
    {
      dayNumber: 1,
      title: 'Eksplorasi Kebudayaan & Sunset Kota Bandar Lampung',
      slots: [
        {
          time: '08:00 - 10:30 WIB',
          activityTitle: 'Museum Lampung (Ruwa Jurai)',
          category: 'Budaya',
          location: 'Rajabasa, Bandar Lampung',
          estimatedCost: 'Rp 5.000 / orang',
          numericCost: 5000,
          image: 'https://images.unsplash.com/photo-1566127444979-b3d2b654e3d7?auto=format&fit=crop&w=800&q=80',
          coords: [-5.3789, 105.2536],
          aiTip: 'Pelajari sejarah kain Tapis kuno dan arsitektur panggung khas Lampung.',
          travelTime: '20 menit perjalanan ke lokasi kuliner',
        },
        {
          time: '11:30 - 13:00 WIB',
          activityTitle: 'Makan Siang Kuliner Seruit Khas Lampung',
          category: 'Kuliner',
          location: 'Pusat Kota Bandar Lampung',
          estimatedCost: 'Rp 45.000 / orang',
          numericCost: 45000,
          image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80',
          coords: [-5.4292, 105.2611],
          aiTip: 'Cobalah kombinasi ikan bakar dengan sambal terasi dan tempoyak durian khas Lampung.',
          travelTime: '35 menit ke lokasi puncak',
        },
        {
          time: '15:00 - 18:00 WIB',
          activityTitle: 'Menikmati Sunset Puncak Mas Lampung',
          category: 'Alam',
          location: 'Sukadanaham, Bandar Lampung',
          estimatedCost: 'Rp 20.000 / orang',
          numericCost: 20000,
          image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80',
          coords: [-5.4292, 105.2611],
          aiTip: 'Spot foto terbaik menikmati pemandangan Teluk Lampung dari ketinggian.',
        },
      ],
    },
    {
      dayNumber: 2,
      title: 'Island Hopping & Snorkeling Pulau Pahawang',
      slots: [
        {
          time: '07:30 - 08:30 WIB',
          activityTitle: 'Perjalanan ke Dermaga Ketapang Pesawaran',
          category: 'Adventure',
          location: 'Pesawaran, Lampung',
          estimatedCost: 'Rp 15.000 (Transportasi)',
          numericCost: 15000,
          image: '/assets/images/heroes/hero-pahawang-bg.png',
          coords: [-5.6708, 105.2192],
          aiTip: 'Pastikan menggunakan pakaian santai pantai dan sarung pelindung HP waterproof.',
          travelTime: '45 menit menyeberang laut',
        },
        {
          time: '09:00 - 14:00 WIB',
          activityTitle: 'Snorkeling & Wisata Bahari Pulau Pahawang',
          category: 'Pantai',
          location: 'Pesawaran',
          estimatedCost: 'Rp 150.000 / orang (Tur Perahu)',
          numericCost: 150000,
          image: '/assets/images/heroes/hero-pahawang-bg.png',
          coords: [-5.6708, 105.2192],
          aiTip: 'Nikmati foto bawah laut bersama kawanan Ikan Nemo dan terumbu karang alami.',
          travelTime: '30 menit kembali ke pantai',
        },
        {
          time: '16:00 - 18:30 WIB',
          activityTitle: 'Santai Sore di Pantai Mutun',
          category: 'Pantai',
          location: 'Pesawaran',
          estimatedCost: 'Rp 10.000 / orang',
          numericCost: 10000,
          image: 'https://images.unsplash.com/photo-1502680390469-be75c86b636f?auto=format&fit=crop&w=800&q=80',
          coords: [-5.5123, 105.2412],
          aiTip: 'Nikmati kelapa muda segar dan suasana matahari terbenam tepi pantai.',
        },
      ],
    },
    {
      dayNumber: 3,
      title: 'Eksplorasi Satwa Way Kambas & Belanja Souvenir',
      slots: [
        {
          time: '08:30 - 12:00 WIB',
          activityTitle: 'Pusat Konservasi Gajah Taman Nasional Way Kambas',
          category: 'Alam',
          location: 'Lampung Timur',
          estimatedCost: 'Rp 25.000 / orang',
          numericCost: 25000,
          image: 'https://images.unsplash.com/photo-1534567153574-2b12153a87f0?auto=format&fit=crop&w=800&q=80',
          coords: [-5.0833, 105.7500],
          aiTip: 'Edukasi dan interaksi langsung bersama Gajah Sumatera yang dilindungi.',
          travelTime: '1 jam kembali ke kota',
        },
        {
          time: '13:30 - 16:00 WIB',
          activityTitle: 'Pusat Oleh-Oleh Kerajinan Tapis & Kripik Pisang',
          category: 'Budaya',
          location: 'Pusat Kota Bandar Lampung',
          estimatedCost: 'Rp 100.000 (Oleh-oleh)',
          numericCost: 100000,
          image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80',
          coords: [-5.4292, 105.2611],
          aiTip: 'Beli kripik pisang cokelat murni dan produk kerajinan kain Tapis khas Lampung.',
        },
      ],
    },
  ];

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    triggerToast('Link publik berhasil disalin!');
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleCloneItinerary = async () => {
    if (!isAuthenticated) {
      triggerToast('Silakan masuk terlebih dahulu untuk menyimpan rute!');
      openAuthModal('login');
      return;
    }

    try {
      const targetItinerary = itineraryData || {
        title: 'Liburan Lampung (3 Hari)',
        daysJson: mockPublicItinerary,
      };

      await apiClient.post('/itineraries', {
        title: `Salinan: ${targetItinerary.title}`,
        daysJson: targetItinerary.daysJson || mockPublicItinerary,
      });

      await addXp(50, 'clone_route');
      triggerToast('Rute berhasil disimpan ke profil kamu! (+50 XP 🎉)');
      setTimeout(() => navigate('/profile'), 1200);
    } catch (err: any) {
      triggerToast('Gagal menyalin itinerary');
    }
  };

  const calculateTotalCost = () => {
    return mockPublicItinerary.reduce((totalDay, day) => {
      return totalDay + day.slots.reduce((totalSlot, slot) => totalSlot + (slot.numericCost || 0), 0);
    }, 0);
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
      <div className="max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 space-y-8">

        {/* HERO PUBLIC SHARE BANNER */}
        <div className="glass-card-container rounded-[28px] p-6 sm:p-8 space-y-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-72 h-full bg-gradient-to-l from-teal-500/10 to-transparent pointer-events-none" />
          
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-teal-50 border border-teal-200">
              <Sparkles className="w-3.5 h-3.5 text-[#0D9488]" />
              <span className="text-[11px] font-semibold text-[#0D9488]">
                Public Travel Plan &bull; ID: {shareToken || 'lampung-itinerary-9842'}
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
              <div className="w-7 h-7 rounded-full bg-[#0D9488] text-white font-bold flex items-center justify-center text-xs shadow-xs">
                {itineraryData?.user?.fullName?.charAt(0) || 'P'}
              </div>
              <span>
                Dibagikan oleh <strong>{itineraryData?.user?.fullName || 'Penjelajah Kelana'}</strong>
              </span>
            </div>
          </div>

          <h1 className="text-2xl sm:text-3xl font-display font-extrabold text-slate-900 tracking-tight leading-tight">
            {itineraryData?.title || 'Rencana Perjalanan Wisata Eksotis Lampung'}
          </h1>

          {/* Quick Badges Row */}
          <div className="flex flex-wrap items-center gap-2.5 pt-2">
            <span className="px-3 py-1 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#0D9488]" />
              <span>3 Hari 2 Malam</span>
            </span>
            <span className="px-3 py-1 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold">
              Budget: <strong className="text-[#0D9488]">Standar</strong>
            </span>
            <span className="px-3 py-1 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold">
              Rombongan: <strong className="text-[#0D9488]">Pasangan</strong>
            </span>
            <span className="px-3 py-1 rounded-xl bg-teal-50 text-[#0D9488] text-xs font-extrabold border border-teal-200">
              Estimasi: Rp {(calculateTotalCost() + 120000).toLocaleString('id-ID')} / orang
            </span>
          </div>

          {/* Public Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-slate-200/80">
            <button
              onClick={handleCloneItinerary}
              className="px-5 py-2.5 rounded-2xl bg-[#0D9488] hover:bg-[#0F766E] text-white text-xs font-extrabold shadow-lg shadow-[#0D9488]/30 flex items-center gap-2 transition-all hover:scale-105"
            >
              <Copy className="w-4 h-4" />
              <span>Salin ke AI Planner Saya</span>
            </button>
            <button
              onClick={() => window.print()}
              className="px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-2 transition-colors"
            >
              <Printer className="w-4 h-4 text-slate-600" />
              <span>Print Itinerary</span>
            </button>
            <button
              onClick={handleCopyLink}
              className="px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-2 transition-colors"
            >
              {copiedLink ? (
                <>
                  <Check className="w-4 h-4 text-[#0D9488]" />
                  <span>Link Tersalin!</span>
                </>
              ) : (
                <>
                  <Share2 className="w-4 h-4 text-slate-600" />
                  <span>Salin Link Publik</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* DAY NAVIGATION TABS */}
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
          {mockPublicItinerary.map((day, dayIdx) => {
            const dNum = day.dayNumber || (dayIdx + 1);
            return (
              <button
                key={dNum}
                onClick={() => setActiveDayTab(dNum)}
                className={`px-5 py-2.5 rounded-2xl text-xs font-bold transition-all whitespace-nowrap ${
                  activeDayTab === dNum
                    ? 'bg-[#0D9488] text-white shadow-md'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                Hari {dNum}
              </button>
            );
          })}
        </div>

        {/* ACTIVE DAY TIMELINE */}
        {mockPublicItinerary.map((day, dayIdx) => {
          const dNum = day.dayNumber || (dayIdx + 1);
          if (activeDayTab !== dNum) return null;

          return (
            <div key={dNum} className="space-y-6">
              <div className="bg-white rounded-2xl p-4 border border-slate-200 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 font-display">
                  <Calendar className="w-4 h-4 text-siger-500" />
                  <span>{day.title}</span>
                </h3>
                <span className="text-xs text-slate-500 font-medium">
                  {day.slots.length} Destinasi Terjadwal
                </span>
              </div>

              {/* Slots */}
              <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-2.5 sm:before:left-3.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
                {day.slots.map((slot, slotIdx) => (
                  <div key={slotIdx} className="relative group">
                    {/* Timeline Dot */}
                    <div className="absolute -left-6 sm:-left-8 top-4 w-5 h-5 rounded-full bg-white border-2 border-[#0D9488] flex items-center justify-center z-10 shadow-sm">
                      <div className="w-2 h-2 rounded-full bg-[#0D9488]" />
                    </div>

                    {/* Card Content */}
                    <div className="glass-card-container rounded-2xl overflow-hidden shadow-sm border border-slate-200 p-4 sm:p-5 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                        <div className="flex items-center gap-2">
                          <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-teal-50 text-[#0D9488] border border-teal-200 flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            <span>{slot.time}</span>
                          </span>
                          {slot.category && (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-900 text-white">
                              {slot.category}
                            </span>
                          )}
                        </div>
                        <span className="text-xs font-bold text-[#0D9488]">
                          {slot.estimatedCost || slot.estimated_cost || 'Gratis'}
                        </span>
                      </div>

                      {/* Main Item Info */}
                      <div className="flex flex-col sm:flex-row items-start gap-4">
                        <img
                          src={slot.image || '/assets/images/heroes/hero-pahawang-bg.png'}
                          alt={slot.activityTitle || slot.title || 'Destinasi'}
                          className="w-full sm:w-28 h-24 rounded-xl object-cover shrink-0 shadow-sm"
                        />
                        <div className="space-y-1 flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="text-sm font-bold text-slate-900 font-display">
                              {slot.activityTitle || slot.title || slot.name}
                            </h4>
                            {slot.coords && (
                              <a
                                href={`https://www.google.com/maps/search/?api=1&query=${slot.coords[0]},${slot.coords[1]}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-[#0D9488] text-slate-600 hover:text-white text-[10px] font-bold transition-all flex items-center gap-1 shrink-0"
                              >
                                <span>Maps</span>
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </div>

                          {slot.location && (
                            <p className="text-xs text-slate-500 font-sans flex items-center gap-1 truncate">
                              <MapPin className="w-3.5 h-3.5 text-[#0D9488] shrink-0" />
                              <span>{slot.location}</span>
                            </p>
                          )}

                          {(slot.aiTip || slot.description) && (
                            <div className="mt-2 bg-amber-50/80 border border-amber-200/80 rounded-xl p-2.5 flex items-start gap-2 text-xs text-amber-900">
                              <Info className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                              <span className="text-[11px] font-medium leading-tight">
                                {slot.aiTip || slot.description}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Travel Time */}
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
          );
        })}

        {/* BOTTOM CTA BANNER FOR NEW VISITORS */}
        <div className="glass-card-container rounded-[28px] p-6 sm:p-8 text-center space-y-4 bg-gradient-to-r from-teal-900 to-slate-900 text-white relative overflow-hidden">
          <div className="space-y-2 max-w-xl mx-auto">
            <div className="w-12 h-12 rounded-2xl bg-white/10 text-amber-400 flex items-center justify-center mx-auto border border-white/20">
              <Compass className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-display font-extrabold">
              Ingin Buat Rencana Perjalanan Impianmu di Lampung?
            </h3>
            <p className="text-xs text-slate-300 font-sans leading-relaxed">
              Gunakan engine kecerdasan buatan AI Raden Gajah untuk menyusun rute perjalanan otomatis sesuai budget, minat, dan durasimu.
            </p>
          </div>

          <Link
            to="/planner"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#0D9488] hover:bg-[#0F766E] text-white text-xs font-extrabold shadow-lg transition-all hover:scale-105"
          >
            <span>Mulai Rencanakan Sekarang</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

      </div>
    </div>
  );
};
