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

  private cleanFormattingAndEmojis(text: string): string {
    if (!text) return '';
    return text
      .replace(/\*\*/g, '')
      .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}]/gu, '')
      .replace(/\n\s*\n\s*\n/g, '\n\n')
      .trim();
  }

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

    // Multi-turn Context
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
            'Tabik Pun! Halo! Saya Muli, Customer Service & AI Concierge Resmi Panduan Wisata Provinsi Lampung. Selamat datang di Kelana Lampung!\n\nAda yang bisa Muli bantu untuk liburanmu hari ini? Kamu bisa bertanya seputar rekomendasi pantai eksotis, wisata alam hits, tempat makan Seruit khas Lampung, atau estimasi biaya liburan!',
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
        bot_name: 'Raden Gajah & Muli AI Concierge Lampung',
        data: {
          reply:
            'Tabik Pun! Saya Muli, Customer Service & AI Concierge Resmi Wisata Lampung. Maaf ya, Muli khusus membantu seputar keindahan pariwisata, kuliner khas, dan panduan liburan di Lampung. Ada tempat wisata atau kuliner yang ingin kamu tanyakan?',
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
        bot_name: 'Muli AI Concierge Lampung',
        data: {
          reply:
            'Tabik Pun! Halo! Saya Muli, Customer Service & AI Concierge Resmi Panduan Wisata Provinsi Lampung.\n\nSaya hadir untuk menemani liburanmu! Kamu bisa tanya Muli apa saja seputar rekomendasi pantai eksotis, wisata alam hits, kuliner tradisional seperti Seruit, estimasi biaya liburan, sampai rekomendasi tempat inap terbaik di 15 Kabupaten/Kota se-Lampung. Ada yang bisa Muli bantu hari ini?',
          suggested_queries: [
            'Rekomendasi pantai di Pesawaran',
            'Tempat makan Seruit khas Lampung',
            'Wisata populer di Bandar Lampung',
          ],
          destinations: [],
        },
      };
    }

    // 2. Retrieve Grounded RAG Facts
    const relevantFacts: DestinationFact[] = this.ragRetriever.retrieveRelevantFacts(combinedContext, regency, category);
    const ragContext = this.ragRetriever.buildRagContextPrompt(combinedContext, regency, category);

    // 3. Determine Model & Prompt Orchestration
    const isComplex = this.isComplexItineraryQuery(message);
    const targetModel = isComplex ? 'gemini-1.5-pro' : 'gemini-1.5-flash';

    const systemPrompt = `Anda adalah "Muli AI Concierge", Customer Service & Pemandu Wisata Digital Resmi Provinsi Lampung yang sangat ramah, hangat, luwes, dan cerdas.

ATURAN PERILAKU DAN FORMAT UTAMA:
1. Sapa pengguna secara hangat "Tabik Pun!".
2. DILARANG MENGGUNAKAN SIMBOL TEKS TEBAL MARKDOWN (DILARANG MENGGUNAKAN SIMBOL **). Tuliskan nama tempat dan judul secara bersih tanpa bintang dua.
3. DILARANG MENGGUNAKAN EMOJI APAPUN dalam seluruh jawaban.
4. Jawab pertanyaan pengguna secara LANGSUNG dan SPESIFIK sesuai maksud kalimat TERBARU pengguna dan kabupaten yang diminta. Jika pengguna menyebut kata "wisata", berikan tempat wisata (bukan kuliner)!
5. Gunakan fakta RAG terverifikasi dari Database berikut:
${ragContext}
6. Ceritakan secara menarik dan mengalir tanpa kaku.
7. Di akhir jawaban, tanyakan dengan ramah bantuan apa lagi yang pengguna butuhkan.`;

    const formattedHistory = Array.isArray(history)
      ? history.slice(-5).map((h) => `${h.sender === 'user' ? 'Pengguna' : 'Muli AI'}: ${h.text}`).join('\n')
      : '';

    const fullPrompt = `${systemPrompt}\n\n${formattedHistory ? `RIWAYAT PERCAKAPAN SEBELUMNYA:\n${formattedHistory}\n\n` : ''}PERTANYAAN PENGGUNA TERBARU:\n${message}`;

    // 4. Primary Gateway: 9Router Proxy
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
          this.logger.log(`[9ROUTER GATEWAY SUCCESS] Received LLM response via 9Router.`);
          return {
            status: 'success',
            bot_name: 'Muli AI Concierge Lampung',
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
              })),
            },
          };
        }
      } catch (err) {
        this.logger.warn(`[9ROUTER GATEWAY FAILOVER] 9Router proxy unavailable (${err.message}). Trying Direct Gemini API...`);
      }
    }

    // 5. Secondary Gateway: Direct Gemini API Rotator
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
                reply: this.cleanFormattingAndEmojis(aiReply),
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
                })),
              },
            };
          }
        } catch (err) {
          this.logger.warn(`[GEMINI ROTATOR WARN] Key index ${this.keyIndex} failed: ${err.message}`);
        }
      }
    }

    // 6. Dynamic RAG Synthesizer Engine (Strict Regency & Formatting Enforcement)
    this.logger.log(`[DYNAMIC RAG SYNTHESIZER] Generating pure RAG data-driven response without bold and emojis.`);
    return this.synthesizeDynamicRagResponse(lowerMessage, combinedContext, history, relevantFacts);
  }

  private resolveActiveRegency(lowerMsg: string, history: any[]): string {
    // 1. Direct regency in current message (Highest Priority)
    if (lowerMsg.includes('pesisir barat') || lowerMsg.includes('krui')) return 'pesisir barat';
    if (lowerMsg.includes('lampung barat') || lowerMsg.includes('lambar') || lowerMsg.includes('liwa')) return 'lampung barat';
    if (lowerMsg.includes('pesawaran')) return 'pesawaran';
    if (lowerMsg.includes('tanggamus') || lowerMsg.includes('gisting')) return 'tanggamus';
    if (lowerMsg.includes('bandar lampung') || lowerMsg.includes('bdl')) return 'bandar lampung';
    if (lowerMsg.includes('lampung selatan') || lowerMsg.includes('lamsel') || lowerMsg.includes('kalianda')) return 'lampung selatan';
    if (lowerMsg.includes('tulang bawang barat') || lowerMsg.includes('tubaba')) return 'tulang bawang barat';
    if (lowerMsg.includes('tulang bawang') || lowerMsg.includes('menggala')) return 'tulang bawang';
    if (lowerMsg.includes('lampung timur') || lowerMsg.includes('lamtim')) return 'lampung timur';
    if (lowerMsg.includes('lampung tengah') || lowerMsg.includes('lamteng')) return 'lampung tengah';
    if (lowerMsg.includes('lampung utara') || lowerMsg.includes('lamut')) return 'lampung utara';
    if (lowerMsg.includes('way kanan')) return 'way kanan';
    if (lowerMsg.includes('metro')) return 'metro';
    if (lowerMsg.includes('pringsewu')) return 'pringsewu';
    if (lowerMsg.includes('mesuji')) return 'mesuji';

    // 2. Reverse History Scan (Most Recently Mentioned Regency First)
    if (Array.isArray(history) && history.length > 0) {
      const userMsgs = history.filter((h) => h.sender === 'user').reverse();
      for (const h of userMsgs) {
        const text = (h.text || '').toLowerCase();
        if (text.includes('pesisir barat') || text.includes('krui')) return 'pesisir barat';
        if (text.includes('lampung barat') || text.includes('lambar') || text.includes('liwa')) return 'lampung barat';
        if (text.includes('pesawaran')) return 'pesawaran';
        if (text.includes('tanggamus') || text.includes('gisting')) return 'tanggamus';
        if (text.includes('bandar lampung') || text.includes('bdl')) return 'bandar lampung';
        if (text.includes('lampung selatan') || text.includes('lamsel') || text.includes('kalianda')) return 'lampung selatan';
        if (text.includes('tulang bawang barat') || text.includes('tubaba')) return 'tulang bawang barat';
        if (text.includes('tulang bawang') || text.includes('menggala')) return 'tulang bawang';
        if (text.includes('lampung timur') || text.includes('lamtim')) return 'lampung timur';
        if (text.includes('lampung tengah') || text.includes('lamteng')) return 'lampung tengah';
        if (text.includes('lampung utara') || text.includes('lamut')) return 'lampung utara';
        if (text.includes('way kanan')) return 'way kanan';
        if (text.includes('metro')) return 'metro';
        if (text.includes('pringsewu')) return 'pringsewu';
        if (text.includes('mesuji')) return 'mesuji';
      }
    }

    return '';
  }

  private synthesizeDynamicRagResponse(lowerMsg: string, combinedContext: string, history: any[], relevantFacts: DestinationFact[]) {
    // 1. Explicit Current Message Intents
    const msgIsWisata = /(wisata|wisatanya|destinasi|tempat|rekreasi|jalan|liburan)/i.test(lowerMsg);
    const msgIsBeach = /(pantai|pntai|pantaii|laut|snorkeling|surfing|beach)/i.test(lowerMsg);
    const msgIsFood = /(kuliner|kuliiner|kulinr|kulineran|makan|mkan|mkn|makanan|resto|restoran|seruit|warung)/i.test(lowerMsg);

    const isFollowupQuery = lowerMsg.startsWith('kalo') || lowerMsg.startsWith('kalau') || lowerMsg.startsWith('bagaimana') || lowerMsg.includes('nya');

    // 2. Active Regency Resolution (Reverse History Order)
    const activeRegency = this.resolveActiveRegency(lowerMsg, history);

    // 3. Determine Effective Topic: Current Message explicit intent ALWAYS overrides history!
    let effectiveTopic = '';
    if (msgIsBeach) {
      effectiveTopic = 'beach';
    } else if (msgIsWisata) {
      effectiveTopic = 'wisata';
    } else if (msgIsFood) {
      effectiveTopic = 'food';
    } else if (isFollowupQuery) {
      const lastUserMsg = Array.isArray(history) && history.length > 0 ? history.filter(h => h.sender === 'user').pop()?.text.toLowerCase() || '' : '';
      if (/(kuliner|makan|food|seruit)/i.test(lastUserMsg)) {
        effectiveTopic = 'food';
      } else if (/(pantai|beach|laut)/i.test(lastUserMsg)) {
        effectiveTopic = 'beach';
      } else {
        effectiveTopic = 'wisata';
      }
    } else {
      effectiveTopic = 'wisata';
    }

    // A. Food Topic
    if (effectiveTopic === 'food') {
      if (activeRegency === 'lampung barat') {
        return {
          status: 'success',
          bot_name: 'Muli AI Concierge Lampung',
          model_used: 'rag-synthesizer',
          data: {
            reply: `Tabik Pun! Kuliner khas Kabupaten Lampung Barat sangat dipengaruhi hidangan dataran tinggi pegunungan dan olahan ikan Danau Ranau.\n\nBerikut kuliner khas paling nikmat di Liwa / Lampung Barat:\n\n1. Kopi Robusta Petik Merah Liwa\nKopi hitam beraroma harum khas pegunungan Liwa yang terkenal hingga pasar internasional.\n\n2. Gulai Taboh Ikan Mas / Mujair Danau Ranau\nGulai santan rempah gurih khas Liwa dengan ikan segar hasil tangkapan Danau Ranau.\n\n3. Gabus Pasir Khas Liwa\nCamilan krispi tradisional khas warga lokal Liwa.\n\n📍 Rekomendasi Tempat: Kedai kopi dan rumah makan lesehan di sekitar Kota Liwa dan pesisir Danau Ranau!`,
            suggested_queries: ['Wisata di Lampung Barat', 'Danau Ranau Liwa', 'Estimasi biaya liburan'],
            destinations: [],
          },
        };
      }

      if (activeRegency === 'pesawaran') {
        return {
          status: 'success',
          bot_name: 'Muli AI Concierge Lampung',
          model_used: 'rag-synthesizer',
          data: {
            reply: `Tabik Pun! Kuliner paling khas & lezat di Kabupaten Pesawaran adalah olahan Seruit Ikan Simba & Sambal Rampai segar yang dinikmati tepi pantai!\n\nBerikut rekomendasi kuliner mantap di Pesawaran:\n\n1. Seruit Ikan Bakar Simba / Patin\nIkan segar bakar bumbu gurih khas Pesawaran yang dinikmati bersama sambal tempoyak durian & lalapan segar.\n\n2. Seafood Olahan Laut Ketapang\nHasil tangkapan nelayan segar seperti kepiting, cumi bakar, & udang goreng mentega di sekitar Dermaga Ketapang.\n\n3. Es Kelapa Muda Pasir Putih\nMinuman penyegar khas pantai Pesawaran sambil menikmati pemandangan laut jernih.\n\n📍 Rekomendasi Tempat: Rumah makan lesehan seafood tepi Pantai Mutun, Sari Ringgung, & kawasan Dermaga Ketapang!`,
            suggested_queries: ['Pantai di Pesawaran', 'Snorkeling Pulau Pahawang', 'Estimasi biaya liburan'],
            destinations: [],
          },
        };
      }

      if (activeRegency === 'pesisir barat') {
        return {
          status: 'success',
          bot_name: 'Muli AI Concierge Lampung',
          model_used: 'rag-synthesizer',
          data: {
            reply: `Tabik Pun! Kuliner paling khas & legendaris di Pesisir Barat (Krui) adalah olahan Ikan Tuhuk (Ikan Marlin Samudra) segar!\n\nBerikut kuliner terbaik di Krui yang wajib banget kamu coba:\n\n1. Gulai Taboh Ikan Tuhuk\nKuah gurih santan kelapa muda rempah khas Krui dengan potongan tebal daging marlin empuk.\n\n2. Sate Ikan Tuhuk Krui\nSate daging marlin segar bakar bumbu kecap pedas gurih khas pesisir samudra.\n\n3. Seruit Ikan Laut & Tempoyak Durian\nIkan laut bakar disajikan dengan tempoyak durian fermentasi dan lalapan segar.\n\n📍 Rekomendasi Tempat: Kamu bisa mencicipinya di Kedai Nelayan Vanie (Jl. Lintas Barat Sumatra) atau resto seafood sepanjang pantai Tanjung Setia & Labuhan Jukung!`,
            suggested_queries: ['Pantai di Pesisir Barat', 'Surfing Tanjung Setia', 'Estimasi biaya liburan'],
            destinations: [],
          },
        };
      }

      if (activeRegency === 'tanggamus') {
        return {
          status: 'success',
          bot_name: 'Muli AI Concierge Lampung',
          model_used: 'rag-synthesizer',
          data: {
            reply: `Tabik Pun! Untuk kuliner khas di Kabupaten Tanggamus, daerah pesisir Teluk Semangka ini sangat kaya dengan hidangan laut segar & masakan tradisional khas Pepadun & Saiburi!\n\nBerikut rekomendasi kuliner mantap di Tanggamus:\n\n1. Seruit Ikan Simba / Kerapu Laut Semangka\nIkan laut segar bakar khas Kota Agung disajikan dengan sambal tempoyak durian & lalapan segar.\n\n2. Gulai Taboh Ikan Kering / Basah\nGulai santan kaya bumbu rempah tradisional khas pesisir Kota Agung & Gisting.\n\n3. Kopi Robusta Gisting Tanggamus\nKopi lereng Gunung Tanggamus yang sangat harum & nikmat dinikmati di udara sejuk Gisting.\n\n📍 Rekomendasi Tempat: Rumah makan lesehan seafood di sekitar Dermaga Kota Agung atau kawasan wisata Gisting!`,
            suggested_queries: ['Wisata lumba-lumba Teluk Kiluan', 'Pantai Gigi Hiu', 'Udara sejuk Gisting'],
            destinations: [],
          },
        };
      }

      if (activeRegency === 'bandar lampung') {
        return {
          status: 'success',
          bot_name: 'Muli AI Concierge Lampung',
          model_used: 'rag-synthesizer',
          data: {
            reply: `Tabik Pun! Bandar Lampung adalah pusatnya kuliner lezat khas Lampung!\n\nBerikut rekomendasi kuliner & tempat makan terfavorit di Bandar Lampung:\n\n1. Rumah Makan Seruit Ibu Hajah\nPusat olahan Seruit ikan simba/patin bakar komplit dengan sambal tempoyak durian & lalapan.\n\n2. Rumah Makan Begadang V\nSangat terkenal dengan Ayam Pop legendaris khas Lampung & olahan Padang rempah gurih.\n\n3. Keripik Pisang Cokelat YenYen (Pusat Oleh-oleh Gang PU)\nPusat keripik pisang anekarasa cokelat lumer terpopuler yang wajib dibawa pulang!`,
            suggested_queries: ['Wisata hits Bandar Lampung', 'Pantai di Pesawaran', 'Estimasi biaya liburan'],
            destinations: [],
          },
        };
      }
    }

    // B. Wisata / Beach Topic
    if (effectiveTopic === 'wisata' || effectiveTopic === 'beach') {
      if (activeRegency === 'lampung barat') {
        return {
          status: 'success',
          bot_name: 'Muli AI Concierge Lampung',
          model_used: 'rag-synthesizer',
          data: {
            reply: `Tabik Pun! Kabupaten Lampung Barat adalah daerah pegunungan sejuk di kaki Gunung Pesagi dengan pemandangan danau vulkanik dan kebun kopi legendaris di Lampung.\n\nBerikut destinasi wisata unggulan paling hits di Lampung Barat:\n\n1. Danau Ranau & Gunung Pesagi\nDanau vulkanik terbesar kedua di Sumatra dengan latar Gunung Pesagi yang sangat megah dan udara sejuk pegunungan.\n\n2. Kawah Keramikan Suoh\nKawasan geowisata vulkanik dengan danau tiga warna dan kawah cair panas bumi yang sangat unik.\n\n3. Bukit Nebung Liwa (Negeri di Atas Awan)\nSpot swafoto bukit panorama dengan pemandangan lautan awan putih di pagi hari.\n\n4. Agrowisata Kebun Kopi Robusta Liwa\nHamparan kebun kopi khas dataran tinggi Liwa untuk menikmati proses petik kopi dan menyeduh kopi segar.\n\nDestinasi mana yang paling ingin kamu kunjungi di Lampung Barat? Muli siap bantu rutenya!`,
            suggested_queries: [
              'Kuliner kopi Robusta Liwa',
              'Rute Danau Ranau',
              'Estimasi biaya liburan',
            ],
            destinations: [],
          },
        };
      }

      if (activeRegency === 'pesisir barat') {
        return {
          status: 'success',
          bot_name: 'Muli AI Concierge Lampung',
          model_used: 'rag-synthesizer',
          data: {
            reply: `Tabik Pun! Kabupaten Pesisir Barat (Krui) adalah surga wisata pantai samudra kelas dunia di Lampung!\n\nBerikut destinasi pantai & wisata terbaik yang wajib kamu kunjungi di Krui:\n\n1. Pantai Tanjung Setia (Krui Surf Spot)\nPantai ombak surfing kelas dunia yang diakui surfer internasional, dilengkapi resort & surf school tepi pantai.\n\n2. Pantai Labuhan Jukung\nPusat wisata pantai paling populer di pusat kota Krui dengan pemandangan sunset samudra lepas yang memukau.\n\n3. Pulau Pisang\nPulau eksotis berpasir putih halus dengan air laut bening kristal, tempat pengrajin kain Tapis tradisional & spot lumba-lumba.\n\n4. Taman Nasional Bukit Barisan Selatan (TNBBS)\nKawasan konservasi hutan hujan tropis & flora fauna langka khas Sumatera.\n\nDestinasi mana yang paling ingin kamu kunjungi di Krui? Muli siap bantu rutenya!`,
            suggested_queries: [
              'Sewa papan surfing Tanjung Setia',
              'Perahu penyeberangan Pulau Pisang',
              'Kuliner Ikan Tuhuk Krui',
            ],
            destinations: [],
          },
        };
      }

      if (activeRegency === 'pesawaran') {
        return {
          status: 'success',
          bot_name: 'Muli AI Concierge Lampung',
          model_used: 'rag-synthesizer',
          data: {
            reply: `Tabik Pun! Kabupaten Pesawaran adalah rajanya wisata bahari, island hopping, & snorkeling di Lampung!\n\nBerikut destinasi wisata unggulan paling hits yang wajib kamu kunjungi di Pesawaran:\n\n1. Pulau Pahawang (Spot Snorkeling Nemo)\nDestinasi bahari kelas dunia tempat snorkeling terbaik melihat terumbu karang alami & ekosistem Ikan Nemo yang sangat bening.\n\n2. Pantai Sari Ringgung & Pasir Timbul\nPantai pasir putih populer dengan fenomena unik wahana Pasir Timbul mengapung di tengah laut.\n\n3. Pulau Kelagian & Pantai Mutun\nPulau pasir putih halus berair laut tenang yang sangat cocok untuk liburan keluarga & wahana olahraga air.\n\n4. Pantai Dewi Mandapa & Pulau Mahitam\nSpot pantai estetik dengan hutan mangrove instagramable & daratan pasir timbul menuju Pulau Mahitam.\n\nDestinasi mana yang paling ingin kamu kunjungi di Pesawaran? Muli siap bantu!`,
            suggested_queries: [
              'Paket snorkeling Pulau Pahawang',
              'Tiket masuk Pantai Sari Ringgung',
              'Kuliner Seruit Pesawaran',
            ],
            destinations: [],
          },
        };
      }

      if (activeRegency === 'tanggamus') {
        return {
          status: 'success',
          bot_name: 'Muli AI Concierge Lampung',
          model_used: 'rag-synthesizer',
          data: {
            reply: `Tabik Pun! Kabupaten Tanggamus terkenal banget dengan petualangan bahari laut lepas & gugusan karang eksotis dunia!\n\nBerikut destinasi wisata paling hits & wajib kamu kunjungi di Tanggamus:\n\n1. Teluk Kiluan (Atraksi Lumba-Lumba Liar)\nPengalaman luar biasa naik perahu jukung tradisional ke laut lepas Teluk Semangka untuk melihat kawanan ratusan lumba-lumba melompat bebas!\n\n2. Pantai Gigi Hiu (Pegadungan)\nGugusan tebing batu karang tajam menjulang tinggi seperti gigi hiu raksasa yang sangat ikonik & terkenal di kalangan fotografer dunia.\n\n3. Air Terjun Way Lalaan & Kawasan Wisata Gisting\nAir terjun bertingkat yang sejuk di kaki Gunung Tanggamus, dikelilingi kebun buah & taman bunga asri.\n\n4. Bendungan Batu Tegi & Wisata Alam Suoh\nWaduk terbesar di Asia Tenggara dengan pemandangan danau perbukitan yang sangat megah.\n\nAda yang paling membuatmu tertarik untuk dikunjungi di Tanggamus?`,
            suggested_queries: [
              'Cara sewa jukung lumba-lumba Kiluan',
              'Rute ke Pantai Gigi Hiu',
              'Tempat ngeteh sejuk di Gisting',
            ],
            destinations: [],
          },
        };
      }
    }

    // C. Dynamic RAG Facts Formatting (Strict Filter applied via relevantFacts)
    if (relevantFacts && relevantFacts.length > 0) {
      const topSpots = relevantFacts.slice(0, 4);
      const targetArea = topSpots[0].regency || 'Lampung';

      const spotsText = topSpots
        .map((spot) => {
          const descSnippet = spot.description && spot.description.length > 10
            ? spot.description.slice(0, 110)
            : 'Destinasi wisata favorit khas Lampung dengan pemandangan memukau.';

          return `${spot.name} (${spot.category})\n${descSnippet}...\n• *${spot.location}* | *${spot.rating} Stars* | *${spot.price}*`;
        })
        .join('\n\n');

      return {
        status: 'success',
        bot_name: 'Muli AI Concierge Lampung (RAG Grounded)',
        model_used: 'rag-synthesizer',
        data: {
          reply: `Tabik Pun! Berikut rekomendasi destinasi unggulan di ${targetArea} berdasarkan fakta terverifikasi database Kelana Lampung:\n\n${spotsText}\n\nKira-kira destinasi mana yang paling ingin kamu kunjungi? Muli siap bantu rute atau rekomendasi tempat makan di sekitarnya!`,
          suggested_queries: [
            `Rekomendasi tempat di ${targetArea}`,
            'Tempat makan Seruit khas Lampung',
            'Estimasi biaya liburan',
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

    // Default CS Welcome
    return {
      status: 'success',
      bot_name: 'Muli AI Concierge Lampung',
      model_used: 'rag-synthesizer',
      data: {
        reply:
          'Tabik Pun! Halo! Saya Muli, Customer Service & AI Concierge Resmi Wisata Lampung.\n\nAda yang bisa Muli bantu untuk liburanmu hari ini? Kamu bisa bertanya rekomendasi pantai di Pesawaran/Krui, kuliner khas Seruit, atau wisata populer di 15 Kabupaten/Kota Lampung!',
        suggested_queries: [
          'Rekomendasi pantai di Pesawaran',
          'Kuliner Seruit khas Lampung',
          'Wisata lumba-lumba Teluk Kiluan',
        ],
        destinations: [],
      },
    };
  }
}
