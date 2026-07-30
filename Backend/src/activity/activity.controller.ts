import {
  Controller,
  Get,
  Post,
  Body,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';
import { ActivityService } from './activity.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('api/v1/activities')
export class ActivityController {
  constructor(private readonly activityService: ActivityService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  async getActivities(@Req() req: Request) {
    const userId = (req as any).user.id;
    const activities = await this.activityService.getUserActivities(userId);
    return {
      statusCode: HttpStatus.OK,
      message: 'User activities retrieved successfully',
      data: activities,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async logActivity(
    @Req() req: Request,
    @Body() body: { action: string; title: string; subtitle?: string; iconType?: string },
  ) {
    const userId = (req as any).user.id;
    const activity = await this.activityService.logActivity(
      userId,
      body.action,
      body.title,
      body.subtitle,
      body.iconType,
    );
    return {
      statusCode: HttpStatus.CREATED,
      message: 'Activity logged successfully',
      data: activity,
    };
  }
}
