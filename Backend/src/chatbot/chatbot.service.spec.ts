import { Test, TestingModule } from '@nestjs/testing';
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
    expect(res.bot_name).toBe('Raden Gajah (AI Concierge Lampung)');
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
    expect(res.bot_name).toBe('Raden Gajah (AI Concierge Lampung)');
    expect(res.data.reply).toContain('Tabik Pun!');
    expect(mockPrismaService.user.findUnique).not.toHaveBeenCalled();
  });

  it('should handle out-of-scope questions politely', async () => {
    const res = await service.askChatbot({
      message: 'Bagaimana cara koding python untuk skripsi?',
    });

    expect(res.status).toBe('success');
    expect(res.data.reply).toContain('Maaf ya, Muli khusus membantu seputar keindahan pariwisata');
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
    const systemPromptMessage = requestPayload.messages.find(
      (m: any) => m.role === 'system',
    )?.content;
    expect(systemPromptMessage).toContain('KONTEKS PRIBADI PENGGUNA');
    expect(systemPromptMessage).toContain('Wisata Bahari');
    expect(systemPromptMessage).toContain('Trip Eksotis Pesawaran 3H2M');
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
});
