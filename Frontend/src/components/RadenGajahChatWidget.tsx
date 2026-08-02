import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Send,
  Sparkles,
  RotateCcw,
  ExternalLink,
  MapPin,
  Star,
  Compass,
} from 'lucide-react';
import {
  askRadenGajahChatbot,
  ChatHistoryItem,
  RecommendedDestinationFact,
} from '../services/chatbotApi';

interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: string;
  destinations?: RecommendedDestinationFact[];
}

export const RadenGajahChatWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const initialWelcomeMessage: ChatMessage = {
    id: 'msg-welcome',
    sender: 'bot',
    text: 'Tabik Pun! 🙏 Saya **Muli & Raden Gajah AI**, pemandu wisata digital resmi Provinsi Lampung. Ada yang ingin Anda tanyakan seputar pantai eksotis, kuliner Seruit, atau rute liburan di Lampung?',
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  };

  const [messages, setMessages] = useState<ChatMessage[]>([initialWelcomeMessage]);
  const [suggestedQueries, setSuggestedQueries] = useState<string[]>([
    '🏖️ Rekomendasi pantai di Pesawaran',
    '🍲 Kuliner Seruit khas Lampung',
    '🐬 Wisata lumba-lumba Teluk Kiluan',
    '💰 Liburan terjangkau 200rb/orang',
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSendMessage = async (textToSend?: string) => {
    const query = textToSend || inputMessage.trim();
    if (!query || isLoading) return;

    const userMsgId = `user-${Date.now()}`;
    const userMsg: ChatMessage = {
      id: userMsgId,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setIsLoading(true);

    // Prepare 5-turn history
    const history: ChatHistoryItem[] = messages.slice(-5).map((m) => ({
      sender: m.sender,
      text: m.text,
    }));

    try {
      const responseData = await askRadenGajahChatbot({
        message: query,
        history,
      });

      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        text: responseData.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        destinations: responseData.destinations,
      };

      setMessages((prev) => [...prev, botMsg]);
      if (responseData.suggested_queries && responseData.suggested_queries.length > 0) {
        setSuggestedQueries(responseData.suggested_queries);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `bot-err-${Date.now()}`,
          sender: 'bot',
          text: 'Tabik Pun! Maaf, terjadi kendala sinyal sementara. Ada yang bisa saya bantu untuk destinasi wisata Lampung lainnya?',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetChat = () => {
    setMessages([initialWelcomeMessage]);
    setSuggestedQueries([
      '🏖️ Rekomendasi pantai di Pesawaran',
      '🍲 Kuliner Seruit khas Lampung',
      '🐬 Wisata lumba-lumba Teluk Kiluan',
      '💰 Liburan terjangkau 200rb/orang',
    ]);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans">
      {/* ------------------ FLOATING TOGGLE BUTTON ------------------ */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="group relative flex items-center gap-3 rounded-full border border-[#D97706]/40 bg-gradient-to-r from-[#0F766E] via-[#0D9488] to-[#047857] p-2.5 pr-5 text-white shadow-2xl transition-all duration-300 hover:scale-105 hover:shadow-teal-900/40 active:scale-95"
          aria-label="Buka Chatbot Raden Gajah & Muli AI"
        >
          {/* Pulsing ring indicator */}
          <span className="absolute -left-1 -top-1 flex h-4 w-4">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex h-4 w-4 rounded-full bg-amber-500"></span>
          </span>

          {/* Muli Mascot Avatar Icon */}
          <div className="relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border-2 border-amber-300 bg-amber-100 shadow-inner">
            <img
              src="/assets/images/banners/explore-banner-ornament.png"
              alt="Muli AI"
              className="h-8 w-auto object-contain"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
            <Sparkles className="h-6 w-6 text-[#0F766E]" />
          </div>

          <div className="flex flex-col text-left">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-300">
              AI CONCIERGE LAMPUNG
            </span>
            <span className="font-display text-sm font-bold text-white leading-tight">
              Tanya Muli AI 🙏
            </span>
          </div>
        </button>
      )}

      {/* ------------------ FLOATING CHAT WINDOW ------------------ */}
      {isOpen && (
        <div className="flex h-[560px] w-[380px] sm:w-[420px] flex-col overflow-hidden rounded-3xl border border-[#EBE0C9] bg-white shadow-2xl transition-all duration-300">
          {/* HEADER */}
          <div className="flex items-center justify-between border-b border-[#E2D6BE] bg-gradient-to-r from-[#0F766E] via-[#0D9488] to-[#047857] px-5 py-4 text-white shadow-sm">
            <div className="flex items-center gap-3">
              <div className="relative flex h-10 w-10 items-center justify-center rounded-full border-2 border-amber-300 bg-amber-100 shadow-md">
                <Sparkles className="h-5 w-5 text-[#0F766E]" />
                <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-emerald-500"></span>
              </div>

              <div>
                <h3 className="font-display text-base font-extrabold text-white leading-tight">
                  Raden Gajah & Muli AI
                </h3>
                <p className="text-[11px] font-medium text-emerald-100 flex items-center gap-1">
                  <Compass className="h-3 w-3 text-amber-300 inline" />
                  Pemandu Wisata Resmi Lampung (Tabik Pun!)
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handleResetChat}
                title="Bersihkan Percakapan"
                className="rounded-full p-1.5 text-emerald-100 transition-colors hover:bg-white/10 hover:text-white"
              >
                <RotateCcw className="h-4 w-4" />
              </button>

              <button
                onClick={() => setIsOpen(false)}
                title="Tutup Chat"
                className="rounded-full p-1.5 text-emerald-100 transition-colors hover:bg-white/10 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* MESSAGES BODY */}
          <div className="flex-1 overflow-y-auto bg-[#FAF7F0] p-4 space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs leading-relaxed shadow-sm ${
                    msg.sender === 'user'
                      ? 'rounded-tr-none bg-[#0F766E] text-white font-medium'
                      : 'rounded-tl-none border border-[#E2D6BE] bg-white text-slate-800'
                  }`}
                >
                  <div className="whitespace-pre-line">{msg.text}</div>

                  {/* Recommended Destinations Cards in Chat Bubble */}
                  {msg.destinations && msg.destinations.length > 0 && (
                    <div className="mt-3 space-y-2 border-t border-slate-100 pt-2.5">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[#0F766E]">
                        📌 Spot Terkait Terverifikasi:
                      </p>
                      {msg.destinations.map((spot) => (
                        <a
                          key={spot.id}
                          href={`/explore?search=${encodeURIComponent(spot.name)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-between gap-2 rounded-xl border border-teal-100 bg-[#F0FDF4] p-2 text-[11px] font-semibold text-teal-900 transition-colors hover:bg-teal-100/80"
                        >
                          <div className="flex items-center gap-1.5 truncate">
                            <MapPin className="h-3.5 w-3.5 shrink-0 text-[#0F766E]" />
                            <span className="truncate">{spot.name}</span>
                          </div>
                          <div className="flex items-center gap-1 shrink-0 text-amber-700">
                            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                            <span>{spot.rating}</span>
                            <ExternalLink className="h-3 w-3 ml-1 text-slate-400" />
                          </div>
                        </a>
                      ))}
                    </div>
                  )}
                </div>

                <span className="mt-1 text-[9px] font-medium text-slate-400 px-1">
                  {msg.timestamp}
                </span>
              </div>
            ))}

            {/* Loading Typing Indicator */}
            {isLoading && (
              <div className="flex items-start gap-2">
                <div className="flex items-center gap-1 rounded-2xl rounded-tl-none border border-[#E2D6BE] bg-white px-4 py-3 text-xs text-slate-500 shadow-sm">
                  <Sparkles className="h-4 w-4 animate-spin text-[#0F766E]" />
                  <span>Muli AI sedang meracik fakta wisata...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* QUICK SUGGESTION PILLS */}
          {suggestedQueries.length > 0 && (
            <div className="border-t border-[#EAE0D0] bg-[#FFFDF8] px-3 py-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              {suggestedQueries.map((query, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(query)}
                  className="shrink-0 rounded-full border border-teal-200/80 bg-white px-3 py-1 text-[11px] font-semibold text-[#0F766E] shadow-sm transition-all hover:border-[#0F766E] hover:bg-teal-50 active:scale-95"
                >
                  {query}
                </button>
              ))}
            </div>
          )}

          {/* INPUT FORM */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="border-t border-[#E2D6BE] bg-white p-3 flex items-center gap-2"
          >
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Ketik pertanyaan wisata Lampung..."
              className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-800 focus:border-[#0F766E] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0F766E]"
              disabled={isLoading}
            />

            <button
              type="submit"
              disabled={!inputMessage.trim() || isLoading}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0F766E] text-white transition-all hover:bg-[#0D9488] disabled:opacity-40 disabled:hover:bg-[#0F766E]"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
