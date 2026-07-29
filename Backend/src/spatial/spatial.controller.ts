import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  ParseFloatPipe,
} from '@nestjs/common';
import { SpatialService } from './spatial.service';
import { GetNearbyDestinationsDto } from './dto/get-nearby-destinations.dto';

@Controller('api/v1/spatial')
export class SpatialController {
  constructor(private readonly spatialService: SpatialService) {}

  @Post('nearby')
  @HttpCode(HttpStatus.OK)
  async getNearby(@Body() dto: GetNearbyDestinationsDto) {
    return this.spatialService.findNearbyDestinations(dto);
  }

  @Get('distance')
  async getDistance(
    @Query('lat1', ParseFloatPipe) lat1: number,
    @Query('lon1', ParseFloatPipe) lon1: number,
    @Query('lat2', ParseFloatPipe) lat2: number,
    @Query('lon2', ParseFloatPipe) lon2: number,
  ) {
    return this.spatialService.calculatePointDistance(lat1, lon1, lat2, lon2);
  }
}
