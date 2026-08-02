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

    // 2. Retrieve Relevant Destination Facts via RAG Retriever
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
        this.logger.log(`[9ROUTER GATEWAY] Sending query to 9Router Proxy Combo: "${nineRouterModel}" at ${nineRouterUrl}`);
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
          this.logger.log(`[9ROUTER GATEWAY SUCCESS] Successfully received AI response via 9Router Combo.`);
          return {
            status: 'success',
            bot_name: 'Muli AI Concierge Lampung (via 9Router Proxy)',
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
        this.logger.warn(`[9ROUTER GATEWAY FAILOVER] 9Router proxy call failed (${err.message}). Falling back to direct Gemini multi-keys...`);
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
            response.data?.candidates?.[0]?.content?.parts?.[0]?.text ||
            'Tabik Pun! Maaf, sistem sedang memproses informasi. Ada yang bisa Muli bantu untuk wisata Lampung?';

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
        } catch (err) {
          const status = err.response?.status;
          this.logger.warn(
            `[GEMINI ROTATOR 429 SHIELD] Key index ${this.keyIndex} failed (Status: ${status || err.message}). Failing over to next key...`,
          );
        }
      }
    }

    // 7. Local Knowledge Base Fallback Shield (100% Zero Crash Guarantee)
    this.logger.warn(`[CHATBOT FALLBACK SHIELD] Triggering Local Knowledge Base.`);
    return this.executeLocalKbFallback(message, relevantFacts);
  }

  private executeLocalKbFallback(message: string, relevantFacts: DestinationFact[]) {
    const lower = message.toLowerCase();
    let reply =
      'Tabik Pun! Saya Muli, Customer Service & AI Concierge Resmi Wisata Lampung. Selamat datang di Kelana Lampung!';

    if (relevantFacts.length > 0) {
      const topSpot = relevantFacts[0];
      reply = `Tabik Pun! Berdasarkan rekomendasi utama di ${topSpot.regency}, Anda sangat disarankan mengunjungi **${topSpot.name}** (${topSpot.category}).\n\n📌 **Lokasi**: ${topSpot.location}\n💰 **Estimasi Biaya**: ${topSpot.price}\n⭐ **Rating**: ${topSpot.rating}★\nℹ️ **Deskripsi**: ${topSpot.description}`;
    } else if (lower.includes('pantai') || lower.includes('laut')) {
      reply =
        'Tabik Pun! Lampung terkenal dengan wisata bahari unggulan seperti **Pulau Pahawang** dan **Pantai Sari Ringgung** di Pesawaran, serta **Pantai Tanjung Setia Krui** di Pesisir Barat yang terkenal di mancanegara untuk olahraga surfing.';
    } else if (lower.includes('kuliner') || lower.includes('makan') || lower.includes('seruit')) {
      reply =
        'Tabik Pun! Kuliner khas utama Suku Lampung yang wajib dicoba adalah **Seruit** (ikan segar bakar/goreng diolah bersama sambal terasi, tempoyak durian fermentasi, dan lalapan segar). Untuk oleh-oleh, keripik pisang anekarasa Bandar Lampung adalah pilihan terpopuler!';
    } else if (lower.includes('pahawang') || lower.includes('snorkeling')) {
      reply =
        'Tabik Pun! **Pulau Pahawang** di Pesawaran adalah tempat terbaik untuk snorkeling dengan keindahan terumbu karang alami dan spot Ikan Nemo. Waktu terbaik berkunjung adalah pagi hari pukul 07:00 - 13:00 WIB.';
    }

    return {
      status: 'success',
      bot_name: 'Muli AI Concierge Lampung',
      model_used: 'local-kb-fallback',
      data: {
        reply,
        suggested_queries: [
          '🏖️ Rekomendasi pantai di Pesawaran',
          '🍲 Kuliner Seruit khas Lampung',
          '🐬 Wisata lumba-lumba Teluk Kiluan',
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
}
