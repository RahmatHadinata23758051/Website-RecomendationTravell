import { apiClient, API_BASE_URL } from '../lib/api';

export interface ChatHistoryItem {
  sender: 'user' | 'bot';
  text: string;
}

export interface ChatbotResponseData {
  reply: string;
  suggested_queries: string[];
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

export const streamRadenGajahChatbot = async (
  payload: AskChatbotPayload,
  onToken: (text: string) => void,
): Promise<ChatbotResponseData> => {
  const token = localStorage.getItem('kelana_access_token');
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${API_BASE_URL}/chatbot/chat/stream`, {
    method: 'POST',
    headers,
    credentials: 'include',
    body: JSON.stringify(payload),
  });
  if (!response.ok || !response.body) throw new Error('Layanan asisten wisata sedang tidak tersedia. Silakan coba lagi.');

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let reply = '';
  let suggested_queries: string[] = [];
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let boundary: number;
      while ((boundary = buffer.indexOf('\n\n')) >= 0) {
        const frame = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);
        const event = frame.match(/^event: (.+)$/m)?.[1];
        const data = frame.split(/\r?\n/).find((line) => line.startsWith('data:'))?.slice(5).trim();
        if (!data) continue;
        const parsed = JSON.parse(data);
        if (event === 'token' && typeof parsed.token === 'string') {
          reply += parsed.token;
          onToken(cleanFormattingAndEmojis(reply));
        } else if (event === 'done') {
          reply = parsed.reply || reply;
          suggested_queries = parsed.suggested_queries || [];
        } else if (event === 'error') {
          throw new Error(parsed.message || 'Layanan asisten wisata sedang tidak tersedia.');
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  if (!reply) throw new Error('Layanan asisten mengembalikan respons yang tidak valid.');
  return {
    reply: cleanFormattingAndEmojis(reply),
    suggested_queries: suggested_queries.map(cleanFormattingAndEmojis),
  };
};

export const askRadenGajahChatbot = async (payload: AskChatbotPayload): Promise<ChatbotResponseData> => {
  const res = await apiClient.post('/chatbot/chat', payload, { timeout: 70000 });
  const responseData = res.data?.data;

  if (!responseData?.reply) {
    throw new Error('Layanan asisten mengembalikan respons yang tidak valid.');
  }

  return {
    ...responseData,
    reply: cleanFormattingAndEmojis(responseData.reply),
    suggested_queries: (responseData.suggested_queries || []).map((query: string) =>
      cleanFormattingAndEmojis(query),
    ),
  };
};
