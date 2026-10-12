import { Injectable, Logger, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import * as crypto from 'crypto';
import { RedisService } from '../redis/redis.service';
import { GetRecommendationsDto } from './dto/get-recommendations.dto';
import { GetDestinationsDto } from './dto/get-destinations.dto';

export type GetDestinationsQueryDto = GetDestinationsDto;

@Injectable()
export class DestinationsService {
  private readonly logger = new Logger(DestinationsService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly redisService: RedisService,
    private readonly configService: ConfigService,
  ) {}

  async getDestinations(query: GetDestinationsDto = {}) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;

    const hash = crypto
      .createHash('md5')
      .update(JSON.stringify(query))
      .digest('hex');
    const cacheKey = `cache:destinations:${hash}`;

    // 1. Check Redis Cache
    const cachedData = await this.redisService.get(cacheKey);
    if (cachedData) {
      this.logger.log(`[CACHE HIT] Returning cached destinations for query: ${JSON.stringify(query)}`);
      try {
        const parsed = JSON.parse(cachedData);
        return {
          ...parsed,
          cacheHit: true,
        };
      } catch (err) {}
    }

    // 2. Cache Miss: Call FastAPI ML Engine GET /api/v1/destinations
    const mlEngineUrl =
      this.configService.get<string>('ML_ENGINE_URL') ||
      'http://localhost:8000';

    try {
      this.logger.log(`[CACHE MISS] Fetching destinations from ML Engine: ${mlEngineUrl}/api/v1/destinations`);
      const response = await firstValueFrom(
        this.httpService.get(`${mlEngineUrl}/api/v1/destinations`, {
          params: {
            ...query,
            page,
            limit,
          },
          timeout: 5000,
        }),
      );

      const data = response.data;
      let destinations = data.destinations || [];

      // Keep this guard for older ML deployments that do not yet implement
      // the discovery contract. Current ML responses are already filtered and
      // sorted before pagination.
      if (query.price_status && query.price_status !== 'all') {
        destinations = destinations.filter((d: any) =>
          query.price_status === 'free'
            ? d.price_status === 'free' || Number(d.price_min_idr || 0) === 0
            : Number(d.price_min_idr || 0) > 0,
        );
      }
      if (query.min_price !== undefined) {
        destinations = destinations.filter((d: any) => Number(d.price_min_idr || 0) >= query.min_price!);
      }
      if (query.max_price !== undefined) {
        destinations = destinations.filter((d: any) => Number(d.price_min_idr || 0) <= query.max_price!);
      }

      // Add fallback suggestions if 0 results
      const fallbackSuggestions = [];

      const result = {
        ...data,
        destinations,
        total_items: data.total_items !== undefined ? data.total_items : destinations.length,
        total_pages: data.total_pages !== undefined ? data.total_pages : Math.max(1, Math.ceil(destinations.length / limit)),
        fallback_suggestions: fallbackSuggestions,
        cacheHit: false,
      };

      // 3. Cache in Redis (3600s)
      await this.redisService.set(cacheKey, JSON.stringify(result), 3600);
      return result;
    } catch (error) {
      this.logger.warn(`[ML ENGINE UNAVAILABLE] Could not fetch destinations: ${error.message}`);
      throw new ServiceUnavailableException({
        statusCode: 503,
        error: 'ML_ENGINE_UNAVAILABLE',
        message: 'Daftar destinasi sedang tidak tersedia. Silakan coba lagi beberapa saat lagi.',
      });
    }
  }

  async getRecommendations(dto: GetRecommendationsDto) {
    const hash = crypto
      .createHash('md5')
      .update(JSON.stringify(dto))
      .digest('hex');
    const cacheKey = `cache:rec:${hash}`;

    // 1. Check Redis Cache
    const cachedData = await this.redisService.get(cacheKey);
    if (cachedData) {
      this.logger.log(`[CACHE HIT] Returning cached recommendations for key: ${cacheKey}`);
      try {
        const parsed = JSON.parse(cachedData);
        return {
          ...parsed,
          cacheHit: true,
        };
      } catch (err) {}
    }

    // 2. Cache Miss: Call FastAPI ML Engine
    const mlEngineUrl =
      this.configService.get<string>('ML_ENGINE_URL') ||
      'http://localhost:8000';

    try {
      this.logger.log(`[CACHE MISS] Calling FastAPI ML Engine: ${mlEngineUrl}/api/v1/recommendations`);
      const response = await firstValueFrom(
        this.httpService.post(`${mlEngineUrl}/api/v1/recommendations`, dto, {
          timeout: 5000,
        }),
      );

      const result = {
        ...response.data,
        cacheHit: false,
      };

      // 3. Store in Redis Cache with 1 Hour TTL (3600s)
      await this.redisService.set(cacheKey, JSON.stringify(response.data), 3600);
      return result;
    } catch (error) {
      this.logger.warn(`[ML ENGINE UNAVAILABLE] Could not reach ML Engine for recommendations: ${error.message}`);
      throw new ServiceUnavailableException({
        statusCode: 503,
        error: 'ML_ENGINE_UNAVAILABLE',
        message: 'Layanan rekomendasi sedang tidak tersedia. Silakan coba lagi beberapa saat lagi.',
      });
    }
  }

  async getDestinationById(id: string) {
    const mlEngineUrl =
      this.configService.get<string>('ML_ENGINE_URL') ||
      'http://localhost:8000';

    try {
      const response = await firstValueFrom(
        this.httpService.get(`${mlEngineUrl}/api/v1/destinations`, {
          params: { canonical_id: id, limit: 1 },
          timeout: 5000,
        }),
      );
      const match = (response.data?.destinations || []).find(
        (d: any) => String(d.canonical_id) === String(id),
      );
      if (!match) {
        throw new NotFoundException('Destinasi tidak ditemukan.');
      }
      return { status: 'success', destination: match };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.warn(`[ML ENGINE UNAVAILABLE] Could not load destination ${id}: ${error.message}`);
      throw new ServiceUnavailableException({
        statusCode: 503,
        error: 'ML_ENGINE_UNAVAILABLE',
        message: 'Detail destinasi sedang tidak tersedia. Silakan coba lagi beberapa saat lagi.',
      });
    }
  }

  async getPopularDestinations() {
    return this.getDestinations({ page: 1, limit: 8 });
  }

  async getHiddenGems() {
    return this.getDestinations({ page: 1, limit: 6 });
  }
}
