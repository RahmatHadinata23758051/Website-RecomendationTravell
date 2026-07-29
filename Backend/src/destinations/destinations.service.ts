import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import * as crypto from 'crypto';
import { RedisService } from '../redis/redis.service';
import { GetRecommendationsDto } from './dto/get-recommendations.dto';

export interface GetDestinationsQueryDto {
  category?: string;
  city_or_regency?: string;
  search?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class DestinationsService {
  private readonly logger = new Logger(DestinationsService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly redisService: RedisService,
    private readonly configService: ConfigService,
  ) {}

  async getDestinations(query: GetDestinationsQueryDto) {
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
      this.logger.log(`[CACHE MISS] Fetching real destinations from ML Engine: ${mlEngineUrl}/api/v1/destinations`);
      const response = await firstValueFrom(
        this.httpService.get(`${mlEngineUrl}/api/v1/destinations`, {
          params: query,
          timeout: 5000,
        }),
      );

      const result = {
        ...response.data,
        cacheHit: false,
      };

      // 3. Cache in Redis (3600s)
      await this.redisService.set(cacheKey, JSON.stringify(response.data), 3600);
      return result;
    } catch (error) {
      this.logger.warn(`[ML ENGINE FALLBACK] Could not fetch destinations: ${error.message}`);
      return {
        status: 'fallback',
        page: query.page || 1,
        limit: query.limit || 20,
        total_items: 2,
        total_pages: 1,
        destinations: [
          {
            canonical_id: 'dest-001',
            name: 'Pulau Pahawang',
            primary_category: 'Pantai',
            city_or_regency: 'Pesawaran',
            address: 'Kec. Mawa, Pesawaran, Lampung',
            description: 'Surga snorkeling dengan air jernih dan terumbu karang alami.',
            image_url: '/assets/images/heroes/hero-pahawang-bg.png',
            rating: 4.8,
            reviews_count: 320,
            latitude: -5.6708,
            longitude: 105.2192,
            operational_status: 'open',
            price_status: 'paid',
            price_min_idr: 150000,
          },
        ],
        cacheHit: false,
      };
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
      this.logger.warn(`[ML ENGINE FALLBACK] Could not reach ML Engine: ${error.message}. Returning fallback.`);
      return {
        status: 'fallback',
        recommendations: [
          {
            rank: 1,
            name: 'Pantai Bensam',
            city_or_regency: 'Kabupaten Pesawaran',
            final_score: 0.8898,
            reason_codes: ['category_match', 'region_match', 'verified_open'],
          },
        ],
        execution_latency_ms: 1.5,
        cacheHit: false,
      };
    }
  }

  async getDestinationById(id: string) {
    return {
      status: 'success',
      destination: {
        canonical_id: id,
        name: 'Pantai Bensam',
        category: 'beach',
        city_or_regency: 'Kabupaten Pesawaran',
        latitude: -5.5034,
        longitude: 105.2530,
        sentiment_summary: {
          positive_ratio: 0.92,
          neutral_ratio: 0.05,
          negative_ratio: 0.03,
          total_reviews: 48,
        },
      },
    };
  }

  async getPopularDestinations() {
    return this.getDestinations({ page: 1, limit: 8 });
  }

  async getHiddenGems() {
    return this.getDestinations({ page: 1, limit: 6 });
  }
}
