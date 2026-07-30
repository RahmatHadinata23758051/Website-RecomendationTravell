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
import { PlannerService } from './planner.service';
import { GeneratePlannerDto, SwapSlotDto } from './dto/generate-planner.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('api/v1/planner')
export class PlannerController {
  constructor(private readonly plannerService: PlannerService) {}

  // Public / Anonymous & Authenticated AI Itinerary Generation
  @Post('generate')
  @HttpCode(HttpStatus.OK)
  async generate(@Req() req: Request, @Body() dto: GeneratePlannerDto) {
    const userId = (req['user'] as any)?.id;
    return this.plannerService.generateItinerary(userId, dto);
  }

  // Public / Anonymous Spot Swap Alternatives
  @Post('swap-slot')
  @HttpCode(HttpStatus.OK)
  async swapSlot(@Body() dto: SwapSlotDto) {
    return this.plannerService.swapSlot(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  async getUserItineraries(@Req() req: Request) {
    const userId = (req['user'] as any)?.id;
    return this.plannerService.getUserItineraries(userId);
  }

  @Get('share/:shareToken')
  async getPublicItinerary(@Param('shareToken') shareToken: string) {
    return this.plannerService.getPublicItineraryByToken(shareToken);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async deleteItinerary(@Req() req: Request, @Param('id') id: string) {
    const userId = (req['user'] as any)?.id;
    return this.plannerService.deleteItinerary(userId, id);
  }
}
