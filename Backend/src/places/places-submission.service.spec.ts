import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { of, throwError } from 'rxjs';
import { PlacesSubmissionService } from './places-submission.service';
import { SubmissionDedupService } from './submission-dedup.service';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { SubmitPlaceDto } from './dto/submit-place.dto';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';

describe('PlacesSubmissionService', () => {
  let service: PlacesSubmissionService;
  let prisma: PrismaService;

  const mockPrisma = {
    placeSubmission: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
    user: {
      update: jest.fn(),
    },
    userActivity: {
      create: jest.fn(),
    },
  };

  const mockDedupService = {
    checkDuplicate: jest.fn().mockResolvedValue({ isDuplicate: false }),
  };

  const mockRedis = {
    invalidateByPrefix: jest.fn().mockResolvedValue(undefined),
  };

  const mockHttpService = {
    post: jest.fn().mockReturnValue(of({ data: { status: 'success' } })),
  };

  const mockConfigService = {
    get: jest.fn().mockReturnValue('http://localhost:8000'),
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
        {
          provide: RedisService,
          useValue: mockRedis,
        },
        {
          provide: HttpService,
          useValue: mockHttpService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
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

    it('should return full details for admin including votes and comments', async () => {
      const submission = {
        id: 'sub-1',
        submitterId: 'user-other',
        status: 'PENDING',
        votes: [{ id: 'vote-1', userId: 'user-1', voteType: 'UPVOTE' }],
        comments: [
          { id: 'comment-1', userId: 'user-2', content: 'Nice place!', isInternal: false },
        ],
      };
      mockPrisma.placeSubmission.findUnique.mockResolvedValue(submission);

      const result = await service.getSubmissionById('sub-1', 'admin-1', true);
      expect(result).toEqual(submission);
      expect(result.votes).toHaveLength(1);
      expect(result.comments).toHaveLength(1);
    });
  });

  describe('getModerationQueue', () => {
    it('should return paginated submissions for admin with filters', async () => {
      const items = [
        { id: 'sub-1', status: 'PENDING', cityRegency: 'Kabupaten Tanggamus' },
        { id: 'sub-2', status: 'UNDER_REVIEW', cityRegency: 'Kabupaten Pesawaran' },
      ];
      mockPrisma.placeSubmission.findMany.mockResolvedValue(items);
      mockPrisma.placeSubmission.count.mockResolvedValue(2);

      const result = await service.getModerationQueue({
        status: 'PENDING',
        cityRegency: 'Kabupaten Tanggamus',
        page: 1,
        limit: 10,
        sortBy: 'submittedAt',
        sortOrder: 'desc',
      });

      expect(result.data).toEqual(items);
      expect(result.meta).toEqual({ page: 1, limit: 10, total: 2, totalPages: 1 });
      expect(mockPrisma.placeSubmission.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            status: 'PENDING',
            cityRegency: 'Kabupaten Tanggamus',
          },
          skip: 0,
          take: 10,
        }),
      );
    });

    it('should return all statuses when no status filter provided', async () => {
      const items = [{ id: 'sub-1' }, { id: 'sub-2' }];
      mockPrisma.placeSubmission.findMany.mockResolvedValue(items);
      mockPrisma.placeSubmission.count.mockResolvedValue(2);

      const result = await service.getModerationQueue({});

      expect(result.data).toEqual(items);
      expect(mockPrisma.placeSubmission.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {},
        }),
      );
    });
  });

  describe('moderateSubmission', () => {
    it('should approve submission and set moderator', async () => {
      const existingSubmission = { id: 'sub-1', status: 'PENDING' };
      const updatedSubmission = { ...existingSubmission, status: 'APPROVED', moderatorId: 'admin-1' };

      mockPrisma.placeSubmission.findUnique.mockResolvedValue(existingSubmission);
      mockPrisma.placeSubmission.update.mockResolvedValue(updatedSubmission);

      const result = await service.moderateSubmission(
        'sub-1',
        'admin-1',
        'APPROVE',
        'Layak untuk disetujui',
      );

      expect(result.status).toBe('APPROVED');
      expect(result.moderatorId).toBe('admin-1');
      expect(mockPrisma.placeSubmission.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'sub-1' },
          data: expect.objectContaining({
            status: 'APPROVED',
            moderator: { connect: { id: 'admin-1' } },
          }),
        }),
      );
    });

    it('should reject submission with required rejection reason', async () => {
      const existingSubmission = { id: 'sub-1', status: 'PENDING' };
      const updatedSubmission = {
        ...existingSubmission,
        status: 'REJECTED',
        rejectionReason: 'Data tidak lengkap',
      };

      mockPrisma.placeSubmission.findUnique.mockResolvedValue(existingSubmission);
      mockPrisma.placeSubmission.update.mockResolvedValue(updatedSubmission);

      const result = await service.moderateSubmission(
        'sub-1',
        'admin-1',
        'REJECT',
        'Perlu verifikasi ulang',
        'Data tidak lengkap',
      );

      expect(result.status).toBe('REJECTED');
      expect(result.rejectionReason).toBe('Data tidak lengkap');
    });

    it('should throw BadRequestException when rejecting without rejection reason', async () => {
      mockPrisma.placeSubmission.findUnique.mockResolvedValue({ id: 'sub-1' });

      await expect(
        service.moderateSubmission('sub-1', 'admin-1', 'REJECT'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should promote an approved submission, invalidate caches, and award XP', async () => {
      const existingSubmission = {
        id: 'sub-1',
        name: 'Pantai Baru',
        status: 'PENDING',
        submitterId: 'user-1',
      };
      const updatedSubmission = { ...existingSubmission, status: 'APPROVED' };

      mockPrisma.placeSubmission.findUnique
        .mockResolvedValueOnce(existingSubmission)
        .mockResolvedValueOnce({ ...existingSubmission, status: 'APPROVED' });
      mockPrisma.placeSubmission.update.mockResolvedValue(updatedSubmission);

      const result = await service.moderateSubmission(
        'sub-1',
        'admin-1',
        'APPROVE',
        'Data terverifikasi',
      );

      expect(result.status).toBe('APPROVED');
      expect(mockRedis.invalidateByPrefix).toHaveBeenCalledTimes(3);
      expect(mockHttpService.post).toHaveBeenCalledWith(
        'http://localhost:8000/api/v1/catalog/submissions',
        expect.objectContaining({
          canonical_id: 'dest-sub-sub-1',
          name: 'Pantai Baru',
        }),
        expect.any(Object),
      );
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { xp: { increment: 50 } },
      });
      expect(mockPrisma.userActivity.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user-1',
            action: 'DESTINATION_APPROVED',
          }),
        }),
      );
    });

    it('should not fail moderation when promotion side effects fail', async () => {
      const existingSubmission = {
        id: 'sub-1',
        name: 'Pantai Baru',
        status: 'PENDING',
        submitterId: 'user-1',
      };
      const updatedSubmission = { ...existingSubmission, status: 'APPROVED' };

      mockPrisma.placeSubmission.findUnique
        .mockResolvedValueOnce(existingSubmission)
        .mockResolvedValueOnce({ ...existingSubmission, status: 'APPROVED' });
      mockPrisma.placeSubmission.update.mockResolvedValue(updatedSubmission);
      mockPrisma.user.update.mockRejectedValue(new Error('temporary database error'));

      await expect(
        service.moderateSubmission('sub-1', 'admin-1', 'APPROVE'),
      ).resolves.toEqual(updatedSubmission);
    });

    it('should retain the approved status when ML synchronization fails', async () => {
      const existingSubmission = {
        id: 'sub-ml-failure',
        name: 'Pantai Gagal Sync',
        status: 'PENDING',
        submitterId: null,
      };
      const updatedSubmission = { ...existingSubmission, status: 'APPROVED' };

      mockPrisma.placeSubmission.findUnique
        .mockResolvedValueOnce(existingSubmission)
        .mockResolvedValueOnce({ ...existingSubmission, status: 'APPROVED' });
      mockPrisma.placeSubmission.update.mockResolvedValue(updatedSubmission);
      mockHttpService.post.mockReturnValueOnce(
        throwError(() => new Error('ML unavailable')),
      );

      await expect(
        service.moderateSubmission('sub-ml-failure', 'admin-1', 'APPROVE'),
      ).resolves.toEqual(updatedSubmission);
      expect(mockPrisma.placeSubmission.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            canonicalId: 'dest-sub-sub-ml-failure',
            promotionError: 'ML unavailable',
          }),
        }),
      );
    });

    it('should mark as duplicate with required duplicateOfId', async () => {
      const existingSubmission = { id: 'sub-1', status: 'PENDING' };
      const updatedSubmission = {
        ...existingSubmission,
        status: 'DUPLICATE',
        duplicateOfId: 'canonical-123',
      };

      mockPrisma.placeSubmission.findUnique.mockResolvedValue(existingSubmission);
      mockPrisma.placeSubmission.update.mockResolvedValue(updatedSubmission);

      const result = await service.moderateSubmission(
        'sub-1',
        'admin-1',
        'MARK_DUPLICATE',
        'Duplikat dengan katalog utama',
        undefined,
        'canonical-123',
      );

      expect(result.status).toBe('DUPLICATE');
      expect(result.duplicateOfId).toBe('canonical-123');
    });

    it('should throw BadRequestException when marking duplicate without duplicateOfId', async () => {
      mockPrisma.placeSubmission.findUnique.mockResolvedValue({ id: 'sub-1' });

      await expect(
        service.moderateSubmission('sub-1', 'admin-1', 'MARK_DUPLICATE'),
      ).rejects.toThrow(BadRequestException);
    });
  });
});