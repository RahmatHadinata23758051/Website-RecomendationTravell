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

    // Sort by rating descending
    filtered.sort((a: any, b: any) => (b.rating || 4.0) - (a.rating || 4.0));

    const topSpots = filtered.slice(0, 4);
    if (topSpots.length > 0) {
      const areaName = matchedRegency
        ? matchedRegency.toUpperCase()
        : lowerMsg.includes('pantai')
        ? 'PANTAI EKSOTIS LAMPUNG'
        : 'LAMPUNG';

      const spotsText = topSpots
        .map((spot: any, idx: number) => {
          const name = spot.name || 'Wisata Lampung';
          const cat = spot.primary_category || spot.category || 'Wisata';
          const loc = spot.address || spot.city_or_regency || spot.location || 'Lampung';
          const rating = spot.rating || 4.5;
          const price = spot.price || (spot.price_min_idr ? `Rp ${spot.price_min_idr.toLocaleString('id-ID')}` : 'Gratis / Terjangkau ($)');
          const desc = (spot.description || spot.summary || 'Destinasi wisata unggulan dengan pemandangan eksotis di Lampung.').slice(0, 120);

          return `${idx + 1}. 📍 **${name}** (${cat})\n   • **Lokasi**: ${loc}\n   • **Estimasi Biaya**: ${price}\n   • **Rating**: ${rating}★\n   • **Info**: ${desc}...`;
        })
        .join('\n\n');

      return {
        reply: `Tabik Pun! 🙏 Berikut rekomendasi tempat wisata unggulan di **${areaName}** berdasarkan data terverifikasi Kelana Lampung:\n\n${spotsText}\n\nAda yang ingin Muli bantu untuk rute perjalanannya?`,
        suggested_queries: [
          `🏖️ Rekomendasi pantai di ${areaName}`,
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
        'Tabik Pun! 🙏 Saya **Muli**, Customer Service & AI Concierge Resmi Panduan Wisata Provinsi Lampung.\n\nSaya didesain khusus untuk membantu Anda menemukan destinasi wisata pantai terbaik, kuliner khas seperti Seruit, estimasi biaya liburan, serta rute perjalanan terverifikasi di 15 Kabupaten/Kota se-Lampung!',
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
      'Tabik Pun! 🙏 Saya Muli, Customer Service & AI Concierge Resmi Wisata Lampung.\n\nLampung memiliki keindahan wisata luar biasa! Untuk wisata bahari, Anda dapat mengunjungi **Pulau Pahawang** di Pesawaran & **Pantai Tanjung Setia** di Krui. Untuk kuliner khas, cobalah **Seruit** dan Keripik Pisang Cokelat khas Bandar Lampung!',
    suggested_queries: [
      '🏖️ Rekomendasi pantai di Pesawaran',
      '🍲 Kuliner Seruit khas Lampung',
      '🐬 Wisata lumba-lumba Teluk Kiluan',
    ],
    destinations: [],
  };
};
