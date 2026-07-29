import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { FavoritesService } from './favorites.service';
import { PrismaService } from '../prisma/prisma.service';

describe('FavoritesService', () => {
  let service: FavoritesService;

  const mockPrismaService = {
    userFavorite: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FavoritesService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<FavoritesService>(FavoritesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should add a favorite destination for user', async () => {
    mockPrismaService.userFavorite.findUnique.mockResolvedValueOnce(null);
    mockPrismaService.userFavorite.create.mockResolvedValueOnce({
      id: 'fav-1',
      userId: 'usr-1',
      canonicalId: 'dest-001',
    });

    const res = await service.addFavorite('usr-1', { canonicalId: 'dest-001' });
    expect(res.status).toBe('success');
    expect(res.data.canonicalId).toBe('dest-001');
  });

  it('should throw ConflictException if destination is already bookmarked', async () => {
    mockPrismaService.userFavorite.findUnique.mockResolvedValueOnce({
      id: 'fav-1',
    });

    await expect(
      service.addFavorite('usr-1', { canonicalId: 'dest-001' }),
    ).rejects.toThrow(ConflictException);
  });

  it('should remove a favorite destination for user', async () => {
    mockPrismaService.userFavorite.findUnique.mockResolvedValueOnce({
      id: 'fav-1',
    });
    mockPrismaService.userFavorite.delete.mockResolvedValueOnce({});

    const res = await service.removeFavorite('usr-1', 'dest-001');
    expect(res.status).toBe('success');
  });

  it('should throw NotFoundException when trying to delete non-existent favorite', async () => {
    mockPrismaService.userFavorite.findUnique.mockResolvedValueOnce(null);

    await expect(service.removeFavorite('usr-1', 'dest-999')).rejects.toThrow(
      NotFoundException,
    );
  });
});
