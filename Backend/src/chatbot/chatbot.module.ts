import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ChatbotController } from './chatbot.controller';
import { ChatbotService } from './chatbot.service';
import { RagRetrieverService } from './rag-retriever.service';

@Module({
  imports: [HttpModule],
  controllers: [ChatbotController],
  providers: [ChatbotService, RagRetrieverService],
  exports: [ChatbotService],
})
export class ChatbotModule {}
