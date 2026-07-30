import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateItineraryDto {
  title: string;
  daysJson: any;
}

@Injectable()
export class ItinerariesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateItineraryDto) {
    const itinerary = await this.prisma.itinerary.create({
      data: {
        userId,
        title: dto.title,
        daysJson: dto.daysJson,
      },
    });
    return itinerary;
  }

  async findMyTrips(userId: string) {
    return this.prisma.itinerary.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByShareToken(shareToken: string) {
    const itinerary = await this.prisma.itinerary.findUnique({
      where: { shareToken },
      include: {
        user: {
          select: {
            fullName: true,
            email: true,
            avatarUrl: true,
            xp: true,
          },
        },
      },
    });

    if (!itinerary) {
      throw new NotFoundException('Itinerary rute wisata tidak ditemukan');
    }

    return itinerary;
  }

  async remove(userId: string, id: string) {
    const existing = await this.prisma.itinerary.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Itinerary tidak ditemukan');
    }

    if (existing.userId !== userId) {
      throw new ForbiddenException('Anda tidak memiliki akses untuk menghapus itinerary ini');
    }

    await this.prisma.itinerary.delete({
      where: { id },
    });

    return { message: 'Itinerary berhasil dihapus' };
  }
}
