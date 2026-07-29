import React from 'react';
import { ShieldCheck, MapPin, Compass, Headphones } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="relative bg-white border-t border-slate-200/80 overflow-hidden">
      {/* Background Watermark Pattern */}
      <div
        className="absolute inset-0 opacity-5 pointer-events-none bg-repeat bg-center"
        style={{ backgroundImage: 'url(/assets/images/patterns/lampung-tapis-pattern.png)' }}
      />

      {/* Feature Highlights Bar */}
      <div className="border-b border-slate-100 bg-slate-50/50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary-50 text-primary-600 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900">Rekomendasi AI Cerdas</h4>
              <p className="text-[11px] text-slate-500">Hasil personal presisi tinggi berbasis ML Engine</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary-50 text-primary-600 flex items-center justify-center shrink-0">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900">Informasi Terpercaya</h4>
              <p className="text-[11px] text-slate-500">Data destinasi terverifikasi 100% lokal Lampung</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary-50 text-primary-600 flex items-center justify-center shrink-0">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900">Panduan Lengkap</h4>
              <p className="text-[11px] text-slate-500">Time-slotted itinerary & estimasi waktu tempuh</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary-50 text-primary-600 flex items-center justify-center shrink-0">
              <Headphones className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900">Asisten 24/7</h4>
              <p className="text-[11px] text-slate-500">Raden Gajah Virtual AI Concierge siap membantu</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Links */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <img
              src="/assets/images/logos/siger-gold-icon.png"
              alt="Siger Gold Logo"
              className="h-8 w-auto object-contain"
            />
            <span className="text-lg font-display font-extrabold text-slate-900">
              Kelana<span className="text-primary-600">Lampung</span>
            </span>
          </div>

          <p className="text-xs text-slate-500 text-center md:text-right">
            &copy; {new Date().getFullYear()} KelanaLampung. Seluruh hak cipta dilindungi undang-undang.
            <br />
            Platform Pariwisata Cerdas Berbasis AI untuk Provinsi Lampung.
          </p>
        </div>
      </div>
    </footer>
  );
};
