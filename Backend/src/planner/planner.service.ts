import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ServiceUnavailableException,
  Logger,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { GeneratePlannerDto, SwapSlotDto } from './dto/generate-planner.dto';

@Injectable()
export class PlannerService {
  private readonly logger = new Logger(PlannerService.name);
  private readonly mlApiUrl = process.env.ML_API_URL || 'http://localhost:8000';

  constructor(
    private readonly prisma: PrismaService,
    private readonly httpService: HttpService,
  ) {}

  async generateItinerary(userId?: string, dto?: GeneratePlannerDto) {
    const {
      city_or_regency = 'Kabupaten Pesawaran',
      primary_category = 'Semua',
      budget_level = 'Standar',
      pace_style = 'Santai',
      duration_days = 1,
    } = dto || {};

    this.logger.log(
      `[PLANNER GENERATOR] Generating ${duration_days}-day itinerary for regency '${city_or_regency}' (User: ${userId || 'Guest'})`,
    );

    let resultData: any = null;

    // 1. Try FastAPI Python ML Engine
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.mlApiUrl}/api/v1/planner/generate`,
          {
            city_or_regency,
            primary_category,
            budget_level,
            pace_style,
            duration_days,
          },
          { timeout: 4000 },
        ),
      );

      if (response?.data?.status === 'success') {
        resultData = response.data;
        this.logger.log(
          `[PLANNER ML ENGINE] Successfully received ML itinerary response in ${resultData.execution_latency_ms}ms`,
        );
      }
    } catch (error) {
      this.logger.warn(
        `[PLANNER ML UNAVAILABLE] FastAPI Python ML API unavailable (${error.message}). Surfacing honest 503.`,
      );
    }

    // 2. No synthetic fallback: if ML engine is unavailable, surface an honest 503
    if (!resultData) {
      throw new ServiceUnavailableException({
        statusCode: 503,
        error: 'ML_ENGINE_UNAVAILABLE',
        message: 'Layanan AI Planner sedang tidak tersedia. Silakan coba lagi beberapa saat lagi.',
      });
    }

    // 3. Save to database if user is authenticated
    let savedItinerary: any = null;
    let shareUrl = null;

    if (userId) {
      const shareToken = crypto.randomUUID();
      savedItinerary = await this.prisma.itinerary.create({
        data: {
          userId,
          title: `Rute Wisata ${city_or_regency} (${duration_days} Hari)`,
          shareToken,
          daysJson: resultData.itinerary,
        },
      });
      shareUrl = `/share/${shareToken}`;
    }

    return {
      status: 'success',
      message: 'AI Itinerary generated successfully',
      regency: city_or_regency,
      duration_days,
      total_cost_estimate_idr: resultData.total_cost_estimate_idr,
      itinerary: resultData.itinerary,
      savedItinerary,
      shareUrl,
    };
  }

  async swapSlot(dto: SwapSlotDto) {
    const { city_or_regency, category, exclude_ids = [] } = dto;

    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.mlApiUrl}/api/v1/planner/swap-slot`,
          {
            city_or_regency,
            category,
            exclude_ids,
          },
          { timeout: 3000 },
        ),
      );

      if (response?.data?.status === 'success') {
        return response.data;
      }
      throw new Error('ML Engine returned non-success response');
    } catch (err) {
      this.logger.warn(`[SWAP SLOT FAILURE] ML API swap failed: ${err.message}`);
      throw new ServiceUnavailableException({
        statusCode: 503,
        error: 'ML_ENGINE_UNAVAILABLE',
        message: 'Layanan swap slot AI Planner sedang tidak tersedia.',
      });
    }
  }

  async getUserItineraries(userId: string) {
    const itineraries = await this.prisma.itinerary.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return {
      status: 'success',
      count: itineraries.length,
      data: itineraries,
    };
  }

  async getPublicItineraryByToken(shareToken: string) {
    const itinerary = await this.prisma.itinerary.findUnique({
      where: { shareToken },
      include: {
        user: {
          select: {
            fullName: true,
            email: true,
          },
        },
      },
    });

    if (!itinerary) {
      throw new NotFoundException('Itinerary not found');
    }

    return {
      status: 'success',
      data: itinerary,
    };
  }

  async deleteItinerary(userId: string, id: string) {
    const itinerary = await this.prisma.itinerary.findUnique({
      where: { id },
    });

    if (!itinerary) {
      throw new NotFoundException('Itinerary not found');
    }

    if (itinerary.userId !== userId) {
      throw new ForbiddenException('You cannot delete this itinerary');
    }

    await this.prisma.itinerary.delete({
      where: { id },
    });

    return {
      status: 'success',
      message: 'Itinerary deleted successfully',
    };
  }
}
