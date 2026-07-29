import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="relative bg-white border-t border-slate-200/80 overflow-hidden">
      {/* Background Watermark Pattern */}
      <div
        className="absolute inset-0 opacity-5 pointer-events-none bg-repeat bg-center"
        style={{ backgroundImage: 'url(/assets/images/patterns/lampung-tapis-pattern.png)' }}
      />

      {/* Main Footer Links */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <img
              src="/assets/images/logos/siger-gold-icon.png"
              alt="Siger Gold Logo"
              className="h-8 w-auto object-contain"
            />
            <span className="text-lg font-display font-extrabold text-slate-900">
              Kelana<span className="text-[#0D9488]">Lampung</span>
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
