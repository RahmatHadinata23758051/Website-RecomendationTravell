import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { of } from 'rxjs';
import { ChatbotService } from './chatbot.service';

describe('ChatbotService', () => {
  let service: ChatbotService;

  const mockHttpService = {
    post: jest.fn().mockReturnValue(
      of({
        data: {
          reply: 'Tabik Pun! Pantai Mutun adalah pilihan tepat.',
          suggested_queries: ['Kapan waktu terbaik ke Pahawang?'],
        },
      }),
    ),
  };

  const mockConfigService = {
    get: jest.fn().mockReturnValue('http://localhost:8000'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatbotService,
        { provide: HttpService, useValue: mockHttpService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<ChatbotService>(ChatbotService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should process user chatbot message via Raden Gajah AI Concierge', async () => {
    const res = await service.askChatbot({
      message: 'Rekomendasikan pantai bagus di Pesawaran',
    });

    expect(res.status).toBe('success');
    expect(res.bot_name).toBe('Raden Gajah (AI Concierge Lampung)');
    expect(res.data.reply).toBeDefined();
  });
});
