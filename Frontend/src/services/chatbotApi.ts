import { apiClient } from '../lib/api';

export interface ChatHistoryItem {
  sender: 'user' | 'bot';
  text: string;
}

export interface RecommendedDestinationFact {
  id: string;
  name: string;
  location: string;
  regency: string;
  price: string;
  rating: number;
}

export interface ChatbotResponseData {
  reply: string;
  suggested_queries: string[];
  destinations?: RecommendedDestinationFact[];
}

export interface AskChatbotPayload {
  message: string;
  context?: string;
  history?: ChatHistoryItem[];
  category?: string;
  regency?: string;
}

// Client-side dataset loader
let clientDestinationsCache: any[] = [];
const getClientDestinations = async (): Promise<any[]> => {
  if (clientDestinationsCache.length > 0) return clientDestinationsCache;
  try {
    const posibleUrls = [
      '/assets/data/public_destinations.json',
      '/data/destinations.json',
      '/public_destinations.json',
    ];
    for (const url of posibleUrls) {
      const res = await fetch(url);
      if (res.ok) {
        clientDestinationsCache = await res.json();
        console.log(`[CLIENT RAG] Loaded ${clientDestinationsCache.length} destinations from ${url}`);
        break;
      }
    }
  } catch (e) {
    console.warn('[CLIENT RAG FETCH WARN]', e);
  }
  return clientDestinationsCache;
};

export const askRadenGajahChatbot = async (payload: AskChatbotPayload): Promise<ChatbotResponseData> => {
  try {
    const res = await apiClient.post('/chatbot/chat', payload);
    if (res.data && res.data.data && res.data.data.reply) {
      return res.data.data;
    }
  } catch (err) {
    console.warn('[CHATBOT API CLIENT FALLBACK TRIGGERED]', err);
  }

  // Pure Client-Side RAG Engine
  const lowerMsg = payload.message.toLowerCase().trim();
  const cleanMsg = lowerMsg.replace(/[^a-z0-9\s]/gi, '').trim();

  // Combine history for multi-turn intent resolution
  const historyText = Array.isArray(payload.history)
    ? payload.history.map((h) => h.text.toLowerCase()).join(' ')
    : '';
  const combinedCtx = `${historyText} ${lowerMsg}`.trim();

  // Pure Greeting Detection
  const greetingWords = ['halo', 'hallo', 'hai', 'hi', 'hey', 'pagi', 'siang', 'sore', 'malam', 'tes', 'test', 'ping', 'p'];
  const isPureGreeting = greetingWords.includes(cleanMsg) || (cleanMsg.length <= 15 && (cleanMsg.startsWith('halo') || cleanMsg.startsWith('hallo') || cleanMsg.startsWith('hai') || cleanMsg.startsWith('hi')));

  if (isPureGreeting && !cleanMsg.includes('wisata') && !cleanMsg.includes('pantai') && !cleanMsg.includes('kuliner') && !cleanMsg.includes('rekomendasi')) {
    return {
      reply:
        'Tabik Pun! ✨ Halo! Saya **Muli**, Customer Service & AI Concierge Resmi Panduan Wisata Provinsi Lampung. Selamat datang di Kelana Lampung!\n\nAda yang bisa Muli bantu untuk liburanmu hari ini? Kamu bisa bertanya seputar rekomendasi pantai eksotis, wisata alam hits, tempat makan Seruit khas Lampung, atau estimasi biaya liburan! 😊',
      suggested_queries: [
        '🏖️ Rekomendasi pantai di Pesawaran',
        '🍲 Tempat makan Seruit khas Lampung',
        '📍 Wisata populer di Bandar Lampung',
      ],
      destinations: [],
    };
  }

  // Current explicit intent in current message ALWAYS overrides history!
  const msgHasKuliner = lowerMsg.includes('kuliner') || lowerMsg.includes('makan') || lowerMsg.includes('seruit') || lowerMsg.includes('resto') || lowerMsg.includes('makanan');
  const msgHasBeach = lowerMsg.includes('pantai') || lowerMsg.includes('laut') || lowerMsg.includes('snorkeling') || lowerMsg.includes('surfing');
  const msgHasTopRegencies = lowerMsg.includes('top kabupaten') || lowerMsg.includes('kabupaten yang cocok') || (lowerMsg.includes('kabupaten') && msgHasBeach);

  const isFollowupQuery = lowerMsg.startsWith('kalo') || lowerMsg.startsWith('kalau') || lowerMsg.startsWith('bagaimana');
  const historyHasKuliner = combinedCtx.includes('kuliner') || combinedCtx.includes('makan') || combinedCtx.includes('seruit');

  // Case A: Top Regencies for Beaches
  if (msgHasTopRegencies || (msgHasBeach && lowerMsg.includes('kabupaten'))) {
    return {
      reply: `Tabik Pun! 🏖️ Kalau kamu cari kabupaten terbaik di Lampung yang rajanya wisata pantai eksotis & bahari, 3 kabupaten ini adalah jawaranya:

🌊 **1. Kabupaten Pesawaran** (Terbaik untuk Island Hopping & Snorkeling)
• Spot Utama: **Pulau Pahawang** (Spot Ikan Nemo & Karang Alami), **Pantai Sari Ringgung** (Pasir Timbul apung), **Pulau Kelagian**, dan **Pantai Mutun**.
• Keunggulan: Laut tenang, pasir putih jernih, sangat cocok untuk liburan keluarga & snorkeling.

🏄 **2. Kabupaten Pesisir Barat (Krui)** (Terbaik untuk Surfing & Sunset Samudra)
• Spot Utama: **Pantai Tanjung Setia** (Ombak surfing kelas dunia), **Pantai Penaga Resort**, **Labuhan Jukung**, dan **Pulau Pisang**.
• Keunggulan: Ombak spektakuler tempat surfer dunia berkumpul & pemandangan sunset samudra yang luar biasa!

🐬 **3. Kabupaten Tanggamus** (Terbaik untuk Atraction Lumba-lumba & Karang Eksotis)
• Spot Utama: **Teluk Kiluan** (Atraksi kawanan lumba-lumba bebas di laut lepas) & **Pantai Gigi Hiu** (Gugusan batu karang tajam eksotis).
• Keunggulan: Pemandangan tebing karang dramatis & pengalaman bertualang bahari yang tak terlupakan!

Kira-kira jenis pantai yang mana nih yang paling sesuai dengan gaya liburanmu? Muli siap bantu susunkan rutenya! 😊`,
      suggested_queries: [
        '🏖️ Rekomendasi pantai di Pesawaran',
        '🏄 Tempat surfing Tanjung Setia Krui',
        '🐬 Wisata lumba-lumba Teluk Kiluan',
      ],
      destinations: [],
    };
  }

  // Case B: Kuliner Query (either explicit in current message OR implicit follow-up from history)
  const isKulinerIntent = msgHasKuliner || (isFollowupQuery && historyHasKuliner && !msgHasBeach);

  if (isKulinerIntent) {
    if (lowerMsg.includes('tulang bawang') || (isFollowupQuery && combinedCtx.includes('tulang bawang'))) {
      return {
        reply: `Tabik Pun! 🍲 Kuliner khas di **Kabupaten Tulang Bawang & Tubaba** itu terkenal banget dengan olahan ikan sungai dan sambal pilihan olahan tradisional Suku Lampung!

Berikut kuliner terlezat yang wajib kamu cicipi di sana:

🐟 **1. Seruit Ikan Simba / Patin River Bakar**
Ikan segar hasil tangkapan Sungai Tulang Bawang yang dibakar gurih, disajikan dengan tempoyak durian fermentasi, sambal terasi, dan lalapan segar!

🍲 **2. Gulai Taboh Ikan Sungai**
Gulai santan kaya rempah tradisional dengan potongan ikan sungai gurih khas Menggala.

🍌 **3. Keripik & Olahan Pisang khas Menggala**
Camilan khas pesisir sungai Tulang Bawang yang cocok jadi buah tangan.

📍 *Rekomendasi Tempat*: Kamu bisa mencicipinya di Rumah Makan Lesehan sekitar Kota Menggala atau Kawasan Islamic Center Tubaba!

Mau Muli bantu rekomendasikan tempat wisata terdekatnya? 😊`,
        suggested_queries: [
          '📸 Spot foto Islamic Center Tubaba',
          '🚗 Rute ke Kota Menggala',
          '🏖️ Rekomendasi pantai terdekat',
        ],
        destinations: [],
      };
    }

    if (lowerMsg.includes('pesisir barat') || lowerMsg.includes('krui') || (isFollowupQuery && (combinedCtx.includes('pesisir barat') || combinedCtx.includes('krui')))) {
      return {
        reply: `Tabik Pun! 🍲 Kalau untuk kuliner di **Pesisir Barat (Krui)**, juaranya adalah olahan **Ikan Tuhuk (Ikan Marlin Samudra)** segar hasil tangkapan nelayan lokal!

Berikut kuliner khas paling mantap di Krui yang wajib banget kamu coba:

🐟 **1. Gulai Taboh Ikan Tuhuk**
Kuah gurih santan kelapa muda khas Krui dengan bumbu rempah tradisional dan potongan daging ikan tuhuk tebal yang sangat lembut!

🍢 **2. Sate Ikan Tuhuk Krui**
Sate daging marlin segar yang dibakar dengan bumbu kecap pedas manis atau bumbu kacang khas pantai.

🍲 **3. Seruit Ikan Laut & Tempoyak Durian**
Ikan simba/marlin segar bakar disajikan dengan tempoyak durian fermentasi khas Lampung dan lalapan segar tepi pantai.

📍 *Rekomendasi Tempat*: Kamu bisa mencicipinya di **Kedai Nelayan Vanie** (Jl. Lintas Barat Sumatra) atau rumah makan seafood di sekitar Tanjung Setia & Labuhan Jukung!

Kira-kira mau Muli bantu rekomendasikan tempat inap atau pantai terdekatnya? 😊`,
        suggested_queries: [
          '🏖️ Rekomendasi pantai di Pesisir Barat',
          '🏄 Tempat surfing Tanjung Setia',
          '💰 Estimasi biaya liburan ke Krui',
        ],
        destinations: [],
      };
    }

    if (lowerMsg.includes('bandar lampung') || (isFollowupQuery && combinedCtx.includes('bandar lampung'))) {
      return {
        reply: `Tabik Pun! 🍲 Wah, Bandar Lampung adalah pusatnya kuliner lezat khas Lampung bro! 

Berikut rekomendasi tempat makan & oleh-oleh paling mantap di Bandar Lampung:

🍲 **1. Rumah Makan Seruit Ibu Hajah**
Pusat olahan Seruit tradisional khas Suku Lampung dengan ikan simba/patin bakar, sambal terasi, tempoyak durian, dan lalapan segar komplit!

🍗 **2. Rumah Makan Begadang V**
Sangat terkenal dengan Ayam Pop khas Lampung & Nasi Padang olahan rempah gurih khas yang sangat legendaris.

🍌 **3. Keripik Pisang Cokelat YenYen (Pusat Oleh-oleh Gang PU)**
Pusat keripik pisang anekarasa (cokelat lumer, keju, susu, kopi) terpopuler khas Bandar Lampung yang wajib dibawa pulang!

Mana nih yang paling bikin kamu penasaran untuk dicoba duluan? 😊`,
        suggested_queries: [
          '📍 Wisata hits Bandar Lampung',
          '🏖️ Rekomendasi pantai di Pesawaran',
          '💰 Estimasi biaya makan Seruit',
        ],
        destinations: [],
      };
    }
  }

  // Case C: Tulang Bawang Tourism Intent
  if (lowerMsg.includes('tulang bawang') && !isKulinerIntent) {
    return {
      reply: `Tabik Pun! ✨ Wah, Kabupaten Tulang Bawang & Tulang Bawang Barat (Tubaba) itu kaya sekali akan wisata arsitektur ikonis dan sejarah budaya!

Berikut tempat paling mantap & fotogenik yang wajib kamu kunjungi di sana:

🏛️ **1. Islamic Center Tulang Bawang Barat (Masjid 99 Cahaya)**
Masjid tanpa kubah bergaya modern kontemporer yang sangat megah dan fotogenik di atas danau buatan.

🗿 **2. Kompleks Tugu Rato Nago Besanding**
Monumen ikonik berbentuk dua naga penarik kereta kencana khas budaya adat Lampung.

🌳 **3. Taman Kota & Ruang Terbuka Panaragan Jaya**
Taman hijau asri tempat bersantai keluarga dengan suasana sore hari yang sangat sejuk.

🏛️ **4. Taman Pemda & Kawasan Kota Menggala Heritage**
Pusat bersejarah kota kuno Menggala di tepi Sungai Tulang Bawang.

Ada yang ingin kamu tanyakan lebih lanjut mengenai rute jalan menuju Tubaba? 😊`,
      suggested_queries: [
        '📸 Spot foto Islamic Center Tubaba',
        '🚗 Rute perjalanan dari Bandar Lampung',
        '🍲 Kuliner khas Tulang Bawang',
      ],
      destinations: [],
    };
  }

  const allDestinations = await getClientDestinations();

  const regencies = [
    'bandar lampung',
    'pesawaran',
    'lampung selatan',
    'pesisir barat',
    'tanggamus',
    'way kanan',
    'lampung timur',
    'lampung barat',
    'metro',
    'pringsewu',
    'tulang bawang',
    'mesuji',
    'lampung tengah',
    'lampung utara',
  ];

  let matchedRegency = regencies.find((r) => lowerMsg.includes(r));

  if (allDestinations && allDestinations.length > 0) {
    let filtered = allDestinations;

    if (matchedRegency) {
      filtered = allDestinations.filter((d: any) => {
        const regStr = (d.city_or_regency || d.regency || d.address || '').toLowerCase();
        return regStr.includes(matchedRegency!);
      });
    } else if (lowerMsg.includes('pantai') || lowerMsg.includes('laut')) {
      filtered = allDestinations.filter((d: any) => {
        const catStr = (d.primary_category || d.category || d.name || '').toLowerCase();
        return catStr.includes('pantai') || catStr.includes('beach');
      });
    }

    filtered.sort((a: any, b: any) => (b.rating || 4.0) - (a.rating || 4.0));

    const topSpots = filtered.slice(0, 4);
    if (topSpots.length > 0) {
      const areaName = matchedRegency
        ? matchedRegency.toUpperCase()
        : lowerMsg.includes('pantai')
        ? 'PANTAI EKSOTIS LAMPUNG'
        : 'LAMPUNG';

      const categoryEmojiMap: Record<string, string> = {
        Pantai: '🏖️',
        Alam: '🌿',
        Budaya: '🏛️',
        Kuliner: '🍲',
        Adventure: '🏄',
      };

      const spotsText = topSpots
        .map((spot: any) => {
          const name = spot.name || 'Wisata Lampung';
          const cat = spot.primary_category || spot.category || 'Wisata';
          const emoji = categoryEmojiMap[cat] || '📍';
          const loc = spot.address || spot.city_or_regency || spot.location || 'Lampung';
          const rating = spot.rating || 4.5;
          const price = spot.price || (spot.price_min_idr ? `Rp ${spot.price_min_idr.toLocaleString('id-ID')}` : 'Terjangkau ($)');
          const desc = spot.description || spot.summary || 'Destinasi wisata unggulan khas Lampung yang indah & berkesan.';
          const cleanDesc = desc.slice(0, 110);

          return `${emoji} **${name}**\n${cleanDesc}...\n• 📍 *${loc}* | ⭐ *${rating}★* | 💰 *${price}*`;
        })
        .join('\n\n');

      return {
        reply: `Tabik Pun! ✨ Wah, pilihan yang luar biasa! **${areaName}** memang punya destinasi wisata menarik yang siap bikin liburanmu berkesan!

Berikut beberapa tempat rekomendasi pilihan Muli yang wajib banget kamu kunjungi di sana:

${spotsText}

Kira-kira destinasi mana nih yang paling bikin kamu penasaran? Muli siap bantu susunkan rute perjalanan atau rekomendasi tempat makan di sekitarnya! 😊`,
        suggested_queries: [
          `🏖️ Rekomendasi tempat di ${areaName}`,
          '🍲 Tempat makan Seruit khas Lampung',
          '💰 Estimasi biaya liburan terjangkau',
        ],
        destinations: topSpots.map((f: any) => ({
          id: f.canonical_id || f.id || `dest-${Math.random()}`,
          name: f.name,
          location: f.address || f.city_or_regency || f.location || 'Lampung',
          regency: f.city_or_regency || f.regency || 'Lampung',
          price: f.price || (f.price_min_idr ? `Rp ${f.price_min_idr.toLocaleString('id-ID')}` : 'Terjangkau ($)'),
          rating: f.rating || 4.5,
        })),
      };
    }
  }

  // Identity query or general greetings
  if (lowerMsg.includes('siapa') || lowerMsg.includes('kamu')) {
    return {
      reply:
        'Tabik Pun! 🙏 Halo! Saya **Muli**, Customer Service & AI Concierge Resmi Panduan Wisata Provinsi Lampung.\n\nSaya hadir untuk menemani liburanmu! Kamu bisa tanya Muli apa saja seputar rekomendasi pantai eksotis, wisata alam hits, kuliner tradisional seperti Seruit, estimasi biaya liburan, sampai rekomendasi tempat inap terbaik di 15 Kabupaten/Kota se-Lampung. Ada yang bisa Muli bantu hari ini?',
      suggested_queries: [
        '🏖️ Rekomendasi pantai di Pesawaran',
        '🍲 Tempat makan Seruit khas Lampung',
        '📍 Wisata populer di Bandar Lampung',
      ],
      destinations: [],
    };
  }

  // Ultimate Default Fallback
  return {
    reply:
      'Tabik Pun! ✨ Halo! Saya Muli, Customer Service & AI Concierge Resmi Wisata Lampung.\n\nLampung memiliki keindahan wisata luar biasa! Untuk wisata bahari, Anda dapat mengunjungi **Pulau Pahawang** di Pesawaran & **Pantai Tanjung Setia** di Krui. Untuk kuliner khas, cobalah **Seruit** dan Keripik Pisang Cokelat khas Bandar Lampung!',
    suggested_queries: [
      '🏖️ Rekomendasi pantai di Pesawaran',
      '🍲 Kuliner Seruit khas Lampung',
      '🐬 Wisata lumba-lumba Teluk Kiluan',
    ],
    destinations: [],
  };
};
