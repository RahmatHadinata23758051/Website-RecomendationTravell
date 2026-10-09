import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { DestinationsService } from './destinations.service';
import { GetRecommendationsDto } from './dto/get-recommendations.dto';

@Controller('api/v1/destinations')
export class DestinationsController {
  constructor(private readonly destinationsService: DestinationsService) {}

  @Get()
  async getDestinations(
    @Res({ passthrough: true }) response: any,
    @Query('category') category?: string,
    @Query('city_or_regency') city_or_regency?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const result = await this.destinationsService.getDestinations({
      category,
      city_or_regency,
      search,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
    response.setHeader('X-Cache', result.cacheHit ? 'HIT' : 'MISS');
    return result;
  }

  @Post('recommendations')
  @HttpCode(HttpStatus.OK)
  async getRecommendations(
    @Res({ passthrough: true }) response: any,
    @Body() dto: GetRecommendationsDto,
  ) {
    const result = await this.destinationsService.getRecommendations(dto);
    response.setHeader('X-Cache', result.cacheHit ? 'HIT' : 'MISS');
    return result;
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
