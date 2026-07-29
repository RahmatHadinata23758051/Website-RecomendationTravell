import { IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class AskChatbotDto {
  @IsNotEmpty({ message: 'message is required' })
  @IsString({ message: 'message must be a string' })
  @MinLength(2, { message: 'message must be at least 2 characters long' })
  message: string;

  @IsOptional()
  @IsString({ message: 'context must be a string' })
  context?: string;
}
