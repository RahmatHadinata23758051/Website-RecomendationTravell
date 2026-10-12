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
});
