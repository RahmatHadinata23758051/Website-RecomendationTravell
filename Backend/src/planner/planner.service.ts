import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { GeneratePlannerDto } from './dto/generate-planner.dto';

@Injectable()
export class PlannerService {
  private readonly logger = new Logger(PlannerService.name);

  constructor(private readonly prisma: PrismaService) {}

  async generateItinerary(userId: string, dto: GeneratePlannerDto) {
    const { title, duration_days } = dto;

    this.logger.log(
      `[PLANNER GENERATOR] Generating ${duration_days}-day time-slotted itinerary for user ${userId}`,
    );

    // Build time-slotted days JSON structure
    const daysJson = Array.from({ length: duration_days }).map((_, index) => {
      const dayNum = index + 1;
      return {
        day: dayNum,
        theme: `Hari ${dayNum}: Eksplorasi Pariwisata Lampung`,
        time_slots: [
          {
            time: '08:00 - 10:30',
            activity: 'Kunjungan Destinasi Utama & Fotografi Spot',
            location: dayNum % 2 === 1 ? 'Pantai Mutun' : 'Pantai Bensam',
            recommended_duration_mins: 150,
          },
          {
            time: '12:00 - 13:30',
            activity: 'Istirahat & Makan Siang Kuliner Khas Lampung (Seruit)',
            location: 'Resto Wisata Lampung',
            recommended_duration_mins: 90,
          },
          {
            time: '15:00 - 17:30',
            activity: 'Wisata Alam & Sunset View',
            location: dayNum % 2 === 1 ? 'Pulau Pahawang' : 'Menara Siger',
            recommended_duration_mins: 150,
          },
          {
            time: '19:00 - 21:00',
            activity: 'Makan Malam & Belanja Oleh-Oleh Kerajinan Tapis',
            location: 'Pusat Kota Bandar Lampung',
            recommended_duration_mins: 120,
          },
        ],
      };
    });

    const shareToken = crypto.randomUUID();

    const itinerary = await this.prisma.itinerary.create({
      data: {
        userId,
        title,
        shareToken,
        daysJson: daysJson,
      },
    });

    return {
      status: 'success',
      message: 'Itinerary generated successfully',
      data: {
        ...itinerary,
        shareUrl: `/api/v1/planner/share/${shareToken}`,
      },
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
      throw new NotFoundException('Shared itinerary link is invalid or expired');
    }

    return {
      status: 'success',
      data: itinerary,
    };
  }

  async deleteItinerary(userId: string, id: string) {
    const existing = await this.prisma.itinerary.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Itinerary not found');
    }

    if (existing.userId !== userId) {
      throw new ForbiddenException('You do not have permission to delete this itinerary');
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
