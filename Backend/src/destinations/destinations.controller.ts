import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { DestinationsService } from './destinations.service';
import { GetRecommendationsDto } from './dto/get-recommendations.dto';

@Controller('api/v1/destinations')
export class DestinationsController {
  constructor(private readonly destinationsService: DestinationsService) {}

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
