import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Send,
  RefreshCw,
  RotateCcw,
  ExternalLink,
  MapPin,
  Star,
  Compass,
  Palmtree,
  Utensils,
  Sun,
  BadgePercent,
  Headphones,
  AlertTriangle,
} from 'lucide-react';
import {
  askRadenGajahChatbot,
  ChatHistoryItem,
  RecommendedDestinationFact,
} from '../services/chatbotApi';
import { useAuth } from '../context/AuthContext';
import { getApiErrorMessage } from '../lib/api';

interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: string;
  destinations?: RecommendedDestinationFact[];
}

interface QuickPillItem {
  label: string;
  query: string;
  icon: React.ReactNode;
}

export const RadenGajahChatWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const { isAuthenticated } = useAuth();

  const initialWelcomeMessage: ChatMessage = {
    id: 'msg-welcome',
    sender: 'bot',
    text: isAuthenticated
      ? 'Tabik Pun! Selamat datang kembali. Saya asisten KelanaLampung. Dengan login, saya akses preferensi dan itinerary tersimpan kamu untuk saran lebih personal. Ada yang bisa dibantu?'
      : 'Tabik Pun! Saya asisten wisata KelanaLampung. Mode Publik — tanya pantai, kuliner, estimasi biaya, atau tips liburan. Login untuk perencanaan personal dan itinerary tersimpan.',
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  };

  const [messages, setMessages] = useState<ChatMessage[]>([initialWelcomeMessage]);

  const quickPillsList: QuickPillItem[] = [
    {
      label: 'Pantai Pesawaran',
      query: 'Rekomendasi pantai di Pesawaran',
      icon: <Palmtree className="h-3.5 w-3.5 text-teal-800" />,
    },
    {
      label: 'Kuliner Seruit',
      query: 'Tempat makan Seruit khas Lampung',
      icon: <Utensils className="h-3.5 w-3.5 text-amber-600" />,
    },
    {
      label: 'Lumba-Lumba Kiluan',
      query: 'Wisata lumba-lumba Teluk Kiluan',
      icon: <Sun className="h-3.5 w-3.5 text-sky-600" />,
    },
    {
      label: 'Paket Hemat 200rb',
      query: 'Rekomendasi wisata terjangkau 200rb',
      icon: <BadgePercent className="h-3.5 w-3.5 text-emerald-600" />,
    },
  ];

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
    setErrorMessage('');
    setIsLoading(true);

    const history: ChatHistoryItem[] = messages.slice(-5).map((m) => ({
      sender: m.sender,
      text: m.text,
    }));

    try {
      const responseData = await askRadenGajahChatbot({
        message: query,
        history,
        mode: isAuthenticated ? 'authenticated' : 'public',
      });

      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        text: responseData.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        destinations: responseData.destinations,
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      setErrorMessage(
        getApiErrorMessage(err, 'Layanan asisten wisata sedang tidak tersedia. Silakan coba lagi.'),
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetChat = () => {
    setMessages([initialWelcomeMessage]);
    setErrorMessage('');
  };

  return (
    <div className="fixed bottom-3 right-3 z-50 max-w-[calc(100vw-1.5rem)] font-sans sm:bottom-6 sm:right-6">
      {/* ------------------ FLOATING CHAT BUTTON ------------------ */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="group relative flex items-center gap-3 rounded-full bg-[#0F766E] p-2 pr-4 text-white shadow-xl transition-all duration-300 hover:scale-105 hover:shadow-teal-900/40 active:scale-95"
          aria-label="Buka Asisten Wisata KelanaLampung"
        >
          {/* Online Pulsing Indicator */}
          <span className="absolute -left-1 -top-1 flex h-4 w-4">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex h-4 w-4 rounded-full bg-emerald-500 border-2 border-white"></span>
          </span>

          {/* Chatbot avatar badge */}
          <div className="relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border-2 border-amber-300 bg-[#FFFDF8] shadow-md">
            <img
              src="/assets/images/mascot/muli-avatar-face.png"
              alt="Asisten Wisata Lampung"
              className="h-full w-full object-cover"
            />
          </div>

          <span className="font-display text-sm font-extrabold text-white leading-tight hidden sm:block">
            Tanya Asisten
          </span>
        </button>
      )}

      {/* ------------------ FLOATING CHAT WINDOW ------------------ */}
      {isOpen && (
        <div className="flex h-[min(580px,85vh)] w-[calc(100vw-1.5rem)] sm:w-[380px] max-w-[420px] flex-col overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-2xl transition-all duration-300">
          {/* CS HEADER - Clean & Minimal */}
          <div className="flex items-center justify-between border-b border-slate-200/80 bg-[#0F766E] px-4 py-3 text-white shadow-sm">
            <div className="flex items-center gap-2.5">
              <div className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border-2 border-amber-300 bg-[#FFFDF8] shadow-md">
                <img
                  src="/assets/images/mascot/muli-avatar-face.png"
                  alt="Asisten Wisata Lampung"
                  className="h-full w-full object-cover"
                />
                <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500"></span>
              </div>
              <div>
                <h3 className="font-display text-sm font-extrabold text-white leading-tight">
                  Asisten KelanaLampung
                </h3>
                <p className="text-[10px] font-medium text-emerald-100 flex items-center gap-1">
                  <Headphones className="h-2.5 w-2.5 text-amber-300 inline" />
                  Pemandu Wisata Lampung
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
                className={`flex gap-2.5 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {/* Bot Avatar on Left Side */}
                {msg.sender === 'bot' && (
                  <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full border-2 border-amber-300 bg-[#FFFDF8] shadow-sm mt-0.5">
                    <img
                      src="/assets/images/mascot/muli-avatar-face.png"
                      alt="Asisten Wisata Lampung"
                      className="h-full w-full object-cover"
                    />
                  </div>
                )}

                <div
                  className={`max-w-[82%] rounded-2xl px-4 py-3 text-xs leading-relaxed shadow-sm ${
                    msg.sender === 'user'
                      ? 'rounded-tr-none bg-[#0F766E] text-white font-medium'
                      : 'rounded-tl-none border border-[#E2D6BE] bg-white text-slate-800'
                  }`}
                >
                  <div className="whitespace-pre-line">{msg.text}</div>

                  {/* Recommended Destinations Cards in Chat Bubble */}
                  {msg.destinations && msg.destinations.length > 0 && (
                    <div className="mt-3 space-y-2 border-t border-slate-100 pt-2.5">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[#0F766E] flex items-center gap-1">
                        <Compass className="h-3 w-3" /> Spot Terkait Terverifikasi:
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

                  <div className="mt-1 text-[9px] font-medium text-slate-400 text-right">
                    {msg.timestamp}
                  </div>
                </div>
              </div>
            ))}

            {/* Loading Indicator */}
            {isLoading && (
              <div className="flex items-start gap-2.5">
                <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full border-2 border-amber-300 bg-[#FFFDF8] shadow-sm mt-0.5">
                  <img
                    src="/assets/images/mascot/muli-avatar-face.png"
                    alt="Asisten Wisata Lampung"
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="flex items-center gap-2 rounded-2xl rounded-tl-none border border-[#E2D6BE] bg-white px-4 py-3 text-xs text-slate-600 shadow-sm">
                  <RefreshCw className="h-4 w-4 animate-spin text-[#0F766E]" />
                  <span>Menyiapkan informasi wisata...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* AI ERROR STATE (honest: no fabricated fallback reply) */}
          {errorMessage && (
            <div
              role="alert"
              className="flex items-start gap-2 border-t border-red-200 bg-red-50 px-3 py-2.5 text-[11px] text-red-800"
            >
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-600" />
              <p className="flex-1 leading-snug">{errorMessage}</p>
              <button
                type="button"
                onClick={() => setErrorMessage('')}
                className="shrink-0 rounded-md px-1.5 py-0.5 font-semibold text-red-700 hover:bg-red-100"
              >
                Tutup
              </button>
            </div>
          )}

          {/* QUICK SUGGESTION PILLS WITH REACT ICONS */}
          <div className="border-t border-[#EAE0D0] bg-[#FFFDF8] px-3 py-2 flex items-center gap-1.5 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            {quickPillsList.map((item, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(item.query)}
                className="shrink-0 rounded-full border border-teal-200/80 bg-white px-3 py-1 text-[11px] font-semibold text-[#0F766E] shadow-sm transition-all hover:border-[#0F766E] hover:bg-teal-50 active:scale-95 flex items-center gap-1.5"
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            ))}
          </div>

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
              placeholder="Tanyakan pantai, kuliner, atau tips liburan..."
              className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-800 focus:border-[#0F766E] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0F766E]"
              disabled={isLoading}
            />

            <button
              type="submit"
              aria-label="Kirim pesan ke Asisten Wisata"
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
