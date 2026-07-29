import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { of } from 'rxjs';
import { DestinationsService } from './destinations.service';
import { RedisService } from '../redis/redis.service';

describe('DestinationsService', () => {
  let service: DestinationsService;

  const mockHttpService = {
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
