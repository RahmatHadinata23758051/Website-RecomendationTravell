import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | null = null;
  private memoryFallback = new Map<string, { value: string; expiresAt: number }>();
  private readonly isProduction = process.env.NODE_ENV === 'production';

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    const host = this.configService.get<string>('REDIS_HOST');
    const port = this.configService.get<number>('REDIS_PORT');

    if (!host || !port) {
      const message = '[REDIS] REDIS_HOST and REDIS_PORT must be configured.';
      if (this.isProduction) {
        throw new Error(message);
      }
      this.logger.warn(`${message} Using local development defaults.`);
    }

    const resolvedHost = host || 'localhost';
    const resolvedPort = port || 6379;

    try {
      this.client = new Redis({
        host: resolvedHost,
        port: resolvedPort,
        retryStrategy: (times) => {
          if (times > 3) {
            this.logger.warn('[REDIS] Connection retry limit reached. Falling back to In-Memory Cache.');
            return null; // stop retrying
          }
          return Math.min(times * 100, 2000);
        },
        lazyConnect: true,
      });

      await this.client.connect().catch((err) => {
        const message = `[REDIS] Connection failed: ${err.message}`;
        if (this.isProduction) {
          throw new Error(message);
        }
        this.logger.warn(`${message}. Using in-memory cache for development.`);
        this.client = null;
      });

      if (this.client) {
        this.logger.log(`[REDIS] Connection established successfully on ${resolvedHost}:${resolvedPort}`);
      }
    } catch (err) {
      if (this.isProduction) {
        throw err;
      }
      this.logger.warn(`[REDIS] Initialization warning: ${err.message}. Using in-memory cache for development.`);
      this.client = null;
    }
  }

  private throwIfProductionFallback(operation: string): void {
    if (this.isProduction) {
      throw new Error(`[REDIS] Redis is unavailable during ${operation} in production.`);
    }
  }

  async ping(): Promise<string> {
    if (this.client && this.client.status === 'ready') {
      return this.client.ping();
    }

    this.throwIfProductionFallback('ping');
    throw new Error('Redis client not ready');
  }

  async get(key: string): Promise<string | null> {
    if (this.client && this.client.status === 'ready') {
      try {
        return await this.client.get(key);
      } catch (e) {
        this.throwIfProductionFallback('get');
      }
    }

    this.throwIfProductionFallback('get');
    const item = this.memoryFallback.get(key);
    if (!item) return null;
    if (Date.now() > item.expiresAt) {
      this.memoryFallback.delete(key);
      return null;
    }
    return item.value;
  }

  async set(key: string, value: string, ttlSeconds: number = 3600): Promise<void> {
    if (this.client && this.client.status === 'ready') {
      try {
        await this.client.set(key, value, 'EX', ttlSeconds);
        return;
      } catch (e) {
        this.throwIfProductionFallback('set');
      }
    }

    this.throwIfProductionFallback('set');
    const expiresAt = Date.now() + ttlSeconds * 1000;
    this.memoryFallback.set(key, { value, expiresAt });
  }

  async del(key: string): Promise<void> {
    if (this.client && this.client.status === 'ready') {
      try {
        await this.client.del(key);
      } catch (e) {
        this.throwIfProductionFallback('del');
      }
    }

    this.throwIfProductionFallback('del');
    this.memoryFallback.delete(key);
  }

  async invalidateByPrefix(prefix: string): Promise<void> {
    if (this.client && this.client.status === 'ready') {
      try {
        const stream = this.client.scanStream({
          match: `${prefix}*`,
          count: 100,
        });
        const keysToDelete: string[] = [];
        for await (const resultKeys of stream) {
          if (Array.isArray(resultKeys) && resultKeys.length > 0) {
            keysToDelete.push(...resultKeys);
          }
        }
        if (keysToDelete.length > 0) {
          for (let i = 0; i < keysToDelete.length; i += 100) {
            const chunk = keysToDelete.slice(i, i + 100);
            await this.client.del(...chunk);
          }
        }
      } catch (e) {
        this.throwIfProductionFallback('invalidateByPrefix');
      }
    }

    this.throwIfProductionFallback('invalidateByPrefix');
    // Clear memory fallback for matching keys
    for (const key of this.memoryFallback.keys()) {
      if (key.startsWith(prefix)) {
        this.memoryFallback.delete(key);
      }
    }
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.quit().catch(() => {});
    }
  }
}
