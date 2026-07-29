import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { AskChatbotDto } from './dto/ask-chatbot.dto';

@Injectable()
export class ChatbotService {
  private readonly logger = new Logger(ChatbotService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  async askChatbot(dto: AskChatbotDto) {
    const { message } = dto;
    this.logger.log(`[CHATBOT QUERY] Processing message: "${message}"`);

    const mlEngineUrl =
      this.configService.get<string>('ML_ENGINE_URL') || 'http://localhost:8000';

    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${mlEngineUrl}/api/v1/chatbot`,
          dto,
          { timeout: 5000 },
        ),
      );

      return {
        status: 'success',
        bot_name: 'Raden Gajah (AI Concierge Lampung)',
        data: response.data,
      };
    } catch (err) {
      this.logger.warn(
        `[CHATBOT FALLBACK] Could not reach ML Engine chatbot API: ${err.message}. Using built-in Raden Gajah knowledge base.`,
      );

      // Local Knowledge Base for Raden Gajah AI Concierge
      const lower = message.toLowerCase();
      let reply =
        'Tabik Pun! Saya Raden Gajah, asisten AI perjalanan wisata Provinsi Lampung. Ada yang bisa saya bantu untuk rencana liburan Anda?';
      const suggestions = [
        'Rekomendasi pantai terbaik di Pesawaran',
        'Kuliner khas Lampung wajib coba',
        'Jadwal & tips snorkeling Pulau Pahawang',
      ];

      if (lower.includes('pantai') || lower.includes('laut')) {
        reply =
          'Lampung terkenal dengan pantai-pantai indahnya! Pantai Mutun dan Pantai Bensam di Kabupaten Pesawaran sangat ideal untuk keluarga, sedangkan Pantai Tanjung Setia di Krui sangat terkenal di dunia untuk olahraga surfing.';
      } else if (
        lower.includes('makan') ||
        lower.includes('kuliner') ||
        lower.includes('seruit')
      ) {
        reply =
          'Kuliner wajib khas Lampung adalah Seruit (ikan bakar/goreng yang dicampur sambal terasi, tempoyak durian, dan lalapan). Jangan lupa mencoba Keripik Pisang Cokelat khas Bandar Lampung untuk oleh-oleh!';
      } else if (
        lower.includes('pahawang') ||
        lower.includes('snorkeling')
      ) {
        reply =
          'Pulau Pahawang terkenal dengan keindahan terumbu karang dan spot nemo. Waktu terbaik berkunjung adalah pagi hari jam 07:00 - 14:00 WIB untuk visibilitas air laut jernih.';
      } else if (lower.includes('rute') || lower.includes('jalan')) {
        reply =
          'Untuk akses dari Bandar Lampung menuju kawasan wisata Pesawaran, perjalanan darat menempuh waktu sekitar 45-60 menit via Jalan Raya Teluk Betung.';
      }

      return {
        status: 'success',
        bot_name: 'Raden Gajah (AI Concierge Lampung)',
        data: {
          reply,
          suggested_queries: suggestions,
        },
      };
    }
  }
}
