import { Injectable, Logger, Optional, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
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
    @Optional() private readonly prisma?: PrismaService,
  ) {}

  private async resolvePersonalContext(dto: AskChatbotDto): Promise<string> {
    const suppliedContext = dto.userContext;
    let preferences = suppliedContext?.preferences || [];
    let itineraries = suppliedContext?.itineraries || [];

    // The user id from the optional JWT is trusted by the controller. Fetching
    // here keeps public requests independent from the database and means a
    // stale/invalid optional session can never turn a public chat into a 401.
    if (dto.userId && this.prisma) {
      try {
        const user = await this.prisma.user.findUnique({
          where: { id: dto.userId },
          select: {
            fullName: true,
            preferences: true,
            itineraries: {
              orderBy: { updatedAt: 'desc' },
              take: 3,
              select: { title: true, daysJson: true },
            },
          },
        });
        if (user) {
          preferences = user.preferences || preferences;
          itineraries = user.itineraries || itineraries;
        }
      } catch (error) {
        this.logger.warn(`[CHATBOT PERSONALIZATION] Could not load user context: ${error.message}`);
      }
    }

    if (!preferences.length && !itineraries.length) return '';

    return [
      'KONTEKS PRIBADI PENGGUNA (gunakan hanya untuk membantu, jangan mengarang):',
      preferences.length ? `Preferensi: ${preferences.join(', ')}` : '',
      itineraries.length
        ? `Itinerary tersimpan: ${itineraries.map((itinerary) => itinerary.title || 'Rencana perjalanan').join('; ')}`
        : '',
      'Sesuaikan saran dengan konteks ini bila relevan dan tetap gunakan fakta RAG untuk informasi destinasi.',
    ].filter(Boolean).join('\n');
  }

  private cleanFormattingAndEmojis(text: string): string {
    if (!text) return '';
    return text
      .replace(/\*\*/g, '')
      .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}]/gu, '')
      .replace(/\n\s*\n\s*\n/g, '\n\n')
      .trim();
  }

  private getLlmTimeoutMs(): number {
    const raw = Number(this.configService.get<string>('NINE_ROUTER_TIMEOUT_MS'));
    return Number.isFinite(raw) && raw > 0 ? raw : 60000;
  }

  async askChatbot(dto: AskChatbotDto) {
    const { message, history, category, regency } = dto;
    const isAuthenticated = Boolean(dto.userId || dto.userContext);
    const personalContext = isAuthenticated ? await this.resolvePersonalContext(dto) : '';
    this.logger.log(`[CHATBOT QUERY] ${isAuthenticated ? 'Authenticated' : 'Public'} mode; Processing message: "${message}"`);

    const lowerMessage = message.toLowerCase().trim();
    const cleanMsg = lowerMessage.replace(/[^a-z0-9\s]/gi, '').trim();

    // Multi-turn Context
    // Detect regency from history (last bot turn that mentions a specific regency)
    // This allows follow-up queries like "budget 100rb kuliner" to inherit the location
    // from the previous turn ("saya mau ke liwa...") without polluting fresh queries.
    let historyRegency = '';
    if (Array.isArray(history) && history.length > 0) {
      // Look at recent bot messages for explicit regency mentions
      for (let i = history.length - 1; i >= 0; i--) {
        const msg = history[i];
        if (msg.sender === 'bot' && msg.text) {
          const detected = this.ragRetriever.detectRegencyFromText(msg.text);
          if (detected) {
            historyRegency = detected;
            break;
          }
        }
      }
    }

    // 0. Simple Greetings Guardrail
    const greetingWords = ['halo', 'hallo', 'hai', 'hi', 'hey', 'pagi', 'siang', 'sore', 'malam', 'tes', 'test', 'ping', 'p'];
    const isPureGreeting = greetingWords.includes(cleanMsg) || (cleanMsg.length <= 15 && (cleanMsg.startsWith('halo') || cleanMsg.startsWith('hallo') || cleanMsg.startsWith('hai') || cleanMsg.startsWith('hi')));

    if (isPureGreeting && !cleanMsg.includes('wisata') && !cleanMsg.includes('pantai') && !cleanMsg.includes('kuliner') && !cleanMsg.includes('rekomendasi')) {
      return {
        status: 'success',
        bot_name: 'Asisten KelanaLampung',
        data: {
          reply:
            'Tabik Pun! Halo! Saya asisten wisata KelanaLampung, panduan resmi pariwisata Provinsi Lampung.\n\nAda yang bisa saya bantu untuk rencana perjalanan Anda hari ini? Anda bisa menanyakan rekomendasi destinasi alam, pantai, kuliner khas, rute, atau tips liburan di 15 Kabupaten/Kota se-Lampung.',
          suggested_queries: [
            'Rekomendasi pantai di Pesawaran',
            'Tempat makan Seruit khas Lampung',
            'Wisata populer di Bandar Lampung',
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
        bot_name: 'Asisten KelanaLampung',
        data: {
          reply:
            'Tabik Pun! Saya asisten wisata KelanaLampung. Mohon maaf, saya khusus membantu seputar informasi pariwisata, kuliner, dan panduan liburan di Provinsi Lampung. Ada destinasi wisata atau kuliner yang ingin Anda tanyakan?',
          suggested_queries: [
            'Rekomendasi pantai di Pesawaran',
            'Tempat makan Seruit khas Lampung',
            'Wisata lumba-lumba Teluk Kiluan',
          ],
          destinations: [],
        },
      };
    }

    // Identity query
    if (lowerMessage.includes('siapa') || lowerMessage.includes('kamu siapa') || lowerMessage.includes('siapa anda')) {
      return {
        status: 'success',
        bot_name: 'Asisten KelanaLampung',
        data: {
          reply:
            'Tabik Pun! Halo! Saya asisten wisata resmi KelanaLampung.\n\nSaya bertugas membantu merencanakan liburan Anda di Provinsi Lampung, mulai dari rekomendasi pantai, wisata alam, kuliner tradisional seperti Seruit, estimasi rute, hingga informasi destinasi di seluruh 15 Kabupaten/Kota se-Lampung. Ada yang bisa saya bantu hari ini?',
          suggested_queries: [
            'Rekomendasi pantai di Pesawaran',
            'Tempat makan Seruit khas Lampung',
            'Wisata populer di Bandar Lampung',
          ],
          destinations: [],
        },
      };
    }

    // 2. Retrieve Grounded RAG Facts (single retrieval pass)
    // Use current query's explicit regency/category first. If absent, fall back to
    // the regency detected from recent bot responses in history (e.g., user said
    // "saya mau ke liwa" then follows up "budget 100rb kuliner" — inherit Liwa).
    // This prevents location drift while still supporting natural follow-ups.
    const effectiveRegency = regency || historyRegency;
    const relevantFacts: DestinationFact[] = this.ragRetriever.retrieveRelevantFacts(lowerMessage, effectiveRegency, category);
    const ragContext = this.ragRetriever.buildRagContextPrompt(lowerMessage, effectiveRegency, category, relevantFacts);

    // 3. Prompt Orchestration (single AI provider: 9Router)
    const systemPrompt = `Anda adalah "Asisten KelanaLampung", Pemandu Wisata Digital Resmi Provinsi Lampung yang ramah, hangat, luwes, dan cerdas.

ATURAN PERILAKU DAN FORMAT UTAMA:
1. Sapa pengguna secara hangat "Tabik Pun!".
2. DILARANG MENGGUNAKAN SIMBOL TEKS TEBAL MARKDOWN (DILARANG MENGGUNAKAN SIMBOL **). Tuliskan nama tempat dan judul secara bersih tanpa bintang dua.
3. DILARANG MENGGUNAKAN EMOJI APAPUN dalam seluruh jawaban.
4. Jawab pertanyaan pengguna secara LANGSUNG dan SPESIFIK sesuai maksud kalimat TERBARU pengguna dan kabupaten yang diminta. Jika pengguna menyebut kata "wisata", berikan tempat wisata (bukan kuliner)!
5. Gunakan fakta RAG terverifikasi dari Database berikut:
${ragContext}
${personalContext ? `\n${personalContext}` : ''}
6. Ceritakan secara menarik dan mengalir tanpa kaku.
7. Di akhir jawaban, tanyakan dengan ramah bantuan apa lagi yang pengguna butuhkan.`;

    const formattedHistory = Array.isArray(history)
      ? history.slice(-5).map((h) => `${h.sender === 'user' ? 'Pengguna' : 'Asisten'}: ${h.text}`).join('\n')
      : '';

    // 4. Sole LLM gateway: 9Router (OpenAI-compatible). If it is unavailable we return
    //    an honest 503 instead of fabricated or template-based content.
    //    Supports both NINE_ROUTER_* and standard OPENAI_* env keys.
    const nineRouterUrl =
      this.configService.get<string>('NINE_ROUTER_URL') ||
      this.configService.get<string>('OPENAI_BASE_URL');
    const nineRouterKey =
      this.configService.get<string>('NINE_ROUTER_API_KEY') ||
      this.configService.get<string>('OPENAI_API_KEY');
    const nineRouterModel =
      this.configService.get<string>('NINE_ROUTER_MODEL') ||
      this.configService.get<string>('OPENAI_MODEL') ||
      'gemini-lampung-pool';

    if (!nineRouterKey || !nineRouterUrl) {
      this.logger.error('[9ROUTER] LLM base URL or API key is not configured (NINE_ROUTER_* or OPENAI_*).');
      throw this.llmUnavailable();
    }

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
        // 9Router default-nya streaming SSE; pakai stream:false agar balik single JSON
        stream: false,
      };

      const res = await firstValueFrom(
        this.httpService.post(endpoint, payload, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${nineRouterKey}`,
          },
          // Reasoning model + prompt RAG lengkap bisa memakan >15 detik
          timeout: this.getLlmTimeoutMs(),
        }),
      );

      const replyText = res.data?.choices?.[0]?.message?.content;
      if (!replyText) {
        throw new Error('9Router returned an empty completion');
      }

      this.logger.log(`[9ROUTER GATEWAY SUCCESS] Received LLM response via 9Router.`);
      return {
        status: 'success',
        bot_name: 'Asisten KelanaLampung',
        model_used: nineRouterModel,
        data: {
          reply: this.cleanFormattingAndEmojis(replyText),
          suggested_queries: [
            'Rekomendasi pantai di Pesawaran',
            'Kuliner Seruit khas Lampung',
            'Estimasi biaya liburan 2 hari',
          ],
          destinations: relevantFacts.slice(0, 3).map((f) => ({
            id: f.id,
            name: f.name,
            location: f.location,
            regency: f.regency,
            price: f.price,
            rating: f.rating,
            numericPrice: f.numericPrice || 0,
            category: f.category || 'Kategori belum tersedia',
            hours: f.hours || 'Jam buka tidak tersedia',
            highlight: f.highlight || 'Highlight belum tersedia.',
          })),
        },
      };
    } catch (err) {
      this.logger.warn(`[9ROUTER GATEWAY FAILURE] ${err.message}`);
      throw this.llmUnavailable();
    }
  }

  private llmUnavailable() {
    return new ServiceUnavailableException({
      statusCode: 503,
      error: 'LLM_UNAVAILABLE',
      message: 'Layanan Asisten KelanaLampung sedang tidak tersedia. Silakan coba lagi beberapa saat lagi.',
    });
  }
}
