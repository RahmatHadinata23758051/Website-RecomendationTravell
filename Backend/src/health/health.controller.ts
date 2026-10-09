import { Controller, Get, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

type DependencyStatus = 'up' | 'down';

interface HealthDependency {
  status: DependencyStatus;
  latencyMs: number | null;
}

export interface HealthResponse {
  status: 'ok' | 'degraded';
  timestamp: string;
  service?: string;
  version?: string;
  uptime: number;
  memory: {
    heapUsed: number;
    rss: number;
  };
  services: {
    database: HealthDependency;
    redis: HealthDependency;
    mlEngine: HealthDependency;
  };
}

@Controller('api/v1')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  @Get('health')
  async getHealth(): Promise<HealthResponse> {
    const [database, redis, mlEngine] = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkMlEngine(),
    ]);

    const services = { database, redis, mlEngine };
    const status = Object.values(services).every(
      (service) => service.status === 'up',
    )
      ? 'ok'
      : 'degraded';
    const memoryUsage = process.memoryUsage();

    return {
      status,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: {
        heapUsed: this.toMegabytes(memoryUsage.heapUsed),
        rss: this.toMegabytes(memoryUsage.rss),
      },
      services,
      service: 'Recommendation Traveller Backend Gateway',
      version: 'v1.0.0',
    };
  }

  private async checkDatabase(): Promise<HealthDependency> {
    const startedAt = process.hrtime.bigint();

    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        status: 'up',
        latencyMs: this.elapsedMilliseconds(startedAt),
      };
    } catch (error) {
      this.logger.warn(`Database health check failed: ${this.errorMessage(error)}`);
      return { status: 'down', latencyMs: this.elapsedMilliseconds(startedAt) };
    }
  }

  private async checkRedis(): Promise<HealthDependency> {
    const startedAt = process.hrtime.bigint();

    try {
      await this.redisService.ping();
      return {
        status: 'up',
        latencyMs: this.elapsedMilliseconds(startedAt),
      };
    } catch (error) {
      this.logger.warn(`Redis health check failed: ${this.errorMessage(error)}`);
      return { status: 'down', latencyMs: this.elapsedMilliseconds(startedAt) };
    }
  }

  private async checkMlEngine(): Promise<HealthDependency> {
    const startedAt = process.hrtime.bigint();
    const mlEngineUrl =
      this.configService.get<string>('ML_ENGINE_URL') || 'http://localhost:8000';
    const healthUrl =
      this.configService.get<string>('ML_ENGINE_HEALTH_URL') ||
      `${mlEngineUrl.replace(/\/$/, '')}/api/v1/health`;

    try {
      await firstValueFrom(this.httpService.get(healthUrl, { timeout: 2000 }));
      return {
        status: 'up',
        latencyMs: this.elapsedMilliseconds(startedAt),
      };
    } catch (error) {
      this.logger.warn(`ML engine health check failed: ${this.errorMessage(error)}`);
      return { status: 'down', latencyMs: this.elapsedMilliseconds(startedAt) };
    }
  }

  private elapsedMilliseconds(startedAt: bigint): number {
    return Number(process.hrtime.bigint() - startedAt) / 1_000_000;
  }

  private toMegabytes(bytes: number): number {
    return Number((bytes / 1024 / 1024).toFixed(2));
  }

  private errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}
