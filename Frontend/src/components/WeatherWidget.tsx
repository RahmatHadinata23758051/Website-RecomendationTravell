import React, { useState } from 'react';
import {
  Sun,
  CloudSun,
  CloudRain,
  Wind,
  Droplets,
  Thermometer,
  ShieldCheck,
  Compass,
  ChevronDown,
} from 'lucide-react';

export interface RegencyWeather {
  regency: string;
  temp: number;
  condition: string;
  icon: 'sun' | 'cloud-sun' | 'cloud-rain';
  humidity: number;
  windSpeed: number;
  uvIndex: string;
  bestSeason: string;
  advisory: string;
  statusColor: 'green' | 'amber';
}

export const lampungWeatherData: RegencyWeather[] = [
  {
    regency: 'Bandar Lampung',
    temp: 30,
    condition: 'Cerah Berawan',
    icon: 'cloud-sun',
    humidity: 72,
    windSpeed: 12,
    uvIndex: 'Tinggi (6)',
    bestSeason: 'Sepanjang Tahun',
    advisory: 'Kondisi hangat & nyaman untuk wisata kuliner dan sejarah kota.',
    statusColor: 'green',
  },
  {
    regency: 'Pesawaran (Pahawang)',
    temp: 29,
    condition: 'Cerah & Laut Tenang',
    icon: 'sun',
    humidity: 68,
    windSpeed: 8,
    uvIndex: 'Tinggi (7)',
    bestSeason: 'Mei - Oktober (Snorkeling & Diving)',
    advisory: 'Visibilitas air laut sangat jernih! Ideal untuk snorkeling & foto bawah laut.',
    statusColor: 'green',
  },
  {
    regency: 'Pesisir Barat (Kruui)',
    temp: 28,
    condition: 'Cerah Berangin',
    icon: 'sun',
    humidity: 70,
    windSpeed: 18,
    uvIndex: 'Ekstrem (8)',
    bestSeason: 'Juli - September (Ketinggian Ombak Surfing)',
    advisory: 'Ombak konsisten 2-4 meter! Sangat bagus untuk selancar angin & pantai.',
    statusColor: 'green',
  },
  {
    regency: 'Lampung Selatan (Kalianda)',
    temp: 31,
    condition: 'Cerah',
    icon: 'sun',
    humidity: 65,
    windSpeed: 10,
    uvIndex: 'Sangat Tinggi (7)',
    bestSeason: 'April - November',
    advisory: 'Cuaca cerah sempurna untuk bersantai di pantai dan menyeberang pulau.',
    statusColor: 'green',
  },
  {
    regency: 'Lampung Timur (Way Kambas)',
    temp: 29,
    condition: 'Berawan Sejuk',
    icon: 'cloud-sun',
    humidity: 75,
    windSpeed: 9,
    uvIndex: 'Sedang (5)',
    bestSeason: 'Mei - Oktober',
    advisory: 'Udara sejuk di kawasan konservasi. Waktu terbaik melihat satwa gajah.',
    statusColor: 'green',
  },
];

export const WeatherWidget: React.FC = () => {
  const [selectedIndex, setSelectedIndex] = useState<number>(1); // Default Pesawaran (Pahawang)
  const activeWeather = lampungWeatherData[selectedIndex];

  const renderWeatherIcon = (iconType: string) => {
    switch (iconType) {
      case 'sun':
        return <Sun className="w-7 h-7 text-amber-400 animate-spin-slow" />;
      case 'cloud-rain':
        return <CloudRain className="w-7 h-7 text-[#0D9488]" />;
      case 'cloud-sun':
      default:
        return <CloudSun className="w-7 h-7 text-amber-500" />;
    }
  };

  return (
    <div className="glass-card-container rounded-3xl p-5 border border-white/60 shadow-lg bg-gradient-to-br from-white/95 via-teal-50/40 to-amber-50/30 relative overflow-hidden backdrop-blur-md">
      {/* Decorative Blur Ambient */}
      <div className="absolute -top-10 -right-10 w-32 h-32 bg-amber-400/10 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-teal-500/10 rounded-full blur-2xl pointer-events-none" />

      <div className="space-y-4 relative z-10">
        {/* Header & Regency Selector Dropdown */}
        <div className="flex items-center justify-between gap-3 border-b border-slate-200/80 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#0D9488]/10 text-[#0D9488] flex items-center justify-center font-bold">
              <Compass className="w-4.5 h-4.5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-extrabold text-slate-900 font-display">
                  Cuaca & Musim Wisata
                </span>
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              </div>
              <p className="text-[10px] text-slate-500 font-medium">Informasi Cuaca Real-Time Lampung</p>
            </div>
          </div>

          {/* Regency Select */}
          <div className="relative">
            <select
              value={selectedIndex}
              onChange={(e) => setSelectedIndex(Number(e.target.value))}
              className="appearance-none bg-white border border-slate-200/90 hover:border-[#0D9488] text-slate-800 text-xs font-bold py-1.5 pl-3 pr-7 rounded-xl shadow-2xs focus:outline-none cursor-pointer transition-colors"
            >
              {lampungWeatherData.map((w, idx) => (
                <option key={idx} value={idx}>
                  {w.regency}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Main Weather Information Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
          {/* Temperature & Main Icon (4 Cols) */}
          <div className="sm:col-span-5 flex items-center gap-3 bg-white/80 rounded-2xl p-3.5 border border-slate-100 shadow-2xs">
            <div className="p-2.5 rounded-2xl bg-amber-50 border border-amber-200/60 shrink-0">
              {renderWeatherIcon(activeWeather.icon)}
            </div>
            <div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl sm:text-3xl font-black text-slate-900 font-display tracking-tight">
                  {activeWeather.temp}°
                </span>
                <span className="text-xs font-bold text-slate-500">C</span>
              </div>
              <p className="text-xs font-bold text-slate-700 leading-none">{activeWeather.condition}</p>
            </div>
          </div>

          {/* Environmental Indicators (7 Cols) */}
          <div className="sm:col-span-7 grid grid-cols-3 gap-2 text-center">
            <div className="bg-white/80 rounded-xl p-2 border border-slate-100 shadow-2xs">
              <Droplets className="w-3.5 h-3.5 text-[#0D9488] mx-auto mb-0.5" />
              <span className="block text-[10px] text-slate-400 font-medium">Kelembapan</span>
              <span className="text-xs font-extrabold text-slate-800">{activeWeather.humidity}%</span>
            </div>
            <div className="bg-white/80 rounded-xl p-2 border border-slate-100 shadow-2xs">
              <Wind className="w-3.5 h-3.5 text-sky-500 mx-auto mb-0.5" />
              <span className="block text-[10px] text-slate-400 font-medium">Angin</span>
              <span className="text-xs font-extrabold text-slate-800">{activeWeather.windSpeed} km/j</span>
            </div>
            <div className="bg-white/80 rounded-xl p-2 border border-slate-100 shadow-2xs">
              <Thermometer className="w-3.5 h-3.5 text-amber-500 mx-auto mb-0.5" />
              <span className="block text-[10px] text-slate-400 font-medium">Indeks UV</span>
              <span className="text-[11px] font-extrabold text-slate-800 truncate">{activeWeather.uvIndex}</span>
            </div>
          </div>
        </div>

        {/* Travel Advisory & Best Season Banner */}
        <div className="bg-[#0D9488]/10 border border-[#0D9488]/20 rounded-2xl p-3 text-xs space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-[#0D9488] font-bold text-[11px]">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>Rekomendasi Perjalanan AI:</span>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#0D9488] text-white">
              {activeWeather.bestSeason}
            </span>
          </div>
          <p className="text-[#0F766E] text-[11px] font-medium leading-relaxed">
            {activeWeather.advisory}
          </p>
        </div>
      </div>
    </div>
  );
};
