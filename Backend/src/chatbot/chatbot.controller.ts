import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { OptionalJwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ChatbotService } from './chatbot.service';
import { AskChatbotDto } from './dto/ask-chatbot.dto';

@Controller('api/v1/chatbot')
export class ChatbotController {
  constructor(private readonly chatbotService: ChatbotService) {}

  @Post('chat')
  @HttpCode(HttpStatus.OK)
  @UseGuards(OptionalJwtAuthGuard)
  async chat(@Body() dto: AskChatbotDto, @Req() req: Request) {
    // OptionalJwtAuthGuard deliberately leaves req.user undefined for guests.
    // This endpoint therefore remains public while still receiving the verified
    // user identity whenever a valid bearer token is supplied.
    const user = (req as Request & { user?: { id?: string } }).user;
    return this.chatbotService.askChatbot({
      ...dto,
      userId: dto.userId || user?.id,
      mode: user?.id ? 'authenticated' : dto.mode || 'public',
    });
  }
}
