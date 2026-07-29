import {
  IsInt,
  IsNotEmpty,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateReviewDto {
  @IsNotEmpty({ message: 'canonicalId is required' })
  @IsString({ message: 'canonicalId must be a string' })
  canonicalId: string;

  @IsNotEmpty({ message: 'rating is required' })
  @IsInt({ message: 'rating must be an integer' })
  @Min(1, { message: 'rating must be between 1 and 5' })
  @Max(5, { message: 'rating must be between 1 and 5' })
  @Type(() => Number)
  rating: number;

  @IsNotEmpty({ message: 'reviewText is required' })
  @IsString({ message: 'reviewText must be a string' })
  @MinLength(5, { message: 'reviewText must be at least 5 characters long' })
  reviewText: string;
}
