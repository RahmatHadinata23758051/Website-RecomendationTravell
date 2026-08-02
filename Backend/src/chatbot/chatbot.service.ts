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

    // 1. Check for Out-Of-Scope Non-Tourism Queries (Domain Guardrails)
    const lowerMessage = message.toLowerCase();
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
    const relevantFacts: DestinationFact[] = this.ragRetriever.retrieveRelevantFacts(message, regency, category);
    const ragContext = this.ragRetriever.buildRagContextPrompt(message, regency, category);

    // 3. Determine Model (Hybrid Routing: Gemini 1.5 Flash vs Gemini 1.5 Pro)
    const isComplex = this.isComplexItineraryQuery(message);
    const targetModel = isComplex ? 'gemini-1.5-pro' : 'gemini-1.5-flash';

    // 4. System Prompt & History (Natural Gemini Conversational Tone)
    const systemPrompt = `Anda adalah "Muli AI Concierge", Pemandu Wisata Digital & Customer Service Resmi Provinsi Lampung yang sangat ramah, hangat, luwes, dan berwawasan luas (gaya tutur luwes seperti AI Gemini).

ATURAN UTAMA PERILAKU:
1. Mulai jawaban dengan sapaan hangat "Tabik Pun! ✨" atau sapaan ramah alami.
2. Gunakan bahasa Indonesia yang santai, luwes, komunikatif, bersahabat, dan TIDAK KAKU seperti laporan teknis.
3. Gunakan fakta dari RAG Database berikut sebagai acuan tempat:
${ragContext}
4. Saat merekomendasikan tempat, ceritakan dengan gaya narasi menarik. Sebutkan nama tempat, daya tarik utama, lokasi singkat, dan perkiraan biaya/rating secara mengalir.
5. Di akhir jawaban, tanyakan dengan ramah bantuan apa lagi yang pengguna butuhkan (misal: rute perjalanan, kuliner terdekat, atau penginapan).`;

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

    // 7. Humanized RAG Knowledge Engine Fallback (Warm Conversational Tone)
    this.logger.log(`[RAG ENGINE FALLBACK] Generating warm conversational RAG response from dataset.`);
    return this.executeLocalKbFallback(message, relevantFacts);
  }

  private executeLocalKbFallback(message: string, relevantFacts: DestinationFact[]) {
    const lower = message.toLowerCase();

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
    let reply =
      'Tabik Pun! ✨ Halo! Saya Muli, Customer Service & AI Concierge Resmi Wisata Lampung. Senang sekali bisa menyambutmu di Kelana Lampung!';

    if (lower.includes('pantai') || lower.includes('laut')) {
      reply =
        'Tabik Pun! ✨ Kalau kamu suka wisata bahari, Lampung itu rajanya! Kamu wajib coba snorkeling melihat Ikan Nemo di **Pulau Pahawang**, pantai pasir putih **Sari Ringgung** di Pesawaran, atau merasakan ombak surfing kelas dunia di **Pantai Tanjung Setia Krui**, Pesisir Barat! 🌊\n\nMau Muli rekomendasikan pantai di kabupaten tertentu?';
    } else if (lower.includes('kuliner') || lower.includes('makan') || lower.includes('seruit')) {
      reply =
        'Tabik Pun! 🍲 Bicara soal kuliner khas Lampung, juara utamanya tentu saja **Seruit**! Ikan segar bakar yang disajikan dengan sambal tempoyak durian khas, sambal terasi, dan lalapan segar. Untuk buah tangan, Keripik Pisang Cokelat khas Bandar Lampung adalah favorit yang wajib dibeli!\n\nMau Muli pilihkan tempat makan Seruit paling enak di Bandar Lampung?';
    } else if (lower.includes('pahawang') || lower.includes('snorkeling')) {
      reply =
        'Tabik Pun! 🏝️ **Pulau Pahawang** di Pesawaran itu destinasi favorit banget untuk island hopping dan snorkeling! Air lautnya jernih dengan terumbu karang alami dan spot foto foto ikan nemo yang ikonik.\n\nWaktu terbaik berkunjung adalah pagi hari sekitar jam 07:00 - 13:00 WIB. Mau Muli bantu rekomendasikan paket open trip atau spot foto cantiknya?';
    } else if (lower.includes('gajah') || lower.includes('way kambas')) {
      reply =
        'Tabik Pun! 🐘 **Taman Nasional Way Kambas** di Lampung Timur adalah salah satu pusat konservasi & sekolah gajah tertua di Asia! Di sini kamu bisa berinteraksi langsung dengan gajah Sumatera yang ramah dan belajar konservasi alam.\n\nAda yang ingin kamu tanyakan mengenai rute menuju ke sana?';
    }

    return {
      status: 'success',
      bot_name: 'Muli AI Concierge Lampung',
      model_used: 'rag-dataset-engine',
      data: {
        reply,
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
