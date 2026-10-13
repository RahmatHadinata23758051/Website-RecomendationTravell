import { Test, TestingModule } from '@nestjs/testing';
import { ServiceUnavailableException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { of } from 'rxjs';
import { ChatbotService } from './chatbot.service';
import { RagRetrieverService } from './rag-retriever.service';
import { PrismaService } from '../prisma/prisma.service';

describe('ChatbotService', () => {
  let service: ChatbotService;
  let httpPostSpy: jest.Mock;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn().mockResolvedValue({
        id: 'user-123',
        fullName: 'Budi Traveler',
        preferences: ['Wisata Bahari', 'Kuliner Seruit'],
        itineraries: [
          {
            title: 'Trip Eksotis Pesawaran 3H2M',
            daysJson: {},
          },
        ],
      }),
    },
  };

  const mockHttpService = {
    post: jest.fn().mockImplementation((url, payload) => {
      return of({
        data: {
          choices: [
            {
              message: {
                content: 'Tabik Pun! Rekomendasi terbaik pantai Pesawaran adalah Pulau Pahawang.',
              },
            },
          ],
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: 'Tabik Pun! Rekomendasi terbaik pantai Pesawaran adalah Pulau Pahawang.',
                  },
                ],
              },
            },
          ],
        },
      });
    }),
  };

  const mockConfigService = {
    get: jest.fn().mockImplementation((key: string) => {
      if (key === 'NINE_ROUTER_URL') return 'http://localhost:8000';
      if (key === 'NINE_ROUTER_API_KEY') return 'test-key';
      if (key === 'NINE_ROUTER_MODEL') return 'gemini-lampung-pool';
      return null;
    }),
  };

  beforeEach(async () => {
    httpPostSpy = mockHttpService.post;
    httpPostSpy.mockClear();
    mockPrismaService.user.findUnique.mockClear();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatbotService,
        { provide: HttpService, useValue: mockHttpService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: PrismaService, useValue: mockPrismaService },
        {
          provide: RagRetrieverService,
          useValue: {
            retrieveRelevantFacts: jest.fn().mockReturnValue([
              {
                id: 'spot-1',
                name: 'Pulau Pahawang',
                location: 'Pesawaran',
                regency: 'Kabupaten Pesawaran',
                price: 'Rp 150.000',
                rating: 4.8,
              },
            ]),
            buildRagContextPrompt: jest
              .fn()
              .mockReturnValue('Fakta: Pulau Pahawang adalah destinasi snorkeling terbaik.'),
          },
        },
      ],
    }).compile();

    service = module.get<ChatbotService>(ChatbotService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should support Public Mode: unauthenticated visitor asks general tourism question without 401', async () => {
    const res = await service.askChatbot({
      message: 'Rekomendasikan pantai bagus di Pesawaran',
    });

    expect(res.status).toBe('success');
    expect(res.bot_name).toBe('Asisten KelanaLampung');
    expect(res.data.reply).toBeDefined();
    expect(res.data.destinations).toBeDefined();
    expect(res.data.destinations.length).toBeGreaterThan(0);
    expect(res.data.destinations[0]).toEqual(expect.objectContaining({
      category: expect.any(String),
      hours: expect.any(String),
      highlight: expect.any(String),
    }));
    expect(mockPrismaService.user.findUnique).not.toHaveBeenCalled();
  });

  it('should handle pure greetings in Public Mode without LLM or authentication error', async () => {
    const res = await service.askChatbot({
      message: 'Halo selamat pagi',
    });

    expect(res.status).toBe('success');
    expect(res.bot_name).toBe('Asisten KelanaLampung');
    expect(res.data.reply).toContain('Tabik Pun!');
    expect(mockPrismaService.user.findUnique).not.toHaveBeenCalled();
  });

  it('should handle out-of-scope questions politely', async () => {
    const res = await service.askChatbot({
      message: 'Bagaimana cara koding python untuk skripsi?',
    });

    expect(res.status).toBe('success');
    expect(res.data.reply).toContain('Saya asisten wisata KelanaLampung. Mohon maaf');
  });

  it('should support Authenticated Mode: personalize response using user preferences & itineraries', async () => {
    const res = await service.askChatbot({
      message: 'Tolong buatkan rekomendasi liburan akhir pekan',
      userId: 'user-123',
      mode: 'authenticated',
    });

    expect(res.status).toBe('success');
    expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
      where: { id: 'user-123' },
      select: expect.objectContaining({
        fullName: true,
        preferences: true,
        itineraries: expect.any(Object),
      }),
    });

    expect(httpPostSpy).toHaveBeenCalled();
    const requestPayload = httpPostSpy.mock.calls[0][1];
    expect(requestPayload.stream).toBe(false);
    const systemPromptMessage = requestPayload.messages.find(
      (m: any) => m.role === 'system',
    )?.content;
    expect(systemPromptMessage).toContain('KONTEKS PRIBADI PENGGUNA');
    expect(systemPromptMessage).toContain('Wisata Bahari');
    expect(systemPromptMessage).toContain('Trip Eksotis Pesawaran 3H2M');
  });

  it('should use OPENAI_BASE_URL alias when NINE_ROUTER_URL is not set', async () => {
    const freshModule = await Test.createTestingModule({
      providers: [
        ChatbotService,
        { provide: HttpService, useValue: mockHttpService },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key: string) => {
              if (key === 'OPENAI_BASE_URL') return 'http://localhost:20128/v1';
              if (key === 'OPENAI_API_KEY') return 'test-openai-key';
              if (key === 'OPENAI_MODEL') return 'gemini-lampung-pool';
              return null;
            }),
          },
        },
        { provide: PrismaService, useValue: mockPrismaService },
        {
          provide: RagRetrieverService,
          useValue: {
            retrieveRelevantFacts: jest.fn().mockReturnValue([]),
            buildRagContextPrompt: jest.fn().mockReturnValue(''),
          },
        },
      ],
    }).compile();

    const freshService = freshModule.get(ChatbotService);
    const res = await freshService.askChatbot({
      message: 'Rekomendasi pantai',
    });

    expect(res.status).toBe('success');
    expect(httpPostSpy).toHaveBeenCalled();
    const requestPayload = httpPostSpy.mock.calls[0][1];
    expect(requestPayload.stream).toBe(false);
    expect(requestPayload.model).toBe('gemini-lampung-pool');
  });

  it('should support Authenticated Mode when userContext is passed directly in payload', async () => {
    const res = await service.askChatbot({
      message: 'Rekomendasi kuliner malam',
      userContext: {
        preferences: ['Seruit', 'Kopi Robusta'],
        itineraries: [{ title: 'Kuliner Tour Bandar Lampung' }],
      },
    });

    expect(res.status).toBe('success');
    expect(httpPostSpy).toHaveBeenCalled();
    const requestPayload = httpPostSpy.mock.calls[0][1];
    const systemPromptMessage = requestPayload.messages.find(
      (m: any) => m.role === 'system',
    )?.content;
    expect(systemPromptMessage).toContain('KONTEKS PRIBADI PENGGUNA');
    expect(systemPromptMessage).toContain('Seruit');
    expect(systemPromptMessage).toContain('Kuliner Tour Bandar Lampung');
  });

  it('should throw ServiceUnavailableException when 9Router is not configured', async () => {
    const freshModule = await Test.createTestingModule({
      providers: [
        ChatbotService,
        { provide: HttpService, useValue: mockHttpService },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue(null),
          },
        },
        { provide: PrismaService, useValue: mockPrismaService },
        {
          provide: RagRetrieverService,
          useValue: {
            retrieveRelevantFacts: jest.fn().mockReturnValue([]),
            buildRagContextPrompt: jest.fn().mockReturnValue(''),
          },
        },
      ],
    }).compile();

    const freshService = freshModule.get(ChatbotService);

    await expect(
      freshService.askChatbot({ message: 'Rekomendasi pantai' }),
    ).rejects.toThrow(ServiceUnavailableException);
  });

  it('should inherit regency from history for follow-up queries without explicit location', async () => {
    const freshModule = await Test.createTestingModule({
      providers: [
        ChatbotService,
        { provide: HttpService, useValue: mockHttpService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: PrismaService, useValue: mockPrismaService },
        {
          provide: RagRetrieverService,
          useValue: {
            retrieveRelevantFacts: jest.fn().mockReturnValue([]),
            buildRagContextPrompt: jest.fn().mockReturnValue(''),
            detectRegencyFromText: jest.fn().mockImplementation((text: string) => {
              const lower = String(text || '').toLowerCase();
              if (lower.includes('lampung barat') || lower.includes('liwa')) {
                return 'Kabupaten Lampung Barat';
              }
              return '';
            }),
          },
        },
      ],
    }).compile();

    const freshService = freshModule.get<ChatbotService>(ChatbotService);
    const ragRetriever = freshModule.get<RagRetrieverService>(RagRetrieverService);
    const spy = ragRetriever.retrieveRelevantFacts as jest.Mock;

    const res = await freshService.askChatbot({
      message: 'kalau budget saya 100rb bro kira kira bisa kemana aja sama kuliner nya',
      history: [
        { sender: 'user', text: 'saya mau ke liwa nih bro ada rekomendasi wisata apa disana' },
        { sender: 'bot', text: 'Berikut rekomendasi di Liwa, Kabupaten Lampung Barat.' },
      ],
    });

    expect(res.status).toBe('success');
    expect(spy).toHaveBeenCalledWith(
      'kalau budget saya 100rb bro kira kira bisa kemana aja sama kuliner nya',
      'Kabupaten Lampung Barat',
      undefined,
    );
  });
});
