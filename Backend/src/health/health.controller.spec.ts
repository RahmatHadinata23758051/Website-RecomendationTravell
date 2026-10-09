import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { of, throwError } from 'rxjs';
import { HealthController } from './health.controller';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

describe('HealthController', () => {
  let controller: HealthController;

  const mockPrismaService = {
    $queryRaw: jest.fn().mockResolvedValue(undefined),
  };

  const mockRedisService = {
    ping: jest.fn().mockResolvedValue('PONG'),
  };

  const mockHttpService = {
    get: jest.fn().mockReturnValue(
      of({ status: 200, data: { status: 'ok' } }),
    ),
  };

  const mockConfigService = {
    get: jest.fn().mockImplementation((key: string) => {
      if (key === 'ML_ENGINE_URL') return 'http://localhost:8000';
      if (key === 'ML_ENGINE_HEALTH_URL') return 'http://localhost:8000/health';
      return undefined;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: RedisService, useValue: mockRedisService },
        { provide: HttpService, useValue: mockHttpService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return healthy status when all services are up', async () => {
    const result = await controller.getHealth();

    expect(result).toBeDefined();
    expect(result.status).toBe('ok');
    expect(result.timestamp).toBeDefined();
    expect(result.uptime).toBeGreaterThan(0);
    expect(result.memory.heapUsed).toBeGreaterThanOrEqual(0);
    expect(result.memory.rss).toBeGreaterThanOrEqual(0);
    expect(result.services.database.status).toBe('up');
    expect(result.services.database.latencyMs).toBeGreaterThanOrEqual(0);
    expect(result.services.redis.status).toBe('up');
    expect(result.services.redis.latencyMs).toBeGreaterThanOrEqual(0);
    expect(result.services.mlEngine.status).toBe('up');
    expect(result.services.mlEngine.latencyMs).toBeGreaterThanOrEqual(0);
    expect(result.service).toBe('Recommendation Traveller Backend Gateway');
    expect(result.version).toBe('v1.0.0');
  });

  it('should return degraded status when database is down', async () => {
    mockPrismaService.$queryRaw.mockRejectedValueOnce(new Error('Connection failed'));

    const result = await controller.getHealth();

    expect(result.status).toBe('degraded');
    expect(result.services.database.status).toBe('down');
    expect(result.services.redis.status).toBe('up');
    expect(result.services.mlEngine.status).toBe('up');
  });

  it('should return degraded status when redis is down', async () => {
    mockRedisService.ping.mockRejectedValueOnce(new Error('Redis connection failed'));

    const result = await controller.getHealth();

    expect(result.status).toBe('degraded');
    expect(result.services.database.status).toBe('up');
    expect(result.services.redis.status).toBe('down');
    expect(result.services.mlEngine.status).toBe('up');
  });

  it('should return degraded status when ML engine is down', async () => {
    mockHttpService.get.mockReturnValueOnce(throwError(() => new Error('ML Engine unreachable')));

    const result = await controller.getHealth();

    expect(result.status).toBe('degraded');
    expect(result.services.database.status).toBe('up');
    expect(result.services.redis.status).toBe('up');
    expect(result.services.mlEngine.status).toBe('down');
  });

  it('should return degraded status when multiple services are down', async () => {
    mockPrismaService.$queryRaw.mockRejectedValueOnce(new Error('Connection failed'));
    mockRedisService.ping.mockRejectedValueOnce(new Error('Redis connection failed'));

    const result = await controller.getHealth();

    expect(result.status).toBe('degraded');
    expect(result.services.database.status).toBe('down');
    expect(result.services.redis.status).toBe('down');
    expect(result.services.mlEngine.status).toBe('up');
  });
});