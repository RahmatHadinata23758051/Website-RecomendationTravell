import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('api/v1/reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createReview(@Req() req: Request, @Body() dto: CreateReviewDto) {
    const userId = req['user']['id'];
    return this.reviewsService.createReview(userId, dto);
  }

  @Get(':canonicalId')
  async getDestinationReviews(@Param('canonicalId') canonicalId: string) {
    return this.reviewsService.getDestinationReviews(canonicalId);
  }
}
