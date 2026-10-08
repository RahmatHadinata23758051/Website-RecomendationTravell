import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { PassportModule } from '@nestjs/passport';
import { ChatbotController } from './chatbot.controller';
import { ChatbotService } from './chatbot.service';
import { RagRetrieverService } from './rag-retriever.service';

@Module({
  imports: [
    HttpModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
  ],
  controllers: [ChatbotController],
  providers: [ChatbotService, RagRetrieverService],
  exports: [ChatbotService],
})
export class ChatbotModule {}
