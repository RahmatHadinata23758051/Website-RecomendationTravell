import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { DestinationsService } from './destinations.service';
import { GetRecommendationsDto } from './dto/get-recommendations.dto';
import { GetDestinationsDto } from './dto/get-destinations.dto';

@Controller('api/v1/destinations')
export class DestinationsController {
  constructor(private readonly destinationsService: DestinationsService) {}

  @Get()
  async getDestinations(
    @Query() query: GetDestinationsDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.destinationsService.getDestinations(query);
    
    // Add cache header for observability
    if (result.cacheHit !== undefined) {
      res.setHeader('X-Cache', result.cacheHit ? 'HIT' : 'MISS');
    }
    
    return result;
  }

  @Post('recommendations')
  @HttpCode(HttpStatus.OK)
  async getRecommendations(@Body() dto: GetRecommendationsDto) {
    return this.destinationsService.getRecommendations(dto);
  }

  @Get('popular')
  async getPopular() {
    return this.destinationsService.getPopularDestinations();
  }

  @Get('hidden-gems')
  async getHiddenGems() {
    return this.destinationsService.getHiddenGems();
  }

  @Get(':id')
  async getById(@Param('id') id: string) {
    return this.destinationsService.getDestinationById(id);
  }
}
