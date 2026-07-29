import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import * as crypto from 'crypto';
import { RedisService } from '../redis/redis.service';
import { GetRecommendationsDto } from './dto/get-recommendations.dto';

@Injectable()
export class DestinationsService {
  private readonly logger = new Logger(DestinationsService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly redisService: RedisService,
    private readonly configService: ConfigService,
  ) {}

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
      } catch (err) {
        // Fallback to fresh fetch if JSON parse fails
      }
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
      this.logger.warn(`[ML ENGINE FALLBACK] Could not reach ML Engine: ${error.message}. Returning fallback static catalog.`);
      
      // Resilient Fallback Data if ML Engine is offline during dev/test
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
          {
            rank: 2,
            name: 'Camp Ground Gunung Pesagi',
            city_or_regency: 'Kabupaten Lampung Barat',
            final_score: 0.8269,
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
    return {
      status: 'success',
      popular_destinations: [
        {
          name: 'Pantai Mutun',
          city_or_regency: 'Kabupaten Pesawaran',
          category: 'beach',
          rating: 4.8,
        },
        {
          name: 'Taman Nasional Way Kambas',
          city_or_regency: 'Kabupaten Lampung Timur',
          category: 'nature',
          rating: 4.9,
        },
      ],
    };
  }

  async getHiddenGems() {
    return {
      status: 'success',
      hidden_gems: [
        {
          name: 'Air Terjun Curup Gangsa',
          city_or_regency: 'Kabupaten Way Kanan',
          category: 'waterfall',
          rating: 4.9,
          sentiment_score: 0.96,
        },
      ],
    };
  }
}
