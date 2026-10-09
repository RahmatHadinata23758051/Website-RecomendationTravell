import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
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
import { SafeImage } from '../components/SafeImage';

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
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setLoadError(false);
    setItineraryData(null);

    if (!shareToken) {
      setIsLoading(false);
      setLoadError(true);
      return () => {
        isMounted = false;
      };
    }

    apiClient
      .get(`/itineraries/share/${shareToken}`)
      .then((res) => {
        if (!isMounted) return;
        const data = res.data?.data;
        if (data) {
          setItineraryData(data);
        } else {
          setLoadError(true);
        }
      })
      .catch(() => {
        if (isMounted) setLoadError(true);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [shareToken]);

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

  const parseSharedDays = (raw: any): DaySchedule[] => {
    if (!raw) return [];
    if (Array.isArray(raw.daysJson)) return raw.daysJson;
    if (typeof raw.daysJson === 'string') {
      try {
        const parsed = JSON.parse(raw.daysJson);
        if (Array.isArray(parsed)) return parsed;
      } catch {
        // ignore parse error
      }
    }
    if (Array.isArray(raw.itinerary)) return raw.itinerary;
    return [];
  };

  const sharedDays = parseSharedDays(itineraryData);

  const calculateTotalCost = (days: DaySchedule[]): number => {
    return days.reduce((totalDay, day) => {
      return totalDay + (day.slots || []).reduce((totalSlot, slot) => totalSlot + (slot.numericCost || 0), 0);
    }, 0);
  };

  const handleCloneItinerary = async () => {
    if (!isAuthenticated) {
      triggerToast('Silakan masuk terlebih dahulu untuk menyimpan rute!');
      openAuthModal('login');
      return;
    }

    if (!itineraryData) {
      triggerToast('Data rencana perjalanan tidak ditemukan');
      return;
    }

    try {
      await apiClient.post('/itineraries', {
        title: `Salinan: ${itineraryData.title || 'Rencana Perjalanan'}`,
        daysJson: sharedDays,
      });

      await addXp(50, 'clone_route');
      triggerToast('Rute berhasil disimpan ke profil kamu! (+50 XP 🎉)');
      setTimeout(() => navigate('/profile'), 1200);
    } catch {
      triggerToast('Gagal menyalin itinerary');
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center px-4 pt-24 pb-16">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-[#0D9488]" />
          <p className="text-sm text-slate-500">Memuat rencana perjalanan...</p>
        </div>
      </div>
    );
  }

  if (loadError || !itineraryData) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center px-4 pt-24 pb-16">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
            <Compass className="h-8 w-8 text-slate-400" />
          </div>
          <h1 className="mb-3 text-xl font-bold text-slate-900">
            Rencana perjalanan tidak ditemukan atau tautan telah kedaluwarsa
          </h1>
          <p className="mb-6 text-sm text-slate-500">
            Silakan kembali ke beranda untuk menjelajahi destinasi lainnya.
          </p>
          <button
            onClick={() => navigate('/')}
            className="rounded-full bg-[#0D9488] px-5 py-2.5 text-xs font-bold text-white transition-colors hover:bg-[#0F766E] focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:outline-none"
          >
            Kembali ke Beranda
          </button>
        </div>
      </div>
    );
  }

  const totalCost = calculateTotalCost(sharedDays);

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
              <Share2 className="w-3.5 h-3.5 text-[#0D9488]" />
              <span className="text-[11px] font-semibold text-[#0D9488]">
                Public Travel Plan &bull; ID: {shareToken}
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
              <div className="w-7 h-7 rounded-full bg-[#0D9488] text-white font-bold flex items-center justify-center text-xs shadow-xs">
                {itineraryData?.user?.fullName?.charAt(0) || 'P'}
              </div>
              <span>
                Dibagikan oleh <strong>{itineraryData?.user?.fullName || 'Pengguna'}</strong>
              </span>
            </div>
          </div>

          <h1 className="text-2xl sm:text-3xl font-display font-extrabold text-slate-900 tracking-tight leading-tight">
            {itineraryData?.title || 'Rencana Perjalanan'}
          </h1>

          {/* Quick Badges Row */}
          <div className="flex flex-wrap items-center gap-2.5 pt-2">
            <span className="px-3 py-1 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#0D9488]" />
              <span>{sharedDays.length} Hari</span>
            </span>
            <span className="px-3 py-1 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold">
              Budget: <strong className="text-[#0D9488]">{itineraryData?.budgetLevel || 'Standar'}</strong>
            </span>
            {totalCost > 0 && (
              <span className="px-3 py-1 rounded-xl bg-teal-50 text-[#0D9488] text-xs font-extrabold border border-teal-200">
                Estimasi: Rp {totalCost.toLocaleString('id-ID')} / orang
              </span>
            )}
          </div>

          {/* Public Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-slate-200/80">
            <button
              onClick={handleCloneItinerary}
              className="px-5 py-2.5 rounded-2xl bg-[#0D9488] hover:bg-[#0F766E] text-white text-xs font-extrabold shadow-lg shadow-[#0D9488]/30 flex items-center gap-2 transition-all hover:scale-105"
            >
              <Copy className="w-4 h-4" />
              <span>Simpan ke Planner Saya</span>
            </button>
            <button
              onClick={() => window.print()}
              className="px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-2 transition-colors"
            >
              <Printer className="w-4 h-4 text-slate-600" />
              <span>Cetak Rencana</span>
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
        {sharedDays.length > 0 && (
          <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
            {sharedDays.map((day, dayIdx) => {
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
        )}

        {/* ACTIVE DAY TIMELINE */}
        {sharedDays.map((day, dayIdx) => {
          const dNum = day.dayNumber || (dayIdx + 1);
          if (activeDayTab !== dNum) return null;

          return (
            <div key={dNum} className="space-y-6">
              <div className="bg-white rounded-2xl p-4 border border-slate-200 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 font-display">
                  <Calendar className="w-4 h-4 text-siger-500" />
                  <span>{day.title || `Hari ${dNum}`}</span>
                </h3>
                <span className="text-xs text-slate-500 font-medium">
                  {(day.slots || []).length} Destinasi Terjadwal
                </span>
              </div>

              {/* Slots */}
              <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-2.5 sm:before:left-3.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
                {(day.slots || []).map((slot, slotIdx) => (
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
                        <SafeImage
                          src={slot.image}
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
              Gunakan travel planner kami untuk menyusun rute perjalanan otomatis sesuai budget, minat, dan durasimu.
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
