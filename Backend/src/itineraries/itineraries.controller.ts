import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
  HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';
import { ItinerariesService, CreateItineraryDto } from './itineraries.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('api/v1/itineraries')
export class ItinerariesController {
  constructor(private readonly itinerariesService: ItinerariesService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  async create(@Req() req: Request, @Body() dto: CreateItineraryDto) {
    const user = (req as any).user;
    const itinerary = await this.itinerariesService.create(user.id, dto);
    return {
      statusCode: HttpStatus.CREATED,
      message: 'Itinerary berhasil disimpan ke profil Anda',
      data: { itinerary },
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get('my-trips')
  async findMyTrips(@Req() req: Request) {
    const user = (req as any).user;
    const itineraries = await this.itinerariesService.findMyTrips(user.id);
    return {
      statusCode: HttpStatus.OK,
      message: 'Daftar itinerary tersimpan berhasil diambil',
      data: { itineraries },
    };
  }

  @Get('share/:shareToken')
  async findByShareToken(@Param('shareToken') shareToken: string) {
    const itinerary = await this.itinerariesService.findByShareToken(shareToken);
    return {
      statusCode: HttpStatus.OK,
      message: 'Detail itinerary rute publik berhasil diambil',
      data: { itinerary },
    };
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async remove(@Req() req: Request, @Param('id') id: string) {
    const user = (req as any).user;
    const result = await this.itinerariesService.remove(user.id, id);
    return {
      statusCode: HttpStatus.OK,
      message: result.message,
    };
  }
}
