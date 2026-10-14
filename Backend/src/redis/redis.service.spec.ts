import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { RedisService } from './redis.service';

describe('RedisService', () => {
  const makeConfig = (values: Record<string, unknown>) =>
    ({ get: jest.fn((key: string) => values[key]) }) as unknown as ConfigService;

  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    jest.restoreAllMocks();
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;
  });

  it('uses development defaults when Redis host/port are absent outside production', async () => {
    process.env.NODE_ENV = 'test';
    const service = new RedisService(makeConfig({}));
    const connect = jest.spyOn(Redis.prototype, 'connect').mockRejectedValue(new Error('redis unavailable'));

    await expect(service.onModuleInit()).resolves.toBeUndefined();
    expect(connect).toHaveBeenCalled();
  });

  it('fails closed when Redis host/port are absent in production', async () => {
    process.env.NODE_ENV = 'production';
    const service = new RedisService(makeConfig({}));

    await expect(service.onModuleInit()).rejects.toThrow('REDIS_HOST and REDIS_PORT must be configured');
  });

  it('does not use memory fallback for reads in production', async () => {
    process.env.NODE_ENV = 'production';
    const service = new RedisService(makeConfig({ REDIS_HOST: 'redis', REDIS_PORT: 6379 }));
    (service as any).client = null;

    await expect(service.get('key')).rejects.toThrow('Redis is unavailable during get in production');
  });

  it('allows memory fallback for local development', async () => {
    process.env.NODE_ENV = 'test';
    const service = new RedisService(makeConfig({ REDIS_HOST: 'redis', REDIS_PORT: 6379 }));
    (service as any).client = null;

    await expect(service.set('key', 'value', 60)).resolves.toBeUndefined();
    await expect(service.get('key')).resolves.toBe('value');
  });

  it('increments rate-limit counts and rejects invalid TTLs', async () => {
    process.env.NODE_ENV = 'test';
    const service = new RedisService(makeConfig({ REDIS_HOST: 'redis', REDIS_PORT: 6379 }));
    (service as any).client = null;

    await expect(service.increment('route:user', 60_000)).resolves.toMatchObject({ totalHits: 1 });
    await expect(service.increment('route:user', 60_000)).resolves.toMatchObject({ totalHits: 2 });
    await expect(service.increment('', 60_000)).rejects.toThrow('positive number');
    await expect(service.increment('route:user', 0)).rejects.toThrow('positive number');
  });

  it('executes atomic Lua script when Redis client is ready', async () => {
    process.env.NODE_ENV = 'production';
    const service = new RedisService(makeConfig({ REDIS_HOST: 'redis', REDIS_PORT: 6379 }));
    const mockEval = jest.fn().mockResolvedValue([1, 60000]);
    (service as any).client = {
      status: 'ready',
      eval: mockEval,
    };

    const result = await service.increment('ip:127.0.0.1', 60_000);
    expect(result).toEqual({ totalHits: 1, timeToExpire: 60 });
    expect(mockEval).toHaveBeenCalledWith(
      expect.stringContaining("redis.call('INCR'"),
      1,
      'throttler:ip:127.0.0.1',
      60_000,
    );
  });
});
