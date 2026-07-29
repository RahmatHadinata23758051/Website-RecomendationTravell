import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';
import { FavoritesService } from './favorites.service';
import { CreateFavoriteDto } from './dto/create-favorite.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('api/v1/favorites')
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async addFavorite(@Req() req: Request, @Body() dto: CreateFavoriteDto) {
    const userId = req['user']['id'];
    return this.favoritesService.addFavorite(userId, dto);
  }

  @Get()
  async getFavorites(@Req() req: Request) {
    const userId = req['user']['id'];
    return this.favoritesService.getUserFavorites(userId);
  }

  @Delete(':canonicalId')
  @HttpCode(HttpStatus.OK)
  async removeFavorite(
    @Req() req: Request,
    @Param('canonicalId') canonicalId: string,
  ) {
    const userId = req['user']['id'];
    return this.favoritesService.removeFavorite(userId, canonicalId);
  }
}
