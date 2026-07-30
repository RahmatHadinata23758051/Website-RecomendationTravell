import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { of } from 'rxjs';
import { PlannerService } from './planner.service';
import { PrismaService } from '../prisma/prisma.service';

describe('PlannerService', () => {
  let service: PlannerService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    itinerary: {
      create: jest.fn().mockImplementation(({ data }) =>
        Promise.resolve({
          id: 'test-itinerary-id',
          ...data,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      ),
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn().mockResolvedValue(null),
      delete: jest.fn().mockResolvedValue({ id: 'test-itinerary-id' }),
    },
  };

  const mockHttpService = {
    post: jest.fn().mockReturnValue(
      of({
        data: {
          status: 'success',
          regency: 'Kabupaten Pesawaran',
          duration_days: 3,
          total_cost_estimate_idr: 150000,
          execution_latency_ms: 12.5,
          itinerary: [],
        },
      }),
    ),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlannerService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: HttpService, useValue: mockHttpService },
      ],
    }).compile();

    service = module.get<PlannerService>(PlannerService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should generate an itinerary successfully', async () => {
    const dto = {
      city_or_regency: 'Kabupaten Pesawaran',
      duration_days: 3,
    };

    const res = await service.generateItinerary('user-123', dto);

    expect(res.status).toBe('success');
    expect(res.regency).toBe('Kabupaten Pesawaran');
    expect(res.savedItinerary).toBeDefined();
  });
});
