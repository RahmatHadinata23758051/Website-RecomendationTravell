import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { PlannerService } from './planner.service';
import { PrismaService } from '../prisma/prisma.service';

describe('PlannerService', () => {
  let service: PlannerService;

  const mockPrismaService = {
    itinerary: {
      create: jest.fn().mockImplementation((args) =>
        Promise.resolve({
          id: 'itin-001',
          userId: args.data.userId,
          title: args.data.title,
          shareToken: args.data.shareToken,
          daysJson: args.data.daysJson,
        }),
      ),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlannerService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<PlannerService>(PlannerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should generate multi-day time-slotted itinerary with share Token', async () => {
    const res = await service.generateItinerary('usr-1', {
      title: 'Liburan 3 Hari Lampung',
      duration_days: 3,
    });

    expect(res.status).toBe('success');
    expect(res.data.shareToken).toBeDefined();
    expect(res.data.shareUrl).toBe(`/api/v1/planner/share/${res.data.shareToken}`);
  });

  it('should fetch public shared itinerary by token', async () => {
    mockPrismaService.itinerary.findUnique.mockResolvedValueOnce({
      id: 'itin-001',
      shareToken: 'token-uuid-1234',
      title: 'Shared Trip',
    });

    const res = await service.getPublicItineraryByToken('token-uuid-1234');
    expect(res.status).toBe('success');
    expect(res.data.title).toBe('Shared Trip');
  });

  it('should throw NotFoundException for invalid share token', async () => {
    mockPrismaService.itinerary.findUnique.mockResolvedValueOnce(null);

    await expect(
      service.getPublicItineraryByToken('invalid-token'),
    ).rejects.toThrow(NotFoundException);
  });
});
