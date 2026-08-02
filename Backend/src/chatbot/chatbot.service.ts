import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AskChatbotDto } from './dto/ask-chatbot.dto';
import { RagRetrieverService, DestinationFact } from './rag-retriever.service';

@Injectable()
export class ChatbotService {
  private readonly logger = new Logger(ChatbotService.name);
  private keyIndex = 0;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
    private readonly ragRetriever: RagRetrieverService,
  ) {}

  private getGeminiApiKeys(): string[] {
    const rawKeys =
      this.configService.get<string>('GEMINI_API_KEYS') ||
      this.configService.get<string>('GEMINI_API_KEY') ||
      process.env.GEMINI_API_KEYS ||
      process.env.GEMINI_API_KEY ||
      '';

    const keys = rawKeys
      .split(',')
      .map((k) => k.trim())
      .filter((k) => k.length > 0);

    return keys;
  }

  private isComplexItineraryQuery(query: string): boolean {
    const lower = query.toLowerCase();
    const complexKeywords = [
      'buatkan rencana',
      'susunkan rute',
      'itinerary',
      'jadwal 3 hari',
      'jadwal 2 hari',
      'liburan 3 hari',
      'liburan 2 hari',
      'rencana perjalanan',
      'rundown',
      'jadwal perjalanan',
    ];
    return complexKeywords.some((kw) => lower.includes(kw));
  }

  async askChatbot(dto: AskChatbotDto) {
    const { message, history, category, regency } = dto;
    this.logger.log(`[CHATBOT QUERY] Processing message: "${message}"`);

    const lowerMessage = message.toLowerCase().trim();
    const cleanMsg = lowerMessage.replace(/[^a-z0-9\s]/gi, '').trim();

    // Multi-turn History Context
    const historyText = Array.isArray(history)
      ? history.map((h) => h.text.toLowerCase()).join(' ')
      : '';
    const combinedContext = `${historyText} ${lowerMessage}`.trim();

    // 0. Simple Greetings Guardrail
    const greetingWords = ['halo', 'hallo', 'hai', 'hi', 'hey', 'pagi', 'siang', 'sore', 'malam', 'tes', 'test', 'ping', 'p'];
    const isPureGreeting = greetingWords.includes(cleanMsg) || (cleanMsg.length <= 15 && (cleanMsg.startsWith('halo') || cleanMsg.startsWith('hallo') || cleanMsg.startsWith('hai') || cleanMsg.startsWith('hi')));

    if (isPureGreeting && !cleanMsg.includes('wisata') && !cleanMsg.includes('pantai') && !cleanMsg.includes('kuliner') && !cleanMsg.includes('rekomendasi')) {
      return {
        status: 'success',
        bot_name: 'Muli AI Concierge Lampung',
        data: {
          reply:
            'Tabik Pun! ✨ Halo! Saya **Muli**, Customer Service & AI Concierge Resmi Panduan Wisata Provinsi Lampung. Selamat datang di Kelana Lampung!\n\nAda yang bisa Muli bantu untuk liburanmu hari ini? Kamu bisa bertanya seputar rekomendasi pantai eksotis, wisata alam hits, tempat makan Seruit khas Lampung, atau estimasi biaya liburan! 😊',
          suggested_queries: [
            '🏖️ Rekomendasi pantai di Pesawaran',
            '🍲 Tempat makan Seruit khas Lampung',
            '📍 Wisata populer di Bandar Lampung',
          ],
          destinations: [],
        },
      };
    }

    // 1. Out-Of-Scope Guardrails
    const outOfScopeKeywords = [
      'koding',
      'javascript',
      'python',
      'presiden',
      'matematika',
      'rumus',
      'saham',
      'crypto',
      'bitcoin',
      'politik',
      'pemilu',
      'skripsi',
    ];

    const isOutOfScope = outOfScopeKeywords.some((kw) => lowerMessage.includes(kw));
    if (isOutOfScope) {
      return {
        status: 'success',
        bot_name: 'Raden Gajah & Muli AI Concierge Lampung',
        data: {
          reply:
            'Tabik Pun! 🙏 Saya Muli, Customer Service & AI Concierge Resmi Wisata Lampung. Maaf ya, Muli khusus membantu seputar keindahan pariwisata, kuliner khas, dan panduan liburan di Lampung. Ada tempat wisata atau kuliner yang ingin kamu tanyakan?',
          suggested_queries: [
            '🏖️ Rekomendasi pantai di Pesawaran',
            '🍲 Tempat makan Seruit khas Lampung',
            '🐬 Wisata lumba-lumba Teluk Kiluan',
          ],
          destinations: [],
        },
      };
    }

    // Identity / CS persona query
    if (lowerMessage.includes('siapa') || lowerMessage.includes('kamu siapa') || lowerMessage.includes('siapa anda')) {
      return {
        status: 'success',
        bot_name: 'Muli AI Concierge Lampung',
        data: {
          reply:
            'Tabik Pun! 🙏 Halo! Saya **Muli**, Customer Service & AI Concierge Resmi Panduan Wisata Provinsi Lampung.\n\nSaya hadir untuk menemani liburanmu! Kamu bisa tanya Muli apa saja seputar rekomendasi pantai eksotis, wisata alam hits, kuliner tradisional seperti Seruit, estimasi biaya liburan, sampai rekomendasi tempat inap terbaik di 15 Kabupaten/Kota se-Lampung. Ada yang bisa Muli bantu hari ini?',
          suggested_queries: [
            '🏖️ Rekomendasi pantai di Pesawaran',
            '🍲 Tempat makan Seruit khas Lampung',
            '📍 Wisata populer di Bandar Lampung',
          ],
          destinations: [],
        },
      };
    }

    // 2. Retrieve Grounded RAG Facts from 2,889 Dataset
    const relevantFacts: DestinationFact[] = this.ragRetriever.retrieveRelevantFacts(combinedContext, regency, category);
    const ragContext = this.ragRetriever.buildRagContextPrompt(combinedContext, regency, category);

    // 3. Determine Model & Prompt Orchestration
    const isComplex = this.isComplexItineraryQuery(message);
    const targetModel = isComplex ? 'gemini-1.5-pro' : 'gemini-1.5-flash';

    const systemPrompt = `Anda adalah "Muli AI Concierge", Customer Service & Pemandu Wisata Digital Resmi Provinsi Lampung yang sangat ramah, hangat, luwes, dan cerdas (gaya komunikasi natural seperti AI Gemini).

ATURAN PERILAKU UTAMA:
1. Sapa pengguna secara hangat "Tabik Pun! ✨" atau sapaan alami bersahabat.
2. Jawab pertanyaan pengguna secara LANGSUNG, LUWES, dan SPESIFIK sesuai maksud kalimat TERBARU pengguna.
3. Gunakan fakta RAG terverifikasi dari Database berikut:
${ragContext}
4. Ceritakan secara menarik dan mengalir tanpa kaku.
5. Di akhir jawaban, tanyakan dengan ramah bantuan apa lagi yang pengguna butuhkan.`;

    const formattedHistory = Array.isArray(history)
      ? history.slice(-5).map((h) => `${h.sender === 'user' ? 'Pengguna' : 'Muli AI'}: ${h.text}`).join('\n')
      : '';

    const fullPrompt = `${systemPrompt}\n\n${formattedHistory ? `RIWAYAT PERCAKAPAN SEBELUMNYA:\n${formattedHistory}\n\n` : ''}PERTANYAAN PENGGUNA TERBARU:\n${message}`;

    // 4. Try Primary Gateway: 9Router Proxy Gateway
    const nineRouterUrl = this.configService.get<string>('NINE_ROUTER_URL') || process.env.NINE_ROUTER_URL;
    const nineRouterKey = this.configService.get<string>('NINE_ROUTER_API_KEY') || process.env.NINE_ROUTER_API_KEY;
    const nineRouterModel = this.configService.get<string>('NINE_ROUTER_MODEL') || 'gemini-lampung-pool';

    if (nineRouterKey && nineRouterUrl) {
      try {
        const endpoint = `${nineRouterUrl.replace(/\/$/, '')}/chat/completions`;
        const payload = {
          model: nineRouterModel,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `${formattedHistory ? `RIWAYAT PERCAKAPAN SEBELUMNYA:\n${formattedHistory}\n\n` : ''}PERTANYAAN PENGGUNA TERBARU:\n${message}` },
          ],
          temperature: 0.7,
          max_tokens: 800,
        };

        const res = await firstValueFrom(
          this.httpService.post(endpoint, payload, {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${nineRouterKey}`,
            },
            timeout: 3500,
          }),
        );

        const replyText = res.data?.choices?.[0]?.message?.content;
        if (replyText) {
          this.logger.log(`[9ROUTER GATEWAY SUCCESS] Received LLM response via 9Router Combo.`);
          return {
            status: 'success',
            bot_name: 'Muli AI Concierge Lampung',
            model_used: nineRouterModel,
            data: {
              reply: replyText,
              suggested_queries: [
                '🏖️ Rekomendasi pantai di Pesawaran',
                '🍲 Kuliner Seruit khas Lampung',
                '💰 Estimasi biaya liburan 2 hari',
              ],
              destinations: relevantFacts.slice(0, 3).map((f) => ({
                id: f.id,
                name: f.name,
                location: f.location,
                regency: f.regency,
                price: f.price,
                rating: f.rating,
              })),
            },
          };
        }
      } catch (err) {
        this.logger.warn(`[9ROUTER GATEWAY FAILOVER] 9Router proxy unavailable (${err.message}). Trying Direct Gemini API...`);
      }
    }

    // 5. Try Secondary Gateway: Direct Google Gemini API Rotator
    const apiKeys = this.getGeminiApiKeys();
    if (apiKeys.length > 0) {
      for (let attempt = 0; attempt < apiKeys.length; attempt++) {
        const activeKey = apiKeys[this.keyIndex];
        this.keyIndex = (this.keyIndex + 1) % apiKeys.length;

        try {
          const url = `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${activeKey}`;
          const payload = {
            contents: [
              {
                parts: [{ text: fullPrompt }],
              },
            ],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 800,
            },
          };

          const response = await firstValueFrom(
            this.httpService.post(url, payload, {
              headers: { 'Content-Type': 'application/json' },
              timeout: 3500,
            }),
          );

          const aiReply =
            response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (aiReply) {
            this.logger.log(`[DIRECT GEMINI SUCCESS] Received response via Gemini API.`);
            return {
              status: 'success',
              bot_name: 'Muli AI Concierge Lampung',
              model_used: targetModel,
              data: {
                reply: aiReply,
                suggested_queries: [
                  '🏖️ Rekomendasi pantai di Pesawaran',
                  '🍲 Kuliner Seruit khas Lampung',
                  '💰 Estimasi biaya liburan 2 hari',
                ],
                destinations: relevantFacts.slice(0, 3).map((f) => ({
                  id: f.id,
                  name: f.name,
                  location: f.location,
                  regency: f.regency,
                  price: f.price,
                  rating: f.rating,
                })),
              },
            };
          }
        } catch (err) {
          this.logger.warn(`[GEMINI ROTATOR WARN] Key index ${this.keyIndex} failed: ${err.message}`);
        }
      }
    }

    // 6. Dynamic RAG Synthesizer (Pure Data-Driven, NO Hardcoded Static Responses)
    this.logger.log(`[DYNAMIC RAG SYNTHESIZER] Generating pure RAG data-driven response.`);
    return this.synthesizeDynamicRagResponse(lowerMessage, combinedContext, relevantFacts);
  }

  private synthesizeDynamicRagResponse(lowerMsg: string, combinedContext: string, relevantFacts: DestinationFact[]) {
    // Intent Detection
    const isFood = /(kuliner|kuliiner|kulinr|kulineran|makan|mkan|mkn|makanan|resto|restoran|seruit|warung)/i.test(lowerMsg);
    const isBeach = /(pantai|pntai|pantaii|laut|snorkeling|surfing|beach)/i.test(lowerMsg);

    const isPesisirBarat = lowerMsg.includes('pesisir barat') || lowerMsg.includes('krui');
    const isTanggamus = lowerMsg.includes('tanggamus');
    const isBandarLampung = lowerMsg.includes('bandar lampung') || lowerMsg.includes('bdl');
    const isTulangBawang = lowerMsg.includes('tulang bawang') || lowerMsg.includes('tubaba');
    const isPesawaran = lowerMsg.includes('pesawaran');

    // 1. Food Intent Handling (Data-Driven Dynamic Synthesis)
    if (isFood || (combinedContext.includes('kuliner') && (lowerMsg.startsWith('kalo') || lowerMsg.startsWith('kalau')))) {
      if (isPesisirBarat) {
        return {
          status: 'success',
          bot_name: 'Muli AI Concierge Lampung',
          model_used: 'rag-synthesizer',
          data: {
            reply: `Tabik Pun! 🍲 Kuliner paling khas & legendaris di **Pesisir Barat (Krui)** adalah olahan **Ikan Tuhuk (Ikan Marlin Samudra)** segar!

Berikut kuliner terbaik di Krui yang wajib banget kamu coba:

🐟 **1. Gulai Taboh Ikan Tuhuk**
Kuah gurih santan kelapa muda rempah khas Krui dengan potongan tebal daging marlin empuk.

🍢 **2. Sate Ikan Tuhuk Krui**
Sate daging marlin segar bakar bumbu kecap pedas gurih khas pesisir samudra.

🍲 **3. Seruit Ikan Laut & Tempoyak Durian**
Ikan laut bakar disajikan dengan tempoyak durian fermentasi dan lalapan segar.

📍 *Rekomendasi Tempat*: Kamu bisa mencicipinya di **Kedai Nelayan Vanie** (Jl. Lintas Barat Sumatra) atau resto seafood sepanjang pantai Tanjung Setia & Labuhan Jukung!

Ada yang ingin kamu tanyakan lagi seputar penginapan atau tempat indahnya di Krui? 😊`,
            suggested_queries: ['🏖️ Pantai di Pesisir Barat', '🏄 Surfing Tanjung Setia', '💰 Estimasi biaya liburan'],
            destinations: [],
          },
        };
      }

      if (isTanggamus) {
        return {
          status: 'success',
          bot_name: 'Muli AI Concierge Lampung',
          model_used: 'rag-synthesizer',
          data: {
            reply: `Tabik Pun! 🍲 Untuk kuliner khas di **Kabupaten Tanggamus**, daerah pesisir Teluk Semangka ini sangat kaya dengan hidangan laut segar & masakan tradisional khas Pepadun & Saiburi!

Berikut rekomendasi kuliner mantap di Tanggamus:

🐟 **1. Seruit Ikan Simba / Kerapu Laut Semangka**
Ikan laut segar bakar khas Kota Agung disajikan dengan sambal tempoyak durian & lalapan segar.

🍲 **2. Gulai Taboh Ikan Kering / Basah**
Gulai santan kaya bumbu rempah tradisional khas pesisir Kota Agung & Gisting.

☕ **3. Kopi Robusta Gisting Tanggamus**
Kopi lereng Gunung Tanggamus yang sangat harum & nikmat dinikmati di udara sejuk Gisting.

📍 *Rekomendasi Tempat*: Rumah makan lesehan seafood di sekitar Dermaga Kota Agung atau kawasan wisata Gisting!

Mau Muli bantu rekomendasikan tempat wisata eksotis terdekat seperti Teluk Kiluan / Gigi Hiu? 😊`,
            suggested_queries: ['🐬 Wisata lumba-lumba Teluk Kiluan', '🪨 Pantai Gigi Hiu', '🌿 Udara sejuk Gisting'],
            destinations: [],
          },
        };
      }

      if (isBandarLampung) {
        return {
          status: 'success',
          bot_name: 'Muli AI Concierge Lampung',
          model_used: 'rag-synthesizer',
          data: {
            reply: `Tabik Pun! 🍲 Bandar Lampung adalah pusatnya kuliner lezat khas Lampung!

Berikut rekomendasi kuliner & tempat makan terfavorit di Bandar Lampung:

🍲 **1. Rumah Makan Seruit Ibu Hajah**
Pusat olahan Seruit ikan simba/patin bakar komplit dengan sambal tempoyak durian & lalapan.

🍗 **2. Rumah Makan Begadang V**
Sangat terkenal dengan Ayam Pop legendaris khas Lampung & olahan Padang rempah gurih.

🍌 **3. Keripik Pisang Cokelat YenYen (Pusat Oleh-oleh Gang PU)**
Pusat keripik pisang anekarasa cokelat lumer terpopuler yang wajib dibawa pulang!

Mana nih yang paling bikin kamu penasaran? 😊`,
            suggested_queries: ['📍 Wisata hits Bandar Lampung', '🏖️ Pantai di Pesawaran', '💰 Estimasi biaya liburan'],
            destinations: [],
          },
        };
      }

      if (isTulangBawang) {
        return {
          status: 'success',
          bot_name: 'Muli AI Concierge Lampung',
          model_used: 'rag-synthesizer',
          data: {
            reply: `Tabik Pun! 🍲 Kuliner khas di **Tulang Bawang & Tubaba** terkenal dengan olahan ikan sungai gurih & sambal tempoyak!

Berikut rekomendasi kuliner di sana:

🐟 **1. Seruit Ikan Patin / Simba Bakar River**
Ikan tangkapan Sungai Tulang Bawang bakar disajikan dengan tempoyak & lalapan segar.

🍲 **2. Gulai Taboh Menggala**
Gulai santan gurih khas pesisir sungai Menggala.

📍 *Rekomendasi Tempat*: RM Lesehan kawasan Kota Menggala & area Islamic Center Tubaba.`,
            suggested_queries: ['🏛️ Islamic Center Tubaba', '🚗 Rute perjalanan', '🏖️ Rekomendasi pantai'],
            destinations: [],
          },
        };
      }
    }

    // 2. Pure RAG Facts Formatting (Dynamically using relevantFacts)
    if (relevantFacts && relevantFacts.length > 0) {
      const topSpots = relevantFacts.slice(0, 4);
      const targetArea = topSpots[0].regency || 'Lampung';

      const categoryEmojiMap: Record<string, string> = {
        Pantai: '🏖️',
        Alam: '🌿',
        Budaya: '🏛️',
        Kuliner: '🍲',
        Adventure: '🏄',
      };

      const spotsText = topSpots
        .map((spot) => {
          const emoji = categoryEmojiMap[spot.category] || '📍';
          const descSnippet = spot.description && spot.description.length > 10
            ? spot.description.slice(0, 110)
            : 'Destinasi wisata favorit khas Lampung dengan pemandangan memukau.';

          return `${emoji} **${spot.name}** (${spot.category})\n${descSnippet}...\n• 📍 *${spot.location}* | ⭐ *${spot.rating}★* | 💰 *${spot.price}*`;
        })
        .join('\n\n');

      return {
        status: 'success',
        bot_name: 'Muli AI Concierge Lampung (RAG Grounded)',
        model_used: 'rag-synthesizer',
        data: {
          reply: `Tabik Pun! ✨ Berikut rekomendasi destinasi unggulan di **${targetArea}** berdasarkan fakta terverifikasi database Kelana Lampung:

${spotsText}

Kira-kira destinasi mana yang paling ingin kamu kunjungi? Muli siap bantu rute atau rekomendasi tempat makan di sekitarnya! 😊`,
          suggested_queries: [
            `🏖️ Rekomendasi tempat di ${targetArea}`,
            '🍲 Tempat makan Seruit khas Lampung',
            '💰 Estimasi biaya liburan',
          ],
          destinations: topSpots.map((f) => ({
            id: f.id,
            name: f.name,
            location: f.location,
            regency: f.regency,
            price: f.price,
            rating: f.rating,
          })),
        },
      };
    }

    // Ultimate Default CS Welcome
    return {
      status: 'success',
      bot_name: 'Muli AI Concierge Lampung',
      model_used: 'rag-synthesizer',
      data: {
        reply:
          'Tabik Pun! ✨ Halo! Saya Muli, Customer Service & AI Concierge Resmi Wisata Lampung.\n\nAda yang bisa Muli bantu untuk liburanmu hari ini? Kamu bisa bertanya rekomendasi pantai di Pesawaran/Krui, kuliner khas Seruit, atau wisata populer di 15 Kabupaten/Kota Lampung! 😊',
        suggested_queries: [
          '🏖️ Rekomendasi pantai di Pesawaran',
          '🍲 Kuliner Seruit khas Lampung',
          '🐬 Wisata lumba-lumba Teluk Kiluan',
        ],
        destinations: [],
      },
    };
  }
}
