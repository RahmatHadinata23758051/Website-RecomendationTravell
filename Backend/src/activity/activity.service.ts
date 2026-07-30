import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ActivityService {
  constructor(private readonly prisma: PrismaService) {}

  async getUserActivities(userId: string) {
    return this.prisma.userActivity.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });
  }

  async logActivity(
    userId: string,
    action: string,
    title: string,
    subtitle?: string,
    iconType?: string,
  ) {
    // Create new activity entry
    const newActivity = await this.prisma.userActivity.create({
      data: {
        userId,
        action,
        title,
        subtitle,
        iconType: iconType || 'star',
      },
    });

    // Enforce 10-item cap per user
    const userActivities = await this.prisma.userActivity.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    if (userActivities.length > 10) {
      const idsToDelete = userActivities.slice(10).map((act) => act.id);
      await this.prisma.userActivity.deleteMany({
        where: {
          id: {
            in: idsToDelete,
          },
        },
      });
    }

    return newActivity;
  }
}
