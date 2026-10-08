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
  numericPrice?: number;
  category?: string;
  hours?: string;
  highlight?: string;
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
  mode?: 'public' | 'authenticated';
  userId?: string;
}

const cleanFormattingAndEmojis = (text: string): string => {
  if (!text) return '';
  return text
    .replace(/\*\*/g, '')
    .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}]/gu, '')
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    .trim();
};

export const askRadenGajahChatbot = async (payload: AskChatbotPayload): Promise<ChatbotResponseData> => {
  const res = await apiClient.post('/chatbot/chat', payload);
  const responseData = res.data?.data;

  if (!responseData?.reply) {
    throw new Error('Layanan AI mengembalikan respons yang tidak valid.');
  }

  return {
    ...responseData,
    reply: cleanFormattingAndEmojis(responseData.reply),
    suggested_queries: (responseData.suggested_queries || []).map((query: string) =>
      cleanFormattingAndEmojis(query),
    ),
  };
};
