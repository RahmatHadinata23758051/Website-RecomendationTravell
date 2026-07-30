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
    regency: 'Kota Bandar Lampung',
    temp: 30,
    condition: 'Cerah Berawan',
    icon: 'cloud-sun',
    humidity: 72,
    windSpeed: 12,
    uvIndex: 'Tinggi (6)',
    bestSeason: 'Sepanjang Tahun',
    advisory: 'Kondisi hangat & nyaman untuk wisata kuliner, museum sejarah, dan landmark kota.',
    statusColor: 'green',
  },
  {
    regency: 'Kota Metro',
    temp: 29,
    condition: 'Cerah',
    icon: 'sun',
    humidity: 70,
    windSpeed: 10,
    uvIndex: 'Sangat Tinggi (7)',
    bestSeason: 'Sepanjang Tahun',
    advisory: 'Cuaca cerah sangat pas untuk menjelajahi taman kota, eduwisata, dan wisata kuliner.',
    statusColor: 'green',
  },
  {
    regency: 'Kabupaten Pesawaran (Pahawang & Mutun)',
    temp: 29,
    condition: 'Cerah & Laut Tenang',
    icon: 'sun',
    humidity: 68,
    windSpeed: 8,
    uvIndex: 'Tinggi (7)',
    bestSeason: 'Mei - Oktober (Snorkeling & Diving)',
    advisory: 'Visibilitas air laut sangat jernih! Sangat ideal untuk snorkeling, diving & foto bawah laut.',
    statusColor: 'green',
  },
  {
    regency: 'Kabupaten Pesisir Barat (Krui & Tanjung Setia)',
    temp: 28,
    condition: 'Cerah Berangin',
    icon: 'sun',
    humidity: 70,
    windSpeed: 18,
    uvIndex: 'Ekstrem (8)',
    bestSeason: 'Juli - September (Ketinggian Ombak Surfing)',
    advisory: 'Ombak konsisten 2-4 meter! Sangat bagus untuk selancar angin kelas dunia & pantai sunset.',
    statusColor: 'green',
  },
  {
    regency: 'Kabupaten Lampung Selatan (Kalianda & Krakatau)',
    temp: 31,
    condition: 'Cerah Hangat',
    icon: 'sun',
    humidity: 65,
    windSpeed: 11,
    uvIndex: 'Sangat Tinggi (7)',
    bestSeason: 'April - November',
    advisory: 'Cuaca cerah sempurna untuk bersantai di pantai Kalianda & jelajah pulau Bakauheni.',
    statusColor: 'green',
  },
  {
    regency: 'Kabupaten Tanggamus (Teluk Kiluan & Gigi Hiu)',
    temp: 28,
    condition: 'Berawan Cerah',
    icon: 'cloud-sun',
    humidity: 74,
    windSpeed: 14,
    uvIndex: 'Tinggi (6)',
    bestSeason: 'Mei - September (Pengamatan Lumba-lumba)',
    advisory: 'Pagi hari cerah sempurna melihat atraksi Lumba-lumba & lanskap batu tebing Gigi Hiu.',
    statusColor: 'green',
  },
  {
    regency: 'Kabupaten Lampung Timur (TN Way Kambas)',
    temp: 29,
    condition: 'Berawan Sejuk',
    icon: 'cloud-sun',
    humidity: 75,
    windSpeed: 9,
    uvIndex: 'Sedang (5)',
    bestSeason: 'Mei - Oktober',
    advisory: 'Udara sejuk di kawasan konservasi. Waktu terbaik melihat dan berinteraksi bersama satwa gajah.',
    statusColor: 'green',
  },
  {
    regency: 'Kabupaten Lampung Barat (Liwa & Danau Ranau)',
    temp: 24,
    condition: 'Sejuk Berawan',
    icon: 'cloud-sun',
    humidity: 80,
    windSpeed: 7,
    uvIndex: 'Sedang (4)',
    bestSeason: 'April - Oktober (Wisata Kopi & Kebun)',
    advisory: 'Udara pegunungan sangat sejuk! Sangat disukai wisatawan untuk wisata kebun kopi & Danau Ranau.',
    statusColor: 'green',
  },
  {
    regency: 'Kabupaten Pringsewu (Gisting & Talang Indah)',
    temp: 28,
    condition: 'Cerah Berawan',
    icon: 'cloud-sun',
    humidity: 71,
    windSpeed: 10,
    uvIndex: 'Tinggi (6)',
    bestSeason: 'Sepanjang Tahun',
    advisory: 'Cuaca sejuk dan mendukung untuk fotografi selfie perbukitan & wisata agrowisata keluarga.',
    statusColor: 'green',
  },
  {
    regency: 'Kabupaten Lampung Tengah (Gunung Sugih)',
    temp: 31,
    condition: 'Cerah Hangat',
    icon: 'sun',
    humidity: 66,
    windSpeed: 12,
    uvIndex: 'Sangat Tinggi (7)',
    bestSeason: 'Mei - November',
    advisory: 'Cerah hangat. Pas untuk berkunjung ke tugu Kopiah Emas & taman wisata air terdekat.',
    statusColor: 'green',
  },
  {
    regency: 'Kabupaten Lampung Utara (Kotabumi)',
    temp: 30,
    condition: 'Cerah Berawan',
    icon: 'cloud-sun',
    humidity: 73,
    windSpeed: 11,
    uvIndex: 'Tinggi (6)',
    bestSeason: 'Mei - Oktober',
    advisory: 'Debit air di jeram dan curup cukup stabil untuk wisata petualangan outbond sungai.',
    statusColor: 'green',
  },
  {
    regency: 'Kabupaten Way Kanan (Curup Gangsa)',
    temp: 29,
    condition: 'Berawan Cenderung Hujan',
    icon: 'cloud-rain',
    humidity: 78,
    windSpeed: 8,
    uvIndex: 'Sedang (5)',
    bestSeason: 'Juni - September',
    advisory: 'Suasana alami dan sejuk di sekitar air terjun. Disarankan menggunakan alas kaki anti-selip.',
    statusColor: 'amber',
  },
  {
    regency: 'Kabupaten Tulang Bawang (Menggala)',
    temp: 31,
    condition: 'Cerah Terang',
    icon: 'sun',
    humidity: 67,
    windSpeed: 13,
    uvIndex: 'Sangat Tinggi (7)',
    bestSeason: 'Mei - Oktober',
    advisory: 'Kondisi cerah hangat sangat cocok untuk perjalanan sejarah situs Candi dan rawa Menggala.',
    statusColor: 'green',
  },
  {
    regency: 'Kabupaten Tulang Bawang Barat (Tubaba)',
    temp: 30,
    condition: 'Cerah Berawan',
    icon: 'cloud-sun',
    humidity: 69,
    windSpeed: 11,
    uvIndex: 'Tinggi (6)',
    bestSeason: 'Sepanjang Tahun',
    advisory: 'Luar biasa cerah untuk berfoto di lanskap arsitektur modern Islamic Center Tubaba & Las Sengok.',
    statusColor: 'green',
  },
  {
    regency: 'Kabupaten Mesuji (Wiralaga)',
    temp: 31,
    condition: 'Cerah',
    icon: 'sun',
    humidity: 65,
    windSpeed: 14,
    uvIndex: 'Sangat Tinggi (7)',
    bestSeason: 'Mei - November',
    advisory: 'Cuaca pantai dan sungai hangat. Nyaman untuk wisata susur sungai Mesuji & mancing.',
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
