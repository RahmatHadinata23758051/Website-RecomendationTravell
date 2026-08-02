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
  Palmtree,
  Utensils,
  Sun,
  BadgePercent,
  ShieldCheck,
  Headphones,
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

interface QuickPillItem {
  label: string;
  query: string;
  icon: React.ReactNode;
}

export const RadenGajahChatWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const initialWelcomeMessage: ChatMessage = {
    id: 'msg-welcome',
    sender: 'bot',
    text: 'Tabik Pun! Saya Muli, Customer Service & AI Concierge Resmi Wisata Lampung. Ada yang bisa Muli bantu untuk rencana liburan Anda hari ini?',
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  };

  const [messages, setMessages] = useState<ChatMessage[]>([initialWelcomeMessage]);

  const quickPillsList: QuickPillItem[] = [
    {
      label: 'Pantai Pesawaran',
      query: 'Rekomendasi pantai di Pesawaran',
      icon: <Palmtree className="h-3.5 w-3.5 text-teal-600" />,
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
    setIsLoading(true);

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
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `bot-err-${Date.now()}`,
          sender: 'bot',
          text: 'Tabik Pun! Maaf, terjadi kendala sinyal sementara. Ada yang bisa Muli bantu untuk rekomendasi tempat wisata Lampung lainnya?',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetChat = () => {
    setMessages([initialWelcomeMessage]);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans">
      {/* ------------------ PREMIUM CS FLOATING TOGGLE BUTTON ------------------ */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="group relative flex items-center gap-3.5 rounded-full border border-amber-300/60 bg-gradient-to-r from-[#0F766E] via-[#0D9488] to-[#047857] p-2 pr-5 text-white shadow-2xl transition-all duration-300 hover:scale-105 hover:shadow-teal-900/40 active:scale-95"
          aria-label="Buka Chatbot Muli AI Concierge Lampung"
        >
          {/* Online Pulsing Indicator */}
          <span className="absolute -left-1 -top-1 flex h-4 w-4">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex h-4 w-4 rounded-full bg-emerald-500 border-2 border-white"></span>
          </span>

          {/* Muli Mascot CS Avatar Badge */}
          <div className="relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border-2 border-amber-300 bg-[#FFFDF8] shadow-md">
            <img
              src="/assets/images/mascot/muli-lampung-mascot.png"
              alt="Muli AI CS Lampung"
              className="h-full w-full object-cover object-top scale-125"
            />
          </div>

          <div className="flex flex-col text-left">
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-300">
                CS AI CONCIERGE
              </span>
              <ShieldCheck className="h-3 w-3 text-amber-300" />
            </div>
            <span className="font-display text-sm font-extrabold text-white leading-tight">
              Tanya Muli AI
            </span>
          </div>
        </button>
      )}

      {/* ------------------ FLOATING CHAT WINDOW ------------------ */}
      {isOpen && (
        <div className="flex h-[580px] w-[380px] sm:w-[420px] flex-col overflow-hidden rounded-3xl border border-[#EBE0C9] bg-white shadow-2xl transition-all duration-300">
          {/* CS HEADER */}
          <div className="flex items-center justify-between border-b border-[#E2D6BE] bg-gradient-to-r from-[#0F766E] via-[#0D9488] to-[#047857] px-5 py-3.5 text-white shadow-sm">
            <div className="flex items-center gap-3">
              {/* High Quality Muli CS Avatar Header */}
              <div className="relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border-2 border-amber-300 bg-[#FFFDF8] shadow-md">
                <img
                  src="/assets/images/mascot/muli-lampung-mascot.png"
                  alt="Muli AI CS"
                  className="h-full w-full object-cover object-top scale-125"
                />
                <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-emerald-500"></span>
              </div>

              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-display text-base font-extrabold text-white leading-tight">
                    Muli AI Concierge
                  </h3>
                  <span className="rounded-full bg-amber-400/20 px-2 py-0.5 text-[9px] font-extrabold text-amber-200 border border-amber-300/40">
                    CS RESMI
                  </span>
                </div>
                <p className="text-[11px] font-medium text-emerald-100 flex items-center gap-1 mt-0.5">
                  <Headphones className="h-3 w-3 text-amber-300 inline" />
                  Pemandu Wisata Lampung (Tabik Pun!)
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
                  <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full border border-amber-300 bg-white shadow-sm mt-0.5">
                    <img
                      src="/assets/images/mascot/muli-lampung-mascot.png"
                      alt="Muli"
                      className="h-full w-full object-cover object-top scale-125"
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
                <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full border border-amber-300 bg-white shadow-sm mt-0.5">
                  <img
                    src="/assets/images/mascot/muli-lampung-mascot.png"
                    alt="Muli"
                    className="h-full w-full object-cover object-top scale-125"
                  />
                </div>
                <div className="flex items-center gap-2 rounded-2xl rounded-tl-none border border-[#E2D6BE] bg-white px-4 py-3 text-xs text-slate-600 shadow-sm">
                  <Sparkles className="h-4 w-4 animate-spin text-[#0F766E]" />
                  <span>Muli sedang meracik fakta pariwisata...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* QUICK SUGGESTION PILLS WITH REACT ICONS */}
          <div className="border-t border-[#EAE0D0] bg-[#FFFDF8] px-3 py-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
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
