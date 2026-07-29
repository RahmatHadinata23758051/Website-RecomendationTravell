import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';

@Injectable()
export class ReviewsService {
  private readonly logger = new Logger(ReviewsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  async createReview(userId: string, dto: CreateReviewDto) {
    const { canonicalId, rating, reviewText } = dto;

    this.logger.log(
      `[REVIEW INFERENCING] Analyzing real-time sentiment for user ${userId} on ${canonicalId}`,
    );

    let sentimentLabel = 'POSITIVE';
    let sentimentScore = 0.85;

    // 1. Perform Real-time Sentiment Inferencing via FastAPI ML Engine
    const mlEngineUrl =
      this.configService.get<string>('ML_ENGINE_URL') || 'http://localhost:8000';

    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${mlEngineUrl}/api/v1/sentiment`,
          { text: reviewText },
          { timeout: 4000 },
        ),
      );

      if (response.data && response.data.sentiment_label) {
        sentimentLabel = response.data.sentiment_label;
        sentimentScore = response.data.confidence || response.data.score || 0.9;
      }
    } catch (err) {
      this.logger.warn(
        `[NLP FALLBACK] FastAPI ML Engine offline: ${err.message}. Using rule-based fallback inferencing.`,
      );

      // Rule-based Fallback Inferencing
      const lower = reviewText.toLowerCase();
      if (
        lower.includes('buruk') ||
        lower.includes('kecewa') ||
        lower.includes('kotor') ||
        lower.includes('mahal')
      ) {
        sentimentLabel = 'NEGATIVE';
        sentimentScore = 0.78;
      } else if (
        lower.includes('biasa') ||
        lower.includes('lumayan') ||
        lower.includes('standar')
      ) {
        sentimentLabel = 'NEUTRAL';
        sentimentScore = 0.65;
      }
    }

    // 2. Save Review Record in Prisma PostgreSQL
    const review = await this.prisma.review.create({
      data: {
        userId,
        canonicalId,
        rating,
        reviewText,
        sentimentLabel,
        sentimentScore,
      },
      include: {
        user: {
          select: {
            fullName: true,
            email: true,
          },
        },
      },
    });

    return {
      status: 'success',
      message: 'Review created and sentiment inferred successfully',
      data: review,
    };
  }

  async getDestinationReviews(canonicalId: string) {
    const reviews = await this.prisma.review.findMany({
      where: { canonicalId },
      include: {
        user: {
          select: {
            fullName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const total = reviews.length;
    let positiveCount = 0;
    let negativeCount = 0;
    let neutralCount = 0;
    let ratingSum = 0;

    reviews.forEach((rev) => {
      ratingSum += rev.rating;
      if (rev.sentimentLabel === 'POSITIVE') positiveCount++;
      else if (rev.sentimentLabel === 'NEGATIVE') negativeCount++;
      else neutralCount++;
    });

    const summary = {
      total_reviews: total,
      average_rating: total > 0 ? Number((ratingSum / total).toFixed(1)) : 0,
      positive_ratio: total > 0 ? Number((positiveCount / total).toFixed(2)) : 0,
      negative_ratio: total > 0 ? Number((negativeCount / total).toFixed(2)) : 0,
      neutral_ratio: total > 0 ? Number((neutralCount / total).toFixed(2)) : 0,
    };

    return {
      status: 'success',
      canonicalId,
      sentiment_summary: summary,
      reviews,
    };
  }
}
