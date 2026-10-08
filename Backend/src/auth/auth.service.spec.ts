import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
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
    jest.clearAllMocks();
    mockRedisService.get.mockResolvedValue(null);
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

  it('should blacklist refresh token on logout with a SHA-256 hashed key', async () => {
    const token = 'test-refresh-token';
    const tokenHash = createHash('sha256').update(token).digest('hex');

    await service.logout(token);

    expect(mockRedisService.set).toHaveBeenCalledWith(
      `blacklist:token:${tokenHash}`,
      'revoked',
      expect.any(Number),
    );
    expect(`blacklist:token:${tokenHash}`).not.toContain(token);
  });

  it('should throw UnauthorizedException when refresh token is blacklisted', async () => {
    const blacklistedToken = 'blacklisted-token';
    const tokenHash = createHash('sha256').update(blacklistedToken).digest('hex');

    mockRedisService.get.mockImplementation(async (key: string) => {
      if (key === `blacklist:token:${tokenHash}`) {
        return 'revoked';
      }
      return null;
    });
    mockJwtService.verifyAsync.mockResolvedValueOnce({ sub: 'user-1', email: 'test@test.com', role: 'USER' });

    await expect(service.refreshToken(blacklistedToken)).rejects.toThrow('Refresh token has been revoked');
    expect(mockRedisService.get).toHaveBeenCalledWith(`blacklist:token:${tokenHash}`);
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
    const tokenHash = createHash('sha256').update('valid-token').digest('hex');
    expect(mockRedisService.set).toHaveBeenCalledWith(
      `blacklist:token:${tokenHash}`,
      'revoked',
      expect.any(Number),
    );
  });
});
