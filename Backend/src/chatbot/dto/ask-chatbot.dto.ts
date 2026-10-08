import {
  IsArray,
  IsIn,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

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

  /** The client may explicitly describe the mode; the JWT remains authoritative. */
  @IsOptional()
  @IsIn(['public', 'authenticated'])
  mode?: 'public' | 'authenticated';

  /** Used by trusted callers that already resolved a user context. */
  @IsOptional()
  @IsString()
  userId?: string;

  /** Optional client context (for example preferences) for non-session integrations. */
  @IsOptional()
  @IsObject()
  userContext?: {
    preferences?: string[];
    itineraries?: Array<{ title?: string; daysJson?: unknown }>;
  };
}
