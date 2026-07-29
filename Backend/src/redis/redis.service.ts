import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | null = null;
  private memoryFallback = new Map<string, { value: string; expiresAt: number }>();

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    const host = this.configService.get<string>('REDIS_HOST') || 'localhost';
    const port = this.configService.get<number>('REDIS_PORT') || 6379;

    try {
      this.client = new Redis({
        host,
        port,
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
        this.logger.warn(`[REDIS] Local connection bypassed: ${err.message}. Using In-Memory Cache.`);
        this.client = null;
      });

      if (this.client) {
        this.logger.log(`[REDIS] Connection established successfully on ${host}:${port}`);
      }
    } catch (err) {
      this.logger.warn(`[REDIS] Initialization warning: ${err.message}. Using In-Memory Cache.`);
      this.client = null;
    }
  }

  async get(key: string): Promise<string | null> {
    if (this.client && this.client.status === 'ready') {
      try {
        return await this.client.get(key);
      } catch (e) {
        // fallback
      }
    }

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
        // fallback
      }
    }

    const expiresAt = Date.now() + ttlSeconds * 1000;
    this.memoryFallback.set(key, { value, expiresAt });
  }

  async del(key: string): Promise<void> {
    if (this.client && this.client.status === 'ready') {
      try {
        await this.client.del(key);
      } catch (e) {
        // fallback
      }
    }
    this.memoryFallback.delete(key);
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.quit().catch(() => {});
    }
  }
}
