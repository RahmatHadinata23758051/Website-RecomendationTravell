import React, { useState, useEffect } from 'react';
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
  RefreshCw,
} from 'lucide-react';

export interface RegencyInfo {
  regency: string;
  lat: number;
  lng: number;
  bestSeason: string;
  defaultAdvisory: string;
}

export const lampungRegencies: RegencyInfo[] = [
  {
    regency: 'Kota Bandar Lampung',
    lat: -5.4129,
    lng: 105.2589,
    bestSeason: 'Sepanjang Tahun',
    defaultAdvisory: 'Kondisi nyaman untuk wisata kuliner, museum sejarah, dan landmark kota.',
  },
  {
    regency: 'Kota Metro',
    lat: -5.1266,
    lng: 105.3099,
    bestSeason: 'Sepanjang Tahun',
    defaultAdvisory: 'Sangat pas untuk menjelajahi taman kota, eduwisata, dan wisata kuliner.',
  },
  {
    regency: 'Kabupaten Pesawaran (Pahawang & Mutun)',
    lat: -5.5248,
    lng: 105.1500,
    bestSeason: 'Mei - Oktober (Snorkeling & Diving)',
    defaultAdvisory: 'Visibilitas air laut sangat jernih! Sangat ideal untuk snorkeling & foto bawah laut.',
  },
  {
    regency: 'Kabupaten Pesisir Barat (Krui & Tanjung Setia)',
    lat: -5.2130,
    lng: 103.9573,
    bestSeason: 'Juli - September (Ketinggian Ombak Surfing)',
    defaultAdvisory: 'Ombak konsisten 2-4 meter! Sangat bagus untuk selancar angin kelas dunia & pantai sunset.',
  },
  {
    regency: 'Kabupaten Lampung Selatan (Kalianda & Krakatau)',
    lat: -5.6503,
    lng: 105.5189,
    bestSeason: 'April - November',
    defaultAdvisory: 'Sempurna untuk bersantai di pantai Kalianda & jelajah pulau Bakauheni.',
  },
  {
    regency: 'Kabupaten Tanggamus (Teluk Kiluan & Gigi Hiu)',
    lat: -5.4680,
    lng: 104.6855,
    bestSeason: 'Mei - September (Pengamatan Lumba-lumba)',
    defaultAdvisory: 'Pagi hari cerah sempurna melihat atraksi Lumba-lumba & lanskap tebing Gigi Hiu.',
  },
  {
    regency: 'Kabupaten Lampung Timur (TN Way Kambas)',
    lat: -5.2053,
    lng: 105.6165,
    bestSeason: 'Mei - Oktober',
    defaultAdvisory: 'Udara sejuk di kawasan konservasi. Waktu terbaik melihat satwa gajah.',
  },
  {
    regency: 'Kabupaten Lampung Barat (Liwa & Danau Ranau)',
    lat: -5.0820,
    lng: 104.2164,
    bestSeason: 'April - Oktober (Wisata Kopi & Kebun)',
    defaultAdvisory: 'Udara pegunungan sangat sejuk! Sangat disukai wisatawan untuk wisata kebun kopi & Danau Ranau.',
  },
  {
    regency: 'Kabupaten Pringsewu (Gisting & Talang Indah)',
    lat: -5.3761,
    lng: 104.9670,
    bestSeason: 'Sepanjang Tahun',
    defaultAdvisory: 'Mendukung untuk fotografi selfie perbukitan & wisata agrowisata keluarga.',
  },
  {
    regency: 'Kabupaten Lampung Tengah (Gunung Sugih)',
    lat: -4.8840,
    lng: 105.2429,
    bestSeason: 'Mei - November',
    defaultAdvisory: 'Pas untuk berkunjung ke tugu Kopiah Emas & taman wisata air terdekat.',
  },
  {
    regency: 'Kabupaten Lampung Utara (Kotabumi)',
    lat: -4.8609,
    lng: 104.7337,
    bestSeason: 'Mei - Oktober',
    defaultAdvisory: 'Debit air di jeram dan curup cukup stabil untuk wisata petualangan outbond sungai.',
  },
  {
    regency: 'Kabupaten Way Kanan (Curup Gangsa)',
    lat: -4.5776,
    lng: 104.5609,
    bestSeason: 'Juni - September',
    defaultAdvisory: 'Suasana alami dan sejuk di sekitar air terjun. Disarankan menggunakan alas kaki anti-selip.',
  },
  {
    regency: 'Kabupaten Tulang Bawang (Menggala)',
    lat: -4.3516,
    lng: 105.4805,
    bestSeason: 'Mei - Oktober',
    defaultAdvisory: 'Sangat cocok untuk perjalanan sejarah situs Candi dan rawa Menggala.',
  },
  {
    regency: 'Kabupaten Tulang Bawang Barat (Tubaba)',
    lat: -4.4540,
    lng: 105.0930,
    bestSeason: 'Sepanjang Tahun',
    defaultAdvisory: 'Luar biasa untuk berfoto di lanskap arsitektur modern Islamic Center Tubaba & Las Sengok.',
  },
  {
    regency: 'Kabupaten Mesuji (Wiralaga)',
    lat: -4.0312,
    lng: 105.3776,
    bestSeason: 'Mei - November',
    defaultAdvisory: 'Cuaca pantai dan sungai hangat. Nyaman untuk wisata susur sungai Mesuji & mancing.',
  },
];

interface LiveWeatherData {
  temp: number;
  condition: string;
  icon: 'sun' | 'cloud-sun' | 'cloud-rain';
  humidity: number;
  windSpeed: number;
  uvIndex: string;
  advisory: string;
}

export const WeatherWidget: React.FC = () => {
  const [selectedIndex, setSelectedIndex] = useState<number>(2); // Default Pesawaran (Pahawang)
  const activeRegency = lampungRegencies[selectedIndex];
  const [weatherData, setWeatherData] = useState<LiveWeatherData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const parseWmoCode = (code: number, temp: number): { condition: string; icon: 'sun' | 'cloud-sun' | 'cloud-rain' } => {
    if (code === 0) return { condition: 'Cerah ☀️', icon: 'sun' };
    if ([1, 2, 3].includes(code)) return { condition: 'Cerah Berawan 🌤️', icon: 'cloud-sun' };
    if ([45, 48].includes(code)) return { condition: 'Berembun / Kabut 🌫️', icon: 'cloud-sun' };
    if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) return { condition: 'Hujan Gerimis / Hujan 🌧️', icon: 'cloud-rain' };
    if ([95, 96, 99].includes(code)) return { condition: 'Hujan Petir 🌩️', icon: 'cloud-rain' };
    return { condition: temp > 28 ? 'Cerah ☀️' : 'Berawan 🌤️', icon: 'cloud-sun' };
  };

  const generateDynamicAdvisory = (
    temp: number,
    humidity: number,
    windSpeed: number,
    uv: number,
    wmoIcon: string,
    wmoCondition: string,
    regencyName: string,
    defaultAdvisory: string
  ): string => {
    // 1. Hujan / Hujan Petir
    if (wmoIcon === 'cloud-rain') {
      return `🌧️ Terdeteksi ${wmoCondition} di ${regencyName} (${temp}°C, Kelembapan ${humidity}%). Hati-hati jalanan licin & visibilitas terbatas. Disarankan mengutamakan wisata indoor (museum, pusat oleh-oleh, cafe) serta membawa jas hujan/payung.`;
    }

    // 2. Cuaca Terik / UV Ekstrem
    if (temp >= 32 || uv >= 8) {
      return `☀️ Terik Matahari & UV Tinggi (${temp}°C, Indeks UV ${uv}). Terik matahari menyengat di ${regencyName}. Disarankan memakai sunscreen SPF 30+, kacamata hitam, topi, & menjaga hidrasi air minum.`;
    }

    // 3. Angin Kencang
    if (windSpeed >= 15) {
      if (regencyName.includes('Pesisir Barat')) {
        return `🏄‍♂️ Angin Kencang & Ombak Maksimal (${windSpeed} km/j, ${temp}°C). Kondisi angin laut sangat ideal bagi para peselancar (surfer) di pantai Krui & Tanjung Setia!`;
      }
      return `🌬️ Hembusan Angin Cukup Kencang (${windSpeed} km/j). Berhati-hati di area wahana tinggi atau perbukitan terbuka. ${defaultAdvisory}`;
    }

    // 4. Cuaca Sejuk Pegunungan (misal Lampung Barat / Liwa)
    if (temp <= 25) {
      return `🍃 Udara Sejuk Pegunungan (${temp}°C, Kelembapan ${humidity}%). Suasana sejuk & nyaman di ${regencyName}. Sangat pas untuk menikmati kopi hangat khas Lampung & menjelajahi perkebunan. Disarankan membawa jaket ringan.`;
    }

    // 5. Cuaca Cerah / Ideal
    return `✨ Kondisi Wisata Sempurna: Cuaca ${wmoCondition.toLowerCase()} dengan suhu ${temp}°C & angin ${windSpeed} km/j. ${defaultAdvisory}`;
  };

  const fetchLiveWeather = async (lat: number, lng: number) => {
    setIsLoading(true);
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,uv_index`;
      const res = await fetch(url);
      const data = await res.json();
      const current = data?.current || {};

      const temp = Math.round(current.temperature_2m ?? 29);
      const humidity = Math.round(current.relative_humidity_2m ?? 70);
      const windSpeed = Math.round(current.wind_speed_10m ?? 10);
      const uv = Math.round(current.uv_index ?? 6);
      const wmo = parseWmoCode(current.weather_code ?? 1, temp);

      const advisoryText = generateDynamicAdvisory(
        temp,
        humidity,
        windSpeed,
        uv,
        wmo.icon,
        wmo.condition,
        activeRegency.regency,
        activeRegency.defaultAdvisory
      );

      setWeatherData({
        temp,
        condition: wmo.condition,
        icon: wmo.icon,
        humidity,
        windSpeed,
        uvIndex: `Live UV ${uv}`,
        advisory: advisoryText,
      });
    } catch (err) {
      // Fallback
      setWeatherData({
        temp: 29,
        condition: 'Cerah Berawan 🌤️',
        icon: 'cloud-sun',
        humidity: 70,
        windSpeed: 10,
        uvIndex: 'Live UV 6',
        advisory: activeRegency.defaultAdvisory,
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveWeather(activeRegency.lat, activeRegency.lng);
  }, [selectedIndex]);

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
                  Live Weather & Musim Wisata (Open-Meteo API)
                </span>
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              </div>
              <p className="text-[10px] text-slate-500 font-medium">Cuaca Real-Time Presisi 15 Wilayah Lampung</p>
            </div>
          </div>

          {/* Regency Select */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchLiveWeather(activeRegency.lat, activeRegency.lng)}
              className="p-1.5 rounded-xl bg-white border border-slate-200 hover:border-[#0D9488] text-slate-500 hover:text-[#0D9488] transition-colors"
              title="Refresh Data Cuaca Real-Time"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>

            <div className="relative">
              <select
                value={selectedIndex}
                onChange={(e) => setSelectedIndex(Number(e.target.value))}
                className="appearance-none bg-white border border-slate-200/90 hover:border-[#0D9488] text-slate-800 text-xs font-bold py-1.5 pl-3 pr-7 rounded-xl shadow-2xs focus:outline-none cursor-pointer transition-colors"
              >
                {lampungRegencies.map((w, idx) => (
                  <option key={idx} value={idx}>
                    {w.regency}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Main Weather Information Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
          {/* Temperature & Main Icon (5 Cols) */}
          <div className="sm:col-span-5 flex items-center gap-3 bg-white/80 rounded-2xl p-3.5 border border-slate-100 shadow-2xs">
            <div className="p-2.5 rounded-2xl bg-amber-50 border border-amber-200/60 shrink-0">
              {renderWeatherIcon(weatherData?.icon || 'cloud-sun')}
            </div>
            <div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl sm:text-3xl font-black text-slate-900 font-display tracking-tight">
                  {isLoading ? '--' : weatherData?.temp}°
                </span>
                <span className="text-xs font-bold text-slate-500">C</span>
              </div>
              <p className="text-xs font-bold text-slate-700 leading-none">
                {isLoading ? 'Mengambil Cuaca...' : weatherData?.condition}
              </p>
            </div>
          </div>

          {/* Environmental Indicators (7 Cols) */}
          <div className="sm:col-span-7 grid grid-cols-3 gap-2 text-center">
            <div className="bg-white/80 rounded-xl p-2 border border-slate-100 shadow-2xs">
              <Droplets className="w-3.5 h-3.5 text-[#0D9488] mx-auto mb-0.5" />
              <span className="block text-[10px] text-slate-400 font-medium">Kelembapan</span>
              <span className="text-xs font-extrabold text-slate-800">
                {isLoading ? '--' : `${weatherData?.humidity}%`}
              </span>
            </div>
            <div className="bg-white/80 rounded-xl p-2 border border-slate-100 shadow-2xs">
              <Wind className="w-3.5 h-3.5 text-sky-500 mx-auto mb-0.5" />
              <span className="block text-[10px] text-slate-400 font-medium">Angin</span>
              <span className="text-xs font-extrabold text-slate-800">
                {isLoading ? '--' : `${weatherData?.windSpeed} km/j`}
              </span>
            </div>
            <div className="bg-white/80 rounded-xl p-2 border border-slate-100 shadow-2xs">
              <Thermometer className="w-3.5 h-3.5 text-amber-500 mx-auto mb-0.5" />
              <span className="block text-[10px] text-slate-400 font-medium">Indeks UV</span>
              <span className="text-[11px] font-extrabold text-slate-800 truncate">
                {isLoading ? '--' : weatherData?.uvIndex}
              </span>
            </div>
          </div>
        </div>

        {/* Travel Advisory & Best Season Banner */}
        <div className="bg-[#0D9488]/10 border border-[#0D9488]/20 rounded-2xl p-3 text-xs space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-[#0D9488] font-bold text-[11px]">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>Rekomendasi Musim & Perjalanan Real-Time:</span>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#0D9488] text-white">
              {activeRegency.bestSeason}
            </span>
          </div>
          <p className="text-[#0F766E] text-[11px] font-medium leading-relaxed">
            {isLoading ? 'Memuat saran perjalanan...' : weatherData?.advisory}
          </p>
        </div>
      </div>
    </div>
  );
};

