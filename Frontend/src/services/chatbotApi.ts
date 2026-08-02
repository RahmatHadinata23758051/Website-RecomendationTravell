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

  // Pure Client-Side RAG Engine (Humanized Gemini Tone)
  const lowerMsg = payload.message.toLowerCase();
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
    } else if (lowerMsg.includes('kuliner') || lowerMsg.includes('makan') || lowerMsg.includes('seruit')) {
      filtered = allDestinations.filter((d: any) => {
        const catStr = (d.primary_category || d.category || d.name || '').toLowerCase();
        return catStr.includes('kuliner') || catStr.includes('food') || catStr.includes('restoran') || catStr.includes('rumah makan');
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
