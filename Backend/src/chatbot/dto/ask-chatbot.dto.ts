import { IsNotEmpty, IsOptional, IsString, MinLength, IsArray } from 'class-validator';

export class ChatHistoryItemDto {
  @IsNotEmpty()
  @IsString()
  sender: 'user' | 'bot';

  @IsNotEmpty()
  @IsString()
  text: string;
}

export class AskChatbotDto {
  @IsNotEmpty({ message: 'message is required' })
  @IsString({ message: 'message must be a string' })
  @MinLength(2, { message: 'message must be at least 2 characters long' })
  message: string;

  @IsOptional()
  @IsString({ message: 'context must be a string' })
  context?: string;

  @IsOptional()
  @IsArray()
  history?: ChatHistoryItemDto[];

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  regency?: string;
}
