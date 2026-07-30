import {
  Injectable,
  NotFoundException,
  ForbiddenException,
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
        `[PLANNER ML FALLBACK] FastAPI Python ML API unavailable (${error.message}). Executing built-in NestJS Spatial Fallback Engine.`,
      );
    }

    // 2. Built-in NestJS Spatial Fallback Engine if ML engine unavailable
    if (!resultData) {
      resultData = this.executeFallbackSpatialEngine(
        city_or_regency,
        primary_category,
        budget_level,
        pace_style,
        duration_days,
      );
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
    } catch (err) {
      this.logger.warn(
        `[SWAP SLOT FALLBACK] ML API swap failed: ${err.message}. Using Database fallback.`,
      );
    }

    // In-memory Fallback Alternatives
    const alternatives = [
      {
        canonical_id: 'alt-1',
        time: 'Rekomendasi Alternatif',
        activityTitle: `Pantai Sari Ringgung ${city_or_regency}`,
        category: category || 'Pantai',
        location: `Kawasan Wisata Bahari ${city_or_regency}`,
        estimatedCost: 'Rp 25.000 / orang',
        numericCost: 25000,
        coords: [-5.5412, 105.2412],
        image: '/assets/images/heroes/hero-pahawang-bg.png',
        aiTip: `Alternatif spot unggulan di ${city_or_regency}. Rating ulasan 4.7/5.0.`,
      },
      {
        canonical_id: 'alt-2',
        time: 'Rekomendasi Alternatif',
        activityTitle: `Air Terjun Sukma Ilang ${city_or_regency}`,
        category: 'Alam',
        location: `Kawasan Hujan Tropis ${city_or_regency}`,
        estimatedCost: 'Rp 20.000 / orang',
        numericCost: 20000,
        coords: [-5.6123, 105.1843],
        image: 'https://images.unsplash.com/photo-1432405972618-c60b0225b8f9?auto=format&fit=crop&w=800&q=80',
        aiTip: `Spot suaka alam asri dengan hawa sejuk & kolam alami.`,
      },
      {
        canonical_id: 'alt-3',
        time: 'Rekomendasi Alternatif',
        activityTitle: `Pusat Oleh-Oleh & Sate Ikan ${city_or_regency}`,
        category: 'Kuliner',
        location: `Pusat Kota ${city_or_regency}`,
        estimatedCost: 'Rp 35.000 / orang',
        numericCost: 35000,
        coords: [-5.4292, 105.2611],
        image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80',
        aiTip: `Sajian khas daerah setempat dengan bahan segar otentik.`,
      },
    ];

    return {
      status: 'success',
      total_returned: alternatives.length,
      alternatives,
    };
  }

  private executeFallbackSpatialEngine(
    regency: string,
    category: string,
    budget: string,
    pace: string,
    duration: number,
  ) {
    const isPadat = pace === 'Padat';
    const slotsPerDay = isPadat ? 4 : 3;
    const daysResult = [];
    let totalCost = 0;

    const regencyCoords: Record<string, { lat: number; lng: number }> = {
      'Kota Bandar Lampung': { lat: -5.4129, lng: 105.2589 },
      'Kabupaten Pesawaran': { lat: -5.5248, lng: 105.1500 },
      'Kabupaten Pesisir Barat': { lat: -5.2130, lng: 103.9573 },
      'Kabupaten Lampung Selatan': { lat: -5.6503, lng: 105.5189 },
      'Kabupaten Lampung Barat': { lat: -5.0820, lng: 104.2164 },
      'Kabupaten Tanggamus': { lat: -5.4680, lng: 104.6855 },
      'Kabupaten Way Kanan': { lat: -4.5776, lng: 104.5609 },
      'Kabupaten Lampung Timur': { lat: -5.2053, lng: 105.6165 },
      'Kabupaten Lampung Tengah': { lat: -4.8840, lng: 105.2429 },
      'Kabupaten Lampung Utara': { lat: -4.8609, lng: 104.7337 },
      'Kota Metro': { lat: -5.1266, lng: 105.3099 },
      'Kabupaten Pringsewu': { lat: -5.3761, lng: 104.9670 },
      'Kabupaten Tulang Bawang': { lat: -4.3516, lng: 105.4805 },
      'Kabupaten Tulang Bawang Barat': { lat: -4.4540, lng: 105.0930 },
      'Kabupaten Mesuji': { lat: -4.0312, lng: 105.3776 },
    };

    const cleanKey = Object.keys(regencyCoords).find((k) =>
      k.toLowerCase().includes(regency.toLowerCase().replace('kabupaten ', '').replace('kota ', '').trim())
    );

    const baseCoords = cleanKey ? regencyCoords[cleanKey] : { lat: -5.4292, lng: 105.2611 };

    const pool = [
      {
        canonicalId: 'fb-1',
        name: `Wisata Unggulan ${regency}`,
        category: category !== 'Semua' ? category : 'Pantai',
        cost: 25000,
        lat: baseCoords.lat,
        lng: baseCoords.lng,
        img: '/assets/images/heroes/hero-pahawang-bg.png',
      },
      {
        canonicalId: 'fb-2',
        name: `Resto Wisata Kuliner Khas ${regency}`,
        category: 'Kuliner',
        cost: 35000,
        lat: baseCoords.lat + 0.015,
        lng: baseCoords.lng + 0.012,
        img: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80',
      },
      {
        canonicalId: 'fb-3',
        name: `Bukit Panorama Sunset ${regency}`,
        category: 'Alam',
        cost: 20000,
        lat: baseCoords.lat - 0.018,
        lng: baseCoords.lng - 0.014,
        img: 'https://images.unsplash.com/photo-1432405972618-c60b0225b8f9?auto=format&fit=crop&w=800&q=80',
      },
    ];

    for (let day = 1; day <= duration; day++) {
      const daySlots = [];
      for (let s = 0; s < slotsPerDay; s++) {
        const item = pool[s % pool.length];
        totalCost += item.cost;

        const isFood = s === 1;
        daySlots.push({
          canonical_id: item.canonicalId,
          time: s === 0 ? '08:30 - 11:30 WIB' : (s === 1 ? '12:00 - 14:00 WIB' : '15:30 - 18:30 WIB'),
          activityTitle: isFood ? `Kuliner Khas & Makan Siang ${regency}` : item.name,
          category: isFood ? 'Kuliner' : item.category,
          location: `Kawasan Wisata ${regency}`,
          estimatedCost: `Rp ${item.cost.toLocaleString('id-ID')} / orang`,
          numericCost: item.cost,
          coords: [item.lat, item.lng],
          image: item.img,
          aiTip: `Saran destinasi menarik di ${regency}. Disesuaikan dengan ritme liburan ${pace}.`,
          travelTime: s === 0 ? 'Lokasi awal hari' : '25 menit perjalanan',
        });
      }

      daysResult.push({
        dayNumber: day,
        title: `Hari ${day}: Jelajah ${regency}`,
        slots: daySlots,
      });
    }

    return {
      status: 'success',
      regency,
      duration_days: duration,
      total_cost_estimate_idr: totalCost,
      execution_latency_ms: 15.0,
      itinerary: daysResult,
    };
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
