import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

import { ActivityService } from '../activity/activity.service';

describe('AuthService', () => {
  let service: AuthService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockJwtService = {
    signAsync: jest.fn().mockResolvedValue('mocked_jwt_token'),
    verifyAsync: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn().mockReturnValue('mock_secret'),
  };

  const mockActivityService = {
    logActivity: jest.fn().mockResolvedValue(undefined),
  };

  const mockRedisService = {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
    del: jest.fn().mockResolvedValue(undefined),
    invalidateByPrefix: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: ActivityService, useValue: mockActivityService },
        { provide: RedisService, useValue: mockRedisService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should blacklist refresh token on logout', async () => {
    await service.logout('test-refresh-token');
    expect(mockRedisService.set).toHaveBeenCalledWith(
      'blacklist:refresh:test-refresh-token',
      'revoked',
      expect.any(Number),
    );
  });

  it('should throw UnauthorizedException when refresh token is blacklisted', async () => {
    mockRedisService.get.mockResolvedValueOnce('revoked');
    mockJwtService.verifyAsync.mockResolvedValueOnce({ sub: 'user-1', email: 'test@test.com', role: 'USER' });

    await expect(service.refreshToken('blacklisted-token')).rejects.toThrow('Refresh token has been revoked');
  });

  it('should blacklist old refresh token when issuing new tokens', async () => {
    mockRedisService.get.mockResolvedValueOnce(null);
    mockJwtService.verifyAsync.mockResolvedValueOnce({ sub: 'user-1', email: 'test@test.com', role: 'USER' });
    mockPrismaService.user.findUnique.mockResolvedValueOnce({
      id: 'user-1',
      email: 'test@test.com',
      role: 'USER',
    });

    await service.refreshToken('valid-token');
    expect(mockRedisService.set).toHaveBeenCalledWith(
      'blacklist:refresh:valid-token',
      'revoked',
      expect.any(Number),
    );
  });
});
