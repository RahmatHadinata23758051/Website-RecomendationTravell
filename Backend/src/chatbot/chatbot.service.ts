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

    // Multi-turn History Context Resolution
    const historyText = Array.isArray(history)
      ? history.map((h) => h.text.toLowerCase()).join(' ')
      : '';
    const combinedContext = `${historyText} ${lowerMessage}`.trim();

    // 0. Detect Simple Greetings (halo, hallo, hai, hi, p, etc.)
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

    // 1. Check for Out-Of-Scope Non-Tourism Queries (Domain Guardrails)
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

    // Handle Identity / Who are you queries
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

    // 2. Retrieve Relevant Destination Facts via RAG Retriever (2,889 dataset)
    const relevantFacts: DestinationFact[] = this.ragRetriever.retrieveRelevantFacts(combinedContext, regency, category);
    const ragContext = this.ragRetriever.buildRagContextPrompt(combinedContext, regency, category);

    // 3. Determine Model (Hybrid Routing: Gemini 1.5 Flash vs Gemini 1.5 Pro)
    const isComplex = this.isComplexItineraryQuery(message);
    const targetModel = isComplex ? 'gemini-1.5-pro' : 'gemini-1.5-flash';

    // 4. System Prompt & History (Natural Gemini Conversational Tone)
    const systemPrompt = `Anda adalah "Muli AI Concierge", Pemandu Wisata Digital & Customer Service Resmi Provinsi Lampung yang sangat ramah, hangat, luwes, dan berwawasan luas (gaya tutur luwes seperti AI Gemini).

ATURAN UTAMA PERILAKU:
1. Mulai jawaban dengan sapaan hangat "Tabik Pun! ✨" atau sapaan ramah alami.
2. Gunakan bahasa Indonesia yang santai, luwes, komunikatif, bersahabat, dan TIDAK KAKU seperti laporan teknis.
3. Jawab pertanyaan pengguna secara LANGSUNG dan SPESIFIK. Jika riwayat percakapan sebelumnya membahas kuliner dan pengguna bertanya "kalo di pesisir barat?", jawablah tentang KULINER di Pesisir Barat!
4. Gunakan fakta dari RAG Database berikut sebagai acuan tempat:
${ragContext}
5. Ceritakan dengan gaya narasi menarik. Sebutkan nama tempat, daya tarik utama, lokasi singkat, dan perkiraan biaya/rating secara mengalir.
6. Di akhir jawaban, tanyakan dengan ramah bantuan apa lagi yang pengguna butuhkan (misal: rute perjalanan, kuliner terdekat, atau penginapan).`;

    const formattedHistory = Array.isArray(history)
      ? history.slice(-5).map((h) => `${h.sender === 'user' ? 'Pengguna' : 'Muli AI'}: ${h.text}`).join('\n')
      : '';

    const fullPrompt = `${systemPrompt}\n\n${formattedHistory ? `RIWAYAT PERCAKAPAN SEBELUMNYA:\n${formattedHistory}\n\n` : ''}PERTANYAAN PENGGUNA TERBARU:\n${message}`;

    // 5. Check 9Router Gateway Integration First
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
          this.logger.log(`[9ROUTER GATEWAY SUCCESS] Received response via 9Router Combo.`);
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
        this.logger.warn(`[9ROUTER GATEWAY FAILOVER] 9Router proxy failed: ${err.message}. Falling back to direct Gemini / RAG Engine...`);
      }
    }

    // 6. Direct Gemini API Multi-Key Rotator Fallback
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
          const status = err.response?.status;
          this.logger.warn(`[GEMINI ROTATOR 429 SHIELD] Key index ${this.keyIndex} failed: ${err.message}`);
        }
      }
    }

    // 7. Intelligent Context-Aware Conversational AI Fallback
    this.logger.log(`[RAG ENGINE FALLBACK] Generating intelligent conversational RAG response with multi-turn memory.`);
    return this.executeLocalKbFallback(message, combinedContext, relevantFacts);
  }

  private executeLocalKbFallback(message: string, combinedContext: string, relevantFacts: DestinationFact[]) {
    const lowerMsg = message.toLowerCase();
    const lowerCtx = combinedContext.toLowerCase();

    const isKulinerQuery = lowerCtx.includes('kuliner') || lowerCtx.includes('makan') || lowerCtx.includes('seruit') || lowerCtx.includes('resto') || lowerCtx.includes('makanan');
    const isBeachQuery = lowerCtx.includes('pantai') || lowerCtx.includes('laut') || lowerCtx.includes('snorkeling') || lowerCtx.includes('surfing');

    // 1. Kuliner Intent (Context Aware across turns)
    if (isKulinerQuery) {
      if (lowerCtx.includes('pesisir barat') || lowerCtx.includes('krui')) {
        return {
          status: 'success',
          bot_name: 'Muli AI Concierge Lampung',
          model_used: 'rag-dataset-engine',
          data: {
            reply: `Tabik Pun! 🍲 Kalau untuk kuliner di **Pesisir Barat (Krui)**, juaranya adalah olahan **Ikan Tuhuk (Ikan Marlin Samudra)** segar hasil tangkapan nelayan lokal!

Berikut kuliner khas paling mantap di Krui yang wajib banget kamu coba:

🐟 **1. Gulai Taboh Ikan Tuhuk**
Kuah gurih santan kelapa muda khas Krui dengan bumbu rempah tradisional dan potongan daging ikan tuhuk tebal yang sangat lembut!

🍢 **2. Sate Ikan Tuhuk Krui**
Sate daging marlin segar yang dibakar dengan bumbu kecap pedas manis atau bumbu kacang khas pantai.

🍲 **3. Seruit Ikan Laut & Tempoyak Durian**
Ikan simba/marlin segar bakar disajikan dengan tempoyak durian fermentasi khas Lampung dan lalapan segar tepi pantai.

📍 *Rekomendasi Tempat*: Kamu bisa mencicipinya di **Kedai Nelayan Vanie** (Jl. Lintas Barat Sumatra) atau rumah makan seafood di sekitar Tanjung Setia & Labuhan Jukung!

Kira-kira mau Muli bantu rekomendasikan tempat inap atau pantai terdekatnya? 😊`,
            suggested_queries: [
              '🏖️ Rekomendasi pantai di Pesisir Barat',
              '🏄 Tempat surfing Tanjung Setia',
              '💰 Estimasi biaya liburan ke Krui',
            ],
            destinations: [],
          },
        };
      }

      if (lowerCtx.includes('bandar lampung')) {
        return {
          status: 'success',
          bot_name: 'Muli AI Concierge Lampung',
          model_used: 'rag-dataset-engine',
          data: {
            reply: `Tabik Pun! 🍲 Wah, Bandar Lampung adalah pusatnya kuliner lezat khas Lampung bro! 

Berikut rekomendasi tempat makan & oleh-oleh paling mantap di Bandar Lampung:

🍲 **1. Rumah Makan Seruit Ibu Hajah**
Pusat olahan Seruit tradisional khas Suku Lampung dengan ikan simba/patin bakar, sambal terasi, tempoyak durian, dan lalapan segar komplit!

🍗 **2. Rumah Makan Begadang V**
Sangat terkenal dengan Ayam Pop khas Lampung & Nasi Padang olahan rempah gurih khas yang sangat legendaris.

🍌 **3. Keripik Pisang Cokelat YenYen (Pusat Oleh-oleh Gang PU)**
Pusat keripik pisang anekarasa (cokelat lumer, keju, susu, kopi) terpopuler khas Bandar Lampung yang wajib dibawa pulang!

Mana nih yang paling bikin kamu penasaran untuk dicoba duluan? 😊`,
            suggested_queries: [
              '📍 Wisata hits Bandar Lampung',
              '🏖️ Rekomendasi pantai di Pesawaran',
              '💰 Estimasi biaya makan Seruit',
            ],
            destinations: [],
          },
        };
      }
    }

    // 2. Tulang Bawang / Tubaba Intent Handling
    if (lowerCtx.includes('tulang bawang')) {
      return {
        status: 'success',
        bot_name: 'Muli AI Concierge Lampung',
        data: {
          reply: `Tabik Pun! ✨ Wah, Kabupaten Tulang Bawang & Tulang Bawang Barat (Tubaba) itu kaya sekali akan wisata arsitektur ikonis dan sejarah budaya!

Berikut tempat paling mantap & fotogenik yang wajib kamu kunjungi di sana:

🏛️ **1. Islamic Center Tulang Bawang Barat (Masjid 99 Cahaya)**
Masjid tanpa kubah bergaya modern kontemporer yang sangat megah dan fotogenik di atas danau buatan.

🗿 **2. Kompleks Tugu Rato Nago Besanding**
Monumen ikonik berbentuk dua naga penarik kereta kencana khas budaya adat Lampung.

🌳 **3. Taman Kota & Ruang Terbuka Panaragan Jaya**
Taman hijau asri tempat bersantai keluarga dengan suasana sore hari yang sangat sejuk.

🏛️ **4. Taman Pemda & Kawasan Kota Menggala Heritage**
Pusat bersejarah kota kuno Menggala di tepi Sungai Tulang Bawang.

Ada yang ingin kamu tanyakan lebih lanjut mengenai rute jalan menuju Tubaba? 😊`,
          suggested_queries: [
            '📸 Spot foto Islamic Center Tubaba',
            '🚗 Rute perjalanan dari Bandar Lampung',
            '🍲 Kuliner khas Tulang Bawang',
          ],
          destinations: [],
        },
      };
    }

    // 3. Regency / Category Destination Response
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
          const cleanDesc = spot.description && spot.description.length > 10
            ? spot.description.slice(0, 110)
            : 'Destinasi indah khas Lampung yang sangat cocok untuk dinikmati bersama keluarga atau teman-teman.';

          return `${emoji} **${spot.name}**\n${cleanDesc}\n• 📍 *${spot.location}* | ⭐ *${spot.rating}★* | 💰 *${spot.price}*`;
        })
        .join('\n\n');

      const reply = `Tabik Pun! ✨ Wah, pilihan yang luar biasa! **${targetArea}** memang punya destinasi wisata menarik yang siap bikin liburanmu berkesan!

Berikut beberapa tempat rekomendasi pilihan Muli yang wajib banget kamu kunjungi di sana:

${spotsText}

Kira-kira destinasi mana nih yang paling bikin kamu penasaran? Muli siap bantu susunkan rute perjalanan atau rekomendasi tempat makan di sekitarnya! 😊`;

      return {
        status: 'success',
        bot_name: 'Muli AI Concierge Lampung (RAG Verified)',
        model_used: 'rag-dataset-engine',
        data: {
          reply,
          suggested_queries: [
            `🏖️ Rekomendasi tempat di ${targetArea}`,
            '🍲 Tempat makan Seruit khas Lampung',
            '💰 Estimasi biaya liburan terjangkau',
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

    // Default Conversational Topic Guide
    return {
      status: 'success',
      bot_name: 'Muli AI Concierge Lampung',
      model_used: 'rag-dataset-engine',
      data: {
        reply:
          'Tabik Pun! ✨ Halo! Saya Muli, Customer Service & AI Concierge Resmi Wisata Lampung.\n\nLampung memiliki keindahan wisata luar biasa! Untuk wisata bahari, Anda dapat mengunjungi **Pulau Pahawang** di Pesawaran & **Pantai Tanjung Setia** di Krui. Untuk kuliner khas, cobalah **Seruit** dan Keripik Pisang Cokelat khas Bandar Lampung!',
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
