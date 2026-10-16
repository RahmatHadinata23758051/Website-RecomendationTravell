import {
  Controller,
  Post,
  Res,
  Body,
  HttpCode,
  HttpStatus,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { JwtAuthGuard, OptionalJwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { ChatbotService } from './chatbot.service';
import { AskChatbotDto } from './dto/ask-chatbot.dto';
import { RagRetrieverService } from './rag-retriever.service';

@Controller('api/v1/chatbot')
export class ChatbotController {
  constructor(
    private readonly chatbotService: ChatbotService,
    private readonly ragRetriever: RagRetrieverService,
  ) {}

  /** Admin-only manual rebuild of the RAG index after catalog file changes. */
  @Post('admin/refresh-index')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  refreshIndex() {
    const pool = this.ragRetriever.refreshIndex();
    return { status: 'success', data: { indexedDestinations: pool.length } };
  }

  @Post('chat/stream')
  @UseGuards(OptionalJwtAuthGuard)
  async streamChat(@Body() dto: AskChatbotDto, @Req() req: Request, @Res() res: Response) {
    const user = (req as Request & { user?: { id?: string } }).user;
    return this.chatbotService.streamChatbot({
      ...dto,
      userId: user?.id || dto.userId,
      mode: user?.id || dto.userId ? 'authenticated' : dto.mode || 'public',
    }, res);
  }

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
