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

export const askRadenGajahChatbot = async (payload: AskChatbotPayload): Promise<ChatbotResponseData> => {
  try {
    const res = await apiClient.post('/chatbot/chat', payload);
    if (res.data && res.data.data) {
      return res.data.data;
    }
    return {
      reply: 'Tabik Pun! Maaf, sistem sedang memproses informasi. Ada yang bisa saya bantu untuk wisata Lampung?',
      suggested_queries: [
        '🏖️ Rekomendasi pantai di Pesawaran',
        '🍲 Tempat makan Seruit khas Lampung',
        '🐬 Wisata lumba-lumba Teluk Kiluan',
      ],
      destinations: [],
    };
  } catch (err) {
    console.warn('[CHATBOT API CLIENT FALLBACK]', err);
    return {
      reply:
        'Tabik Pun! Saya Raden Gajah & Muli AI, pemandu wisata resmi Provinsi Lampung. Lampung terkenal dengan pantai eksotis seperti Pulau Pahawang, kuliner khas Seruit, dan konservasi gajah Way Kambas!',
      suggested_queries: [
        '🏖️ Rekomendasi pantai di Pesawaran',
        '🍲 Kuliner Seruit khas Lampung',
        '🐬 Wisata lumba-lumba Teluk Kiluan',
      ],
      destinations: [],
    };
  }
};
