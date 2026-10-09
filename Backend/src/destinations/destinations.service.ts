import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import * as crypto from 'crypto';
import { RedisService } from '../redis/redis.service';
import { GetRecommendationsDto } from './dto/get-recommendations.dto';
import { GetDestinationsDto } from './dto/get-destinations.dto';

export type GetDestinationsQueryDto = GetDestinationsDto;

const DEFAULT_FALLBACK_DESTINATIONS = [
  {
    canonical_id: 'dest-001',
    name: 'Pulau Pahawang',
    primary_category: 'Pantai',
    city_or_regency: 'Kabupaten Pesawaran',
    address: 'Kecamatan Punduh Pidada, Kabupaten Pesawaran, Lampung',
    description: 'Surga snorkeling dengan air jernih dan terumbu karang alami yang mempesona.',
    image_url: '/assets/images/heroes/hero-pahawang-bg.png',
    rating: 4.8,
    reviews_count: 320,
    latitude: -5.6708,
    longitude: 105.2192,
    operational_status: 'open',
    price_status: 'paid',
    price_min_idr: 150000,
  },
  {
    canonical_id: 'dest-002',
    name: 'Taman Nasional Way Kambas',
    primary_category: 'Alam',
    city_or_regency: 'Kabupaten Lampung Timur',
    address: 'Labuhan Ratu, Lampung Timur, Lampung',
    description: 'Pusat konservasi gajah Sumatera tertua dan ekowisata alam liar terlindungi.',
    image_url: '/assets/images/regencies/lampung-timur.jpg',
    rating: 4.7,
    reviews_count: 512,
    latitude: -5.0211,
    longitude: 105.7892,
    operational_status: 'open',
    price_status: 'paid',
    price_min_idr: 30000,
  },
  {
    canonical_id: 'dest-003',
    name: 'Teluk Kiluan',
    primary_category: 'Adventure',
    city_or_regency: 'Kabupaten Tanggamus',
    address: 'Kiluan Negeri, Kelumbayan, Tanggamus, Lampung',
    description: 'Habitat lumba-lumba hidung botol dan laguna alami Laguna Gayau yang eksotis.',
    image_url: '/assets/images/regencies/tanggamus.jpg',
    rating: 4.7,
    reviews_count: 240,
    latitude: -5.7891,
    longitude: 105.1023,
    operational_status: 'open',
    price_status: 'paid',
    price_min_idr: 250000,
  },
  {
    canonical_id: 'dest-004',
    name: 'Menara Siger',
    primary_category: 'Budaya',
    city_or_regency: 'Kabupaten Lampung Selatan',
    address: 'Bakauheni, Lampung Selatan, Lampung',
    description: 'Ikon mahkota kebanggaan masyarakat Lampung di titik nol jalan lintas Sumatera.',
    image_url: '/assets/images/regencies/lampung-selatan.jpg',
    rating: 4.6,
    reviews_count: 850,
    latitude: -5.8672,
    longitude: 105.7538,
    operational_status: 'open',
    price_status: 'paid',
    price_min_idr: 20000,
  },
  {
    canonical_id: 'dest-005',
    name: 'Puncak Mas',
    primary_category: 'Alam',
    city_or_regency: 'Kota Bandar Lampung',
    address: 'Jl. H. Hamim RJP, Sukadana Ham, Tj. Karang Barat, Bandar Lampung',
    description: 'Wisata perbukitan modern dengan panorama kota Bandar Lampung dan rumah pohon estetik.',
    image_url: '/assets/images/regencies/bandar-lampung.jpg',
    rating: 4.5,
    reviews_count: 620,
    latitude: -5.4321,
    longitude: 105.2412,
    operational_status: 'open',
    price_status: 'paid',
    price_min_idr: 20000,
  },
  {
    canonical_id: 'dest-006',
    name: 'Taman Gajah (Elephant Park)',
    primary_category: 'Budaya',
    city_or_regency: 'Kota Bandar Lampung',
    address: 'Enggal, Kota Bandar Lampung, Lampung',
    description: 'Ruang terbuka hijau publik dan ikon pusat aktivitas masyarakat kota.',
    image_url: '/assets/images/regencies/bandar-lampung.jpg',
    rating: 4.4,
    reviews_count: 410,
    latitude: -5.4241,
    longitude: 105.2581,
    operational_status: 'open',
    price_status: 'free',
    price_min_idr: 0,
  },
  {
    canonical_id: 'dest-007',
    name: 'Pantai Gigi Hiu',
    primary_category: 'Adventure',
    city_or_regency: 'Kabupaten Tanggamus',
    address: 'Kelumbayan, Tanggamus, Lampung',
    description: 'Formasi tebing karang runcing menjulang unik dengan deburan ombak samudra lepas.',
    image_url: '/assets/images/regencies/tanggamus.jpg',
    rating: 4.8,
    reviews_count: 185,
    latitude: -5.7621,
    longitude: 105.1534,
    operational_status: 'open',
    price_status: 'paid',
    price_min_idr: 15000,
  },
  {
    canonical_id: 'dest-008',
    name: 'Sentra Pempek & Kemplang Teluk Betung',
    primary_category: 'Kuliner',
    city_or_regency: 'Kota Bandar Lampung',
    address: 'Jl. Ikan Hiu, Teluk Betung, Bandar Lampung',
    description: 'Pusat wisata kuliner khas Lampung, olahan ikan segar dan kemplang panggang legendaris.',
    image_url: '/assets/images/regencies/bandar-lampung.jpg',
    rating: 4.7,
    reviews_count: 730,
    latitude: -5.4491,
    longitude: 105.2678,
    operational_status: 'open',
    price_status: 'paid',
    price_min_idr: 25000,
  },
];

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

      // Filter in memory if ML engine doesn't support price filters natively
      if (query.price_status && query.price_status !== 'all') {
        destinations = destinations.filter((d: any) =>
          query.price_status === 'free' ? d.price_status === 'free' || d.price_min_idr === 0 : d.price_status === 'paid' && d.price_min_idr > 0,
        );
      }
      if (query.min_price !== undefined) {
        destinations = destinations.filter((d: any) => (d.price_min_idr || 0) >= query.min_price!);
      }
      if (query.max_price !== undefined) {
        destinations = destinations.filter((d: any) => (d.price_min_idr || 0) <= query.max_price!);
      }

      // Add fallback suggestions if 0 results
      const fallbackSuggestions = destinations.length === 0
        ? DEFAULT_FALLBACK_DESTINATIONS.slice(0, 4)
        : [];

      const result = {
        ...data,
        destinations,
        total_items: destinations.length,
        fallback_suggestions: fallbackSuggestions,
        cacheHit: false,
      };

      // 3. Cache in Redis (3600s)
      await this.redisService.set(cacheKey, JSON.stringify(result), 3600);
      return result;
    } catch (error) {
      this.logger.warn(`[ML ENGINE FALLBACK] Could not fetch destinations from ML Engine: ${error.message}`);
      
      // Perform rich in-memory filtering and sorting on fallback catalog
      let pool = [...DEFAULT_FALLBACK_DESTINATIONS];

      if (query.category && query.category.toLowerCase() !== 'semua') {
        const catTarget = query.category.toLowerCase().trim();
        pool = pool.filter((d) => d.primary_category.toLowerCase().includes(catTarget));
      }

      if (query.city_or_regency && query.city_or_regency.toLowerCase() !== 'semua') {
        const regTarget = query.city_or_regency
          .toLowerCase()
          .replace('kabupaten ', '')
          .replace('kota ', '')
          .trim();
        pool = pool.filter((d) =>
          d.city_or_regency.toLowerCase().includes(regTarget) ||
          d.address.toLowerCase().includes(regTarget),
        );
      }

      if (query.search) {
        const term = query.search.toLowerCase().trim();
        pool = pool.filter(
          (d) =>
            d.name.toLowerCase().includes(term) ||
            d.description.toLowerCase().includes(term) ||
            d.address.toLowerCase().includes(term) ||
            d.primary_category.toLowerCase().includes(term),
        );
      }

      if (query.price_status && query.price_status !== 'all') {
        pool = pool.filter((d) =>
          query.price_status === 'free' ? d.price_status === 'free' || d.price_min_idr === 0 : d.price_min_idr > 0,
        );
      }

      if (query.min_price !== undefined) {
        pool = pool.filter((d) => (d.price_min_idr || 0) >= query.min_price!);
      }

      if (query.max_price !== undefined) {
        pool = pool.filter((d) => (d.price_min_idr || 0) <= query.max_price!);
      }

      // Sort
      if (query.sort_by === 'rating') {
        pool.sort((a, b) => (query.sort_order === 'asc' ? a.rating - b.rating : b.rating - a.rating));
      } else if (query.sort_by === 'reviews_count') {
        pool.sort((a, b) => (query.sort_order === 'asc' ? a.reviews_count - b.reviews_count : b.reviews_count - a.reviews_count));
      } else if (query.sort_by === 'price_min_idr') {
        pool.sort((a, b) => (query.sort_order === 'asc' ? (a.price_min_idr || 0) - (b.price_min_idr || 0) : (b.price_min_idr || 0) - (a.price_min_idr || 0)));
      } else if (query.sort_by === 'name') {
        pool.sort((a, b) => (query.sort_order === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)));
      } else {
        // 'popular'
        pool.sort((a, b) => b.rating * b.reviews_count - a.rating * a.reviews_count);
      }

      const totalItems = pool.length;
      const totalPages = Math.max(1, Math.ceil(totalItems / limit));
      const startIdx = (page - 1) * limit;
      const paginatedDestinations = pool.slice(startIdx, startIdx + limit);

      const fallbackSuggestions = paginatedDestinations.length === 0
        ? DEFAULT_FALLBACK_DESTINATIONS.slice(0, 4)
        : [];

      return {
        status: 'fallback',
        page,
        limit,
        total_items: totalItems,
        total_pages: totalPages,
        destinations: paginatedDestinations,
        fallback_suggestions: fallbackSuggestions,
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
