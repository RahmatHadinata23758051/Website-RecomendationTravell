import { Test, TestingModule } from '@nestjs/testing';
import { PlacesSubmissionService } from './places-submission.service';
import { SubmissionDedupService } from './submission-dedup.service';
import { PrismaService } from '../prisma/prisma.service';
import { SubmitPlaceDto } from './dto/submit-place.dto';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

describe('PlacesSubmissionService', () => {
  let service: PlacesSubmissionService;
  let prisma: PrismaService;

  const mockPrisma = {
    placeSubmission: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
    },
  };

  const mockDedupService = {
    checkDuplicate: jest.fn().mockResolvedValue({ isDuplicate: false }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlacesSubmissionService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
        {
          provide: SubmissionDedupService,
          useValue: mockDedupService,
        },
      ],
    }).compile();

    service = module.get<PlacesSubmissionService>(PlacesSubmissionService);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('submitPlace', () => {
    it('should normalize place name and persist submission to database', async () => {
      const dto: SubmitPlaceDto = {
        name: '  Pantai   Pasir Putih Lampung!  ',
        category: 'beach',
        address: 'Jl. Raya Tarahan No. 12',
        cityRegency: 'Kabupaten Lampung Selatan',
        latitude: -5.523,
        longitude: 105.342,
      };

      const createdRecord = {
        id: 'sub-uuid-123',
        submitterId: 'user-1',
        name: 'Pantai Pasir Putih Lampung!',
        normalizedName: 'pantai pasir putih lampung',
        category: 'beach',
        status: 'PENDING',
      };

      mockPrisma.placeSubmission.create.mockResolvedValue(createdRecord);

      const result = await service.submitPlace('user-1', dto, '127.0.0.1', 'JestTest');

      expect(result).toEqual(createdRecord);
      expect(mockPrisma.placeSubmission.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            submitterId: 'user-1',
            name: 'Pantai   Pasir Putih Lampung!',
            normalizedName: 'pantai pasir putih lampung',
            cityRegency: 'Kabupaten Lampung Selatan',
            ipAddress: '127.0.0.1',
          }),
        }),
      );
    });
  });

  describe('getMySubmissions', () => {
    it('should return paginated user submissions', async () => {
      const items = [{ id: 'sub-1', name: 'Place 1' }];
      mockPrisma.placeSubmission.findMany.mockResolvedValue(items);
      mockPrisma.placeSubmission.count.mockResolvedValue(1);

      const result = await service.getMySubmissions('user-1', { page: 1, limit: 10 });

      expect(result.data).toEqual(items);
      expect(result.meta).toEqual({ page: 1, limit: 10, total: 1, totalPages: 1 });
      expect(mockPrisma.placeSubmission.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { submitterId: 'user-1' },
          skip: 0,
          take: 10,
        }),
      );
    });
  });

  describe('getSubmissionById', () => {
    it('should throw NotFoundException if submission does not exist', async () => {
      mockPrisma.placeSubmission.findUnique.mockResolvedValue(null);

      await expect(service.getSubmissionById('non-existent', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException if submission is not approved and user is not owner', async () => {
      mockPrisma.placeSubmission.findUnique.mockResolvedValue({
        id: 'sub-1',
        submitterId: 'different-user',
        status: 'PENDING',
      });

      await expect(service.getSubmissionById('sub-1', 'user-1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should return submission if approved even for third party', async () => {
      const submission = {
        id: 'sub-1',
        submitterId: 'user-other',
        status: 'APPROVED',
      };
      mockPrisma.placeSubmission.findUnique.mockResolvedValue(submission);

      const result = await service.getSubmissionById('sub-1', 'user-1');
      expect(result).toEqual(submission);
    });
  });
});