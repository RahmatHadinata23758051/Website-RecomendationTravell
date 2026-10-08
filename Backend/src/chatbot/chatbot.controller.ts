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
      // A verified JWT always wins over a client-supplied id. The latter is
      // retained for trusted internal callers that provide user context.
      userId: user?.id || dto.userId,
      mode: user?.id || dto.userId ? 'authenticated' : dto.mode || 'public',
    });
  }
}
