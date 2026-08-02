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

// Client-side fallback dataset loader
let clientDestinationsCache: any[] = [];
const getClientDestinations = async (): Promise<any[]> => {
  if (clientDestinationsCache.length > 0) return clientDestinationsCache;
  try {
    const res = await fetch('/public_destinations.json');
    if (res.ok) {
      clientDestinationsCache = await res.json();
    }
  } catch (e) {
    console.warn('[CLIENT RAG FETCH FALLBACK WARN]', e);
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

  // Pure Client-Side RAG Engine Fallback
  const lowerMsg = payload.message.toLowerCase();
  const allDestinations = await getClientDestinations();

  // Search matching regency or category
  const regencies = ['Bandar Lampung', 'Pesawaran', 'Lampung Selatan', 'Pesisir Barat', 'Tanggamus', 'Way Kanan', 'Lampung Timur', 'Lampung Barat', 'Metro', 'Pringsewu'];
  let matchedRegency = regencies.find((r) => lowerMsg.includes(r.toLowerCase()));

  if (allDestinations && allDestinations.length > 0) {
    let filtered = allDestinations;
    if (matchedRegency) {
      filtered = allDestinations.filter((d: any) => d.regency && d.regency.toLowerCase().includes(matchedRegency.toLowerCase()));
    } else if (lowerMsg.includes('pantai') || lowerMsg.includes('laut')) {
      filtered = allDestinations.filter((d: any) => d.category === 'Pantai');
    } else if (lowerMsg.includes('kuliner') || lowerMsg.includes('makan')) {
      filtered = allDestinations.filter((d: any) => d.category === 'Kuliner');
    }

    const topSpots = filtered.slice(0, 4);
    if (topSpots.length > 0) {
      const areaName = matchedRegency || 'Lampung';
      const spotsText = topSpots
        .map(
          (spot: any, idx: number) =>
            `${idx + 1}. 📍 **${spot.name}** (${spot.category || 'Wisata'})\n   • **Lokasi**: ${spot.location || spot.regency}\n   • **Estimasi Biaya**: ${spot.price || 'Terjangkau ($)'}\n   • **Rating**: ${spot.rating || 4.5}★\n   • **Info**: ${(spot.description || spot.summary || '').slice(0, 110)}...`,
        )
        .join('\n\n');

      return {
        reply: `Tabik Pun! 🙏 Berikut rekomendasi tempat wisata favorit di **${areaName}** berdasarkan data terverifikasi Kelana Lampung:\n\n${spotsText}\n\nAda yang ingin Muli bantu untuk rute perjalanannya?`,
        suggested_queries: [
          `🏖️ Rekomendasi pantai di ${areaName}`,
          '🍲 Tempat makan Seruit khas Lampung',
          '💰 Estimasi biaya liburan terjangkau',
        ],
        destinations: topSpots.map((f: any) => ({
          id: f.id,
          name: f.name,
          location: f.location || f.regency,
          regency: f.regency,
          price: f.price || 'Terjangkau ($)',
          rating: f.rating || 4.5,
        })),
      };
    }
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
