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

const resolveActiveRegency = (lowerMsg: string, history: ChatHistoryItem[]): string => {
  // 1. Direct regency in current message (Highest Priority)
  if (lowerMsg.includes('pesisir barat') || lowerMsg.includes('krui')) return 'pesisir barat';
  if (lowerMsg.includes('pesawaran')) return 'pesawaran';
  if (lowerMsg.includes('tanggamus')) return 'tanggamus';
  if (lowerMsg.includes('bandar lampung') || lowerMsg.includes('bdl')) return 'bandar lampung';
  if (lowerMsg.includes('tulang bawang') || lowerMsg.includes('tubaba')) return 'tulang bawang';
  if (lowerMsg.includes('lampung selatan') || lowerMsg.includes('lamsel')) return 'lampung selatan';

  // 2. Reverse History Scan (Most Recently Mentioned Regency First)
  if (Array.isArray(history) && history.length > 0) {
    const userMsgs = history.filter((h) => h.sender === 'user').reverse();
    for (const h of userMsgs) {
      const text = (h.text || '').toLowerCase();
      if (text.includes('pesisir barat') || text.includes('krui')) return 'pesisir barat';
      if (text.includes('pesawaran')) return 'pesawaran';
      if (text.includes('tanggamus')) return 'tanggamus';
      if (text.includes('bandar lampung') || text.includes('bdl')) return 'bandar lampung';
      if (text.includes('tulang bawang') || text.includes('tubaba')) return 'tulang bawang';
      if (text.includes('lampung selatan') || text.includes('lamsel')) return 'lampung selatan';
    }
  }

  return '';
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

  // 1. Explicit Current Message Intents
  const msgIsWisata = /(wisata|wisatanya|destinasi|tempat|rekreasi|jalan|liburan)/i.test(lowerMsg);
  const msgIsBeach = /(pantai|pntai|pantaii|laut|snorkeling|surfing|beach)/i.test(lowerMsg);
  const msgIsFood = /(kuliner|kuliiner|kulinr|kulineran|makan|mkan|mkn|makanan|resto|restoran|seruit|warung)/i.test(lowerMsg);

  const isFollowupQuery = lowerMsg.startsWith('kalo') || lowerMsg.startsWith('kalau') || lowerMsg.startsWith('bagaimana') || lowerMsg.includes('nya');

  // 2. Active Regency Resolution (Reverse History Scan)
  const activeRegency = resolveActiveRegency(lowerMsg, payload.history || []);

  // 3. Determine Effective Topic: Current Message explicit intent ALWAYS overrides history!
  let effectiveTopic = '';
  if (msgIsBeach) {
    effectiveTopic = 'beach';
  } else if (msgIsWisata) {
    effectiveTopic = 'wisata';
  } else if (msgIsFood) {
    effectiveTopic = 'food';
  } else if (isFollowupQuery) {
    const lastUserMsg = Array.isArray(payload.history) && payload.history.length > 0 ? payload.history.filter(h => h.sender === 'user').pop()?.text.toLowerCase() || '' : '';
    if (/(kuliner|makan|food|seruit)/i.test(lastUserMsg)) {
      effectiveTopic = 'food';
    } else if (/(pantai|beach|laut)/i.test(lastUserMsg)) {
      effectiveTopic = 'beach';
    } else {
      effectiveTopic = 'wisata';
    }
  } else {
    effectiveTopic = 'wisata';
  }

  // A. Food Topic
  if (effectiveTopic === 'food') {
    if (activeRegency === 'pesawaran') {
      return {
        reply: `Tabik Pun! 🍲 Kuliner paling khas & lezat di **Kabupaten Pesawaran** adalah olahan **Seruit Ikan Simba & Sambal Rampai** segar yang dinikmati tepi pantai!

Berikut rekomendasi kuliner mantap di Pesawaran:

🐟 **1. Seruit Ikan Bakar Simba / Patin**
Ikan segar bakar bumbu gurih khas Pesawaran yang dinikmati bersama sambal tempoyak durian & lalapan segar.

🦐 **2. Seafood Olahan Laut Ketapang**
Hasil tangkapan nelayan segar seperti kepiting, cumi bakar, & udang goreng mentega di sekitar Dermaga Ketapang.

🥥 **3. Es Kelapa Muda Pasir Putih**
Minuman penyegar khas pantai Pesawaran sambil menikmati pemandangan laut jernih.

📍 *Rekomendasi Tempat*: Rumah makan lesehan seafood tepi Pantai Mutun, Sari Ringgung, & kawasan Dermaga Ketapang!`,
        suggested_queries: ['🏖️ Pantai di Pesawaran', '🤿 Snorkeling Pulau Pahawang', '💰 Estimasi biaya liburan'],
        destinations: [],
      };
    }

    if (activeRegency === 'pesisir barat') {
      return {
        reply: `Tabik Pun! 🍲 Kuliner paling khas & legendaris di **Pesisir Barat (Krui)** adalah olahan **Ikan Tuhuk (Ikan Marlin Samudra)** segar!

Berikut kuliner terbaik di Krui yang wajib banget kamu coba:

🐟 **1. Gulai Taboh Ikan Tuhuk**
Kuah gurih santan kelapa muda rempah khas Krui dengan potongan tebal daging marlin empuk.

🍢 **2. Sate Ikan Tuhuk Krui**
Sate daging marlin segar bakar bumbu kecap pedas gurih khas pesisir samudra.

🍲 **3. Seruit Ikan Laut & Tempoyak Durian**
Ikan laut bakar disajikan dengan tempoyak durian fermentasi dan lalapan segar.

📍 *Rekomendasi Tempat*: Kamu bisa mencicipinya di **Kedai Nelayan Vanie** (Jl. Lintas Barat Sumatra) atau resto seafood sepanjang pantai Tanjung Setia & Labuhan Jukung!`,
        suggested_queries: ['🏖️ Pantai di Pesisir Barat', '🏄 Surfing Tanjung Setia', '💰 Estimasi biaya liburan'],
        destinations: [],
      };
    }

    if (activeRegency === 'tanggamus') {
      return {
        reply: `Tabik Pun! 🍲 Untuk kuliner khas di **Kabupaten Tanggamus**, daerah pesisir Teluk Semangka ini sangat kaya dengan hidangan laut segar & masakan tradisional khas Pepadun & Saiburi!

Berikut rekomendasi kuliner mantap di Tanggamus:

🐟 **1. Seruit Ikan Simba / Kerapu Laut Semangka**
Ikan laut segar bakar khas Kota Agung disajikan dengan sambal tempoyak durian & lalapan segar.

🍲 **2. Gulai Taboh Ikan Kering / Basah**
Gulai santan kaya bumbu rempah tradisional khas pesisir Kota Agung & Gisting.

☕ **3. Kopi Robusta Gisting Tanggamus**
Kopi lereng Gunung Tanggamus yang sangat harum & nikmat dinikmati di udara sejuk Gisting.

📍 *Rekomendasi Tempat*: Rumah makan lesehan seafood di sekitar Dermaga Kota Agung atau kawasan wisata Gisting!`,
        suggested_queries: ['🐬 Wisata lumba-lumba Teluk Kiluan', '🪨 Pantai Gigi Hiu', '🌿 Udara sejuk Gisting'],
        destinations: [],
      };
    }

    if (activeRegency === 'bandar lampung') {
      return {
        reply: `Tabik Pun! 🍲 Bandar Lampung adalah pusatnya kuliner lezat khas Lampung!

Berikut rekomendasi kuliner & tempat makan terfavorit di Bandar Lampung:

🍲 **1. Rumah Makan Seruit Ibu Hajah**
Pusat olahan Seruit ikan simba/patin bakar komplit dengan sambal tempoyak durian & lalapan.

🍗 **2. Rumah Makan Begadang V**
Sangat terkenal dengan Ayam Pop legendaris khas Lampung & olahan Padang rempah gurih.

🍌 **3. Keripik Pisang Cokelat YenYen (Pusat Oleh-oleh Gang PU)**
Pusat keripik pisang anekarasa cokelat lumer terpopuler yang wajib dibawa pulang!`,
        suggested_queries: ['📍 Wisata hits Bandar Lampung', '🏖️ Pantai di Pesawaran', '💰 Estimasi biaya liburan'],
        destinations: [],
      };
    }
  }

  // B. Wisata / Beach Topic
  if (effectiveTopic === 'wisata' || effectiveTopic === 'beach') {
    if (activeRegency === 'pesisir barat') {
      return {
        reply: `Tabik Pun! 🏄 **Kabupaten Pesisir Barat (Krui)** adalah surga wisata pantai samudra kelas dunia di Lampung!

Berikut destinasi pantai & wisata terbaik yang wajib kamu kunjungi di Krui:

🏄 **1. Pantai Tanjung Setia (Krui Surf Spot)**
Pantai ombak surfing kelas dunia yang diakui surfer internasional, dilengkapi resort & surf school tepi pantai.

🌅 **2. Pantai Labuhan Jukung**
Pusat wisata pantai paling populer di pusat kota Krui dengan pemandangan sunset samudra lepas yang memukau.

🌴 **3. Pulau Pisang**
Pulau eksotis berpasir putih halus dengan air laut bening kristal, tempat pengrajin kain Tapis tradisional & spot lumba-lumba.

🌿 **4. Taman Nasional Bukit Barisan Selatan (TNBBS)**
Kawasan konservasi hutan hujan tropis & flora fauna langka khas Sumatera.

Destinasi mana yang paling ingin kamu kunjungi di Krui? Muli siap bantu rutenya! 😊`,
        suggested_queries: [
          '🏄 Sewa papan surfing Tanjung Setia',
          '🚤 Perahu penyeberangan Pulau Pisang',
          '🍲 Kuliner Ikan Tuhuk Krui',
        ],
        destinations: [],
      };
    }

    if (activeRegency === 'pesawaran') {
      return {
        reply: `Tabik Pun! 🤿 **Kabupaten Pesawaran** adalah rajanya wisata bahari, island hopping, & snorkeling di Lampung!

Berikut destinasi wisata unggulan paling hits yang wajib kamu kunjungi di Pesawaran:

🤿 **1. Pulau Pahawang (Spot Snorkeling Nemo)**
Destinasi bahari kelas dunia tempat snorkeling terbaik melihat terumbu karang alami & ekosistem Ikan Nemo yang sangat bening.

🏝️ **2. Pantai Sari Ringgung & Pasir Timbul**
Pantai pasir putih populer dengan fenomena unik wahana Pasir Timbul mengapung di tengah laut.

🌴 **3. Pulau Kelagian & Pantai Mutun**
Pulau pasir putih halus berair laut tenang yang sangat cocok untuk liburan keluarga & wahana olahraga air.

🌊 **4. Pantai Dewi Mandapa & Pulau Mahitam**
Spot pantai estetik dengan hutan mangrove instagramable & daratan pasir timbul menuju Pulau Mahitam.

Destinasi mana yang paling ingin kamu kunjungi di Pesawaran? 😊`,
        suggested_queries: [
          '🤿 Paket snorkeling Pulau Pahawang',
          '🏖️ Tiket masuk Pantai Sari Ringgung',
          '🍲 Kuliner Seruit Pesawaran',
        ],
        destinations: [],
      };
    }

    if (activeRegency === 'tanggamus') {
      return {
        reply: `Tabik Pun! 🐬 **Kabupaten Tanggamus** terkenal banget dengan petualangan bahari laut lepas & gugusan karang eksotis dunia!

Berikut destinasi wisata paling hits & wajib kamu kunjungi di Tanggamus:

🐬 **1. Teluk Kiluan (Atraksi Lumba-Lumba Liar)**
Pengalaman luar biasa naik perahu jukung tradisional ke laut lepas Teluk Semangka untuk melihat kawanan ratusan lumba-lumba melompat bebas!

🪨 **2. Pantai Gigi Hiu (Pegadungan)**
Gugusan tebing batu karang tajam menjulang tinggi seperti gigi hiu raksasa yang sangat ikonik & terkenal di kalangan fotografer dunia.

🌿 **3. Air Terjun Way Lalaan & Kawasan Wisata Gisting**
Air terjun bertingkat yang sejuk di kaki Gunung Tanggamus, dikelilingi kebun buah & taman bunga asri.

🌋 **4. Bendungan Batu Tegi & Wisata Alam Suoh**
Waduk terbesar di Asia Tenggara dengan pemandangan danau perbukitan yang sangat megah.

Ada yang paling membuatmu tertarik untuk dikunjungi di Tanggamus? 😊`,
        suggested_queries: [
          '🐬 Cara sewa jukung lumba-lumba Kiluan',
          '📸 Rute ke Pantai Gigi Hiu',
          '☕ Tempat ngeteh sejuk di Gisting',
        ],
        destinations: [],
      };
    }
  }

  const allDestinations = await getClientDestinations();

  if (allDestinations && allDestinations.length > 0) {
    let filtered = allDestinations.filter((d: any) => {
      const nameLower = (d.name || '').toLowerCase().trim();
      return (
        nameLower !== 'wisata' &&
        nameLower !== 'destinasi wisata' &&
        !nameLower.startsWith('lampung') &&
        !nameLower.startsWith('wisata alam') &&
        !nameLower.includes('tour') &&
        !nameLower.includes('travel') &&
        !nameLower.includes('biro') &&
        !nameLower.includes('mepo') &&
        !nameLower.includes('rental') &&
        !nameLower.includes('tugu selamat') &&
        !nameLower.includes('gapura selamat') &&
        !nameLower.includes('spbu') &&
        !nameLower.includes('terminal')
      );
    });

    if (activeRegency) {
      filtered = filtered.filter((d: any) => {
        const regStr = (d.city_or_regency || d.regency || d.address || '').toLowerCase();
        return regStr.includes(activeRegency);
      });
    }

    filtered.sort((a: any, b: any) => (b.rating || 4.0) - (a.rating || 4.0));

    const topSpots = filtered.slice(0, 4);
    if (topSpots.length > 0) {
      const areaName = activeRegency ? activeRegency.toUpperCase() : 'LAMPUNG';

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

  // CS persona
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

  // Default CS Welcome
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
