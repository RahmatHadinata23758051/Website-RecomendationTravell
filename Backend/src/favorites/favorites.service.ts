import {
  Injectable,
  ConflictException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFavoriteDto } from './dto/create-favorite.dto';

@Injectable()
export class FavoritesService {
  private readonly logger = new Logger(FavoritesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async addFavorite(userId: string, dto: CreateFavoriteDto) {
    const existing = await this.prisma.userFavorite.findUnique({
      where: {
        userId_canonicalId: {
          userId,
          canonicalId: dto.canonicalId,
        },
      },
    });

    if (existing) {
      throw new ConflictException('Destination is already in your favorites');
    }

    const favorite = await this.prisma.userFavorite.create({
      data: {
        userId,
        canonicalId: dto.canonicalId,
      },
    });

    this.logger.log(
      `[FAVORITE ADDED] User ${userId} bookmarked destination ${dto.canonicalId}`,
    );

    return {
      status: 'success',
      message: 'Destination added to favorites',
      data: favorite,
    };
  }

  async getUserFavorites(userId: string) {
    const favorites = await this.prisma.userFavorite.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return {
      status: 'success',
      count: favorites.length,
      data: favorites,
    };
  }

  async removeFavorite(userId: string, canonicalId: string) {
    const existing = await this.prisma.userFavorite.findUnique({
      where: {
        userId_canonicalId: {
          userId,
          canonicalId,
        },
      },
    });

    if (!existing) {
      throw new NotFoundException('Bookmark not found in your favorites');
    }

    await this.prisma.userFavorite.delete({
      where: {
        userId_canonicalId: {
          userId,
          canonicalId,
        },
      },
    });

    this.logger.log(
      `[FAVORITE REMOVED] User ${userId} removed destination ${canonicalId}`,
    );

    return {
      status: 'success',
      message: 'Destination removed from favorites',
    };
  }
}
