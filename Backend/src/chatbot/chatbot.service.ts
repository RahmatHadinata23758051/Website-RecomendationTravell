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
            'Tabik Pun! Saya Muli, Customer Service & AI Concierge Resmi Wisata Lampung. Maaf, Muli hanya dapat menjawab pertanyaan seputar tempat wisata, kuliner, dan rute liburan di Lampung. Ada yang ingin Anda tanyakan seputar pantai atau tempat makan khas Lampung?',
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
            'Tabik Pun! 🙏 Saya **Muli**, Customer Service & AI Concierge Resmi Panduan Wisata Provinsi Lampung.\n\nSaya didesain khusus untuk membantu Anda menemukan destinasi wisata pantai terbaik, kuliner khas seperti Seruit, estimasi biaya liburan, serta rute perjalanan terverifikasi di 15 Kabupaten/Kota se-Lampung!',
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

    // 4. System Prompt & History
    const systemPrompt = `Anda adalah "Muli AI Concierge", Customer Service & Pemandu Wisata Digital Resmi Provinsi Lampung yang ramah, sopan, dan berwawasan luas.

ATURAN UTAMA PERILAKU:
1. Mulai jawaban dengan sapaan khas Lampung "Tabik Pun!" jika ini awal percakapan atau pertanyaan baru.
2. Gunakan gaya bahasa hangat, sopan, dan ramah khas Customer Service pemandu wisata lokal profesional.
3. Jawab HANYA berdasarkan fakta terverifikasi dari RAG Database berikut:
${ragContext}
4. Jika nama tempat dalam RAG Database cocok dengan pertanyaan pengguna, sebutkan nama tempat tersebut secara eksplisit beserta estimasi harga tiket, jam buka, dan lokasinya.
5. Bersikap jujur dan transparan. Jika informasi tidak ada di database, sampaikan dengan ramah tanpa mengarang cerita palsu.
6. Berikan respons yang jelas, rapi dengan poin-poin jika merekomendasikan beberapa tempat.`;

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
            bot_name: 'Muli AI Concierge Lampung (via 9Router)',
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

    // 7. Rich RAG Knowledge Engine Fallback (Instant & Detailed Fact Response)
    this.logger.log(`[RAG ENGINE FALLBACK] Generating rich factual RAG response from 2,889 dataset.`);
    return this.executeLocalKbFallback(message, relevantFacts);
  }

  private executeLocalKbFallback(message: string, relevantFacts: DestinationFact[]) {
    const lower = message.toLowerCase();

    if (relevantFacts && relevantFacts.length > 0) {
      const topSpots = relevantFacts.slice(0, 4);
      const spotsText = topSpots
        .map(
          (spot, idx) =>
            `${idx + 1}. 📍 **${spot.name}** (${spot.category})\n   • **Lokasi**: ${spot.location}\n   • **Estimasi Biaya**: ${spot.price}\n   • **Rating**: ${spot.rating}★\n   • **Fasilitas**: ${spot.facilities.slice(0, 4).join(', ')}\n   • **Info**: ${spot.description.slice(0, 120)}...`,
        )
        .join('\n\n');

      const targetArea = topSpots[0].regency;
      const reply = `Tabik Pun! 🙏 Berikut rekomendasi destinasi wisata unggulan di **${targetArea}** berdasarkan fakta terverifikasi database Kelana Lampung:\n\n${spotsText}\n\nAda yang ingin Anda tanyakan lebih lanjut seputar rute perjalanannya?`;

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

    // Default Topic Guide
    let reply =
      'Tabik Pun! Saya Muli, Customer Service & AI Concierge Resmi Wisata Lampung. Selamat datang di Kelana Lampung!';

    if (lower.includes('pantai') || lower.includes('laut')) {
      reply =
        'Tabik Pun! Lampung terkenal dengan wisata bahari kelas dunia seperti **Pulau Pahawang** (spot snorkeling & ikan nemo), **Pantai Sari Ringgung** di Pesawaran, serta **Pantai Tanjung Setia Krui** di Pesisir Barat yang sangat terkenal di mancanegara untuk olahraga surfing.';
    } else if (lower.includes('kuliner') || lower.includes('makan') || lower.includes('seruit')) {
      reply =
        'Tabik Pun! Kuliner khas utama Suku Lampung yang wajib Anda coba adalah **Seruit** (ikan segar bakar/goreng diolah bersama sambal terasi, tempoyak durian fermentasi, dan lalapan segar). Untuk oleh-oleh, Keripik Pisang Cokelat khas Bandar Lampung adalah pilihan terpopuler!';
    } else if (lower.includes('pahawang') || lower.includes('snorkeling')) {
      reply =
        'Tabik Pun! **Pulau Pahawang** di Kabupaten Pesawaran adalah tempat terbaik untuk island hopping & snorkeling dengan terumbu karang alami dan spot Ikan Nemo. Waktu terbaik berkunjung adalah pukul 07:00 - 13:00 WIB.';
    } else if (lower.includes('gajah') || lower.includes('way kambas')) {
      reply =
        'Tabik Pun! **Taman Nasional Way Kambas** di Lampung Timur adalah pusat konservasi & pelatihan gajah Sumatera tertua di Indonesia. Anda dapat berinteraksi langsung dengan gajah dan belajar edukasi konservasi satwa dilindungi.';
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
