import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { of } from 'rxjs';
import { ReviewsService } from './reviews.service';
import { PrismaService } from '../prisma/prisma.service';

describe('ReviewsService', () => {
  let service: ReviewsService;

  const mockPrismaService = {
    review: {
      create: jest.fn().mockImplementation((args) =>
        Promise.resolve({
          id: 'rev-001',
          userId: args.data.userId,
          canonicalId: args.data.canonicalId,
          rating: args.data.rating,
          reviewText: args.data.reviewText,
          sentimentLabel: args.data.sentimentLabel,
          sentimentScore: args.data.sentimentScore,
        }),
      ),
      findMany: jest.fn().mockResolvedValue([
        { rating: 5, sentimentLabel: 'POSITIVE' },
        { rating: 4, sentimentLabel: 'POSITIVE' },
        { rating: 2, sentimentLabel: 'NEGATIVE' },
      ]),
    },
  };

  const mockHttpService = {
    post: jest.fn().mockReturnValue(
      of({
        data: {
          sentiment_label: 'POSITIVE',
          confidence: 0.94,
        },
      }),
    ),
  };

  const mockConfigService = {
    get: jest.fn().mockReturnValue('http://localhost:8000'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReviewsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: HttpService, useValue: mockHttpService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<ReviewsService>(ReviewsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create review with NLP sentiment inferencing', async () => {
    const res = await service.createReview('usr-1', {
      canonicalId: 'dest-001',
      rating: 5,
      reviewText: 'Pemandangan pantai sangat indah dan fasilitas bersih!',
    });

    expect(res.status).toBe('success');
    expect(res.data.sentimentLabel).toBe('POSITIVE');
    expect(res.data.sentimentScore).toBe(0.94);
  });

  it('should calculate destination review sentiment summary accurately', async () => {
    const res = await service.getDestinationReviews('dest-001');

    expect(res.status).toBe('success');
    expect(res.sentiment_summary.total_reviews).toBe(3);
    expect(res.sentiment_summary.average_rating).toBe(3.7);
    expect(res.sentiment_summary.positive_ratio).toBe(0.67);
  });
});
