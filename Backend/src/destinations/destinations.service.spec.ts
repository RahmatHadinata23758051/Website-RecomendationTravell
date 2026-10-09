import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { of } from 'rxjs';
import { DestinationsService } from './destinations.service';
import { RedisService } from '../redis/redis.service';

describe('DestinationsService', () => {
  let service: DestinationsService;

  const mockHttpService = {
    get: jest.fn().mockReturnValue(
      of({
        data: {
          status: 'success',
          page: 1,
          limit: 20,
          total_items: 2,
          total_pages: 1,
          destinations: [
            { canonical_id: 'dest-001', name: 'Pulau Pahawang', primary_category: 'Pantai', city_or_regency: 'Pesawaran', rating: 4.8, reviews_count: 320, price_min_idr: 150000, price_status: 'paid' },
            { canonical_id: 'dest-002', name: 'Taman Nasional Way Kambas', primary_category: 'Alam', city_or_regency: 'Lampung Timur', rating: 4.7, reviews_count: 512, price_min_idr: 30000, price_status: 'paid' },
          ],
        },
      }),
    ),
    post: jest.fn().mockReturnValue(
      of({
        data: {
          status: 'success',
          recommendations: [
            { rank: 1, name: 'Pantai Bensam', final_score: 0.8898 },
          ],
          execution_latency_ms: 1.2,
        },
      }),
    ),
  };

  const mockRedisService = {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
  };

  const mockConfigService = {
    get: jest.fn().mockReturnValue('http://localhost:8000'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DestinationsService,
        { provide: HttpService, useValue: mockHttpService },
        { provide: RedisService, useValue: mockRedisService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<DestinationsService>(DestinationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should call ML Engine on cache miss and return recommendations with cacheHit: false', async () => {
    const res = await service.getRecommendations({ category: 'beach', top_k: 5 });
    expect(res).toBeDefined();
    expect(res.cacheHit).toBe(false);
    expect(mockHttpService.post).toHaveBeenCalled();
    expect(mockRedisService.set).toHaveBeenCalled();
  });

  it('should filter destinations by price and expose cache metadata', async () => {
    const res = await service.getDestinations({ max_price: 50000, page: 1, limit: 20 });

    expect(res.cacheHit).toBe(false);
    expect(res.destinations).toHaveLength(1);
    expect(res.destinations[0].name).toBe('Taman Nasional Way Kambas');
    expect(res.fallback_suggestions).toEqual([]);
  });

  it('should return suggestions when a search has no matches', async () => {
    mockHttpService.get.mockReturnValueOnce(of({
      data: {
        status: 'success', page: 1, limit: 20, total_items: 0, total_pages: 1, destinations: [],
      },
    }));

    const res = await service.getDestinations({ search: 'tidak-ada-destinasi' });

    expect(res.destinations).toEqual([]);
    expect(res.fallback_suggestions.length).toBeGreaterThan(0);
  });

  it('should return cached data on cache hit without calling ML Engine', async () => {
    mockRedisService.get.mockResolvedValueOnce(
      JSON.stringify({
        status: 'success',
        recommendations: [{ rank: 1, name: 'Cached Beach' }],
      }),
    );

    const res = await service.getRecommendations({ category: 'beach', top_k: 5 });
    expect(res).toBeDefined();
    expect(res.cacheHit).toBe(true);
    expect(res.recommendations[0].name).toBe('Cached Beach');
  });
});
