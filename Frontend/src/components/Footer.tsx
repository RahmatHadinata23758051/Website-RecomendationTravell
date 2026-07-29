import React from 'react';
import { MapPin, Mail } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="relative bg-[#0F2937] text-white overflow-hidden">
      {/* Tapis pattern watermark overlay */}
      <img
        src="/assets/images/patterns/lampung-tapis-pattern-transparent.png"
        alt=""
        aria-hidden="true"
        className="absolute top-0 left-0 w-[500px] h-auto opacity-20 pointer-events-none select-none"
      />

      {/* Siger gold accent line at top */}
      <div className="h-[3px] bg-gradient-to-r from-siger-500 via-siger-400 to-siger-500" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <img
              src="/assets/images/logos/siger-gold-icon.png"
              alt="Siger Logo"
              className="h-7 w-auto object-contain"
            />
            <div>
              <span className="text-sm font-display font-extrabold tracking-tight">
                Kelana<span className="text-[#2DD4BF]">Lampung</span>
              </span>
              <p className="text-[10px] text-slate-400 font-sans mt-0.5">
                Platform Pariwisata Cerdas Berbasis AI
              </p>
            </div>
          </div>

          {/* Quick Info */}
          <div className="flex flex-wrap items-center gap-4 text-[10px] text-slate-400">
            <div className="flex items-center gap-1.5">
              <MapPin className="w-3 h-3 text-[#2DD4BF]" />
              <span>Bandar Lampung, Indonesia</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Mail className="w-3 h-3 text-[#2DD4BF]" />
              <span>hello@kelanalampung.id</span>
            </div>
          </div>

          {/* Copyright */}
          <p className="text-[10px] text-slate-500 text-center md:text-right">
            &copy; {new Date().getFullYear()} KelanaLampung. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};
