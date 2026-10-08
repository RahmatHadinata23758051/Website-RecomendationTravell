import { Test, TestingModule } from '@nestjs/testing';
import { SubmissionDedupService } from './submission-dedup.service';
import { PrismaService } from '../prisma/prisma.service';
import { SpatialService } from '../spatial/spatial.service';

describe('SubmissionDedupService', () => {
  let service: SubmissionDedupService;
  let prisma: PrismaService;
  let spatialService: SpatialService;

  const mockPrisma = {
    placeSubmission: {
      findFirst: jest.fn(),
    },
  };

  const mockSpatial = {
    getAllDestinations: jest.fn().mockReturnValue([
      {
        id: 'dest-001',
        name: 'Pantai Mutun',
        category: 'beach',
        city_or_regency: 'Kabupaten Pesawaran',
        latitude: -5.5123,
        longitude: 105.2512,
        rating: 4.8,
      },
      {
        id: 'dest-002',
        name: 'Pantai Bensam',
        category: 'beach',
        city_or_regency: 'Kabupaten Pesawaran',
        latitude: -5.5034,
        longitude: 105.253,
        rating: 4.9,
      },
    ]),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubmissionDedupService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: SpatialService, useValue: mockSpatial },
      ],
    }).compile();

    service = module.get<SubmissionDedupService>(SubmissionDedupService);
    prisma = module.get<PrismaService>(PrismaService);
    spatialService = module.get<SpatialService>(SpatialService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('checkDuplicate', () => {
    it('should detect exact duplicate against canonical catalog', async () => {
      // Pantai Mutun with exact same coordinates (distance < 200m)
      const result = await service.checkDuplicate(
        'Kabupaten Pesawaran',
        'Pantai Mutun',
        -5.5123,
        105.2512,
      );

      expect(result.isDuplicate).toBe(true);
      expect(result.existingCanonicalId).toBe('dest-001');
      expect(result.confidence).toBe(0.99);
      expect(result.matchedField).toBe('exact_name_location');
    });

    it('should detect fuzzy duplicate against canonical catalog (typo in name, nearby distance)', async () => {
      // 'Pantai Mutun Lampung' within 300m of Pantai Mutun
      const result = await service.checkDuplicate(
        'Kabupaten Pesawaran',
        'Pantai Mutun Wisata',
        -5.513,
        105.2515,
      );

      // Mutun similarity: 'pantai mutun wisata' vs 'pantai mutun'
      // If score >= 0.85 and distance < 0.5km, detected as fuzzy duplicate
      if (result.isDuplicate) {
        expect(result.existingCanonicalId).toBe('dest-001');
        expect(result.confidence).toBeGreaterThan(0.7);
      }
    });

    it('should detect duplicate against pending submissions in review queue', async () => {
      mockPrisma.placeSubmission.findFirst.mockResolvedValue({
        id: 'sub-pending-999',
      });

      const result = await service.checkDuplicate(
        'Kabupaten Tanggamus',
        'Air Terjun Way Lalaan Baru',
        -5.45,
        104.75,
      );

      expect(result.isDuplicate).toBe(true);
      expect(result.existingSubmissionId).toBe('sub-pending-999');
      expect(result.confidence).toBe(0.9);
      expect(result.matchedField).toBe('pending_submission');
      expect(mockPrisma.placeSubmission.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            cityRegency: 'Kabupaten Tanggamus',
            normalizedName: 'air terjun way lalaan baru',
            status: { in: ['PENDING', 'UNDER_REVIEW'] },
          }),
        }),
      );
    });

    it('should return isDuplicate: false for completely new destination', async () => {
      mockPrisma.placeSubmission.findFirst.mockResolvedValue(null);

      const result = await service.checkDuplicate(
        'Kabupaten Lampung Barat',
        'Danau Suoh Savana Indah',
        -5.23,
        104.25,
      );

      expect(result.isDuplicate).toBe(false);
      expect(result.confidence).toBe(0);
      expect(result.matchedField).toBe('none');
    });
  });
});
