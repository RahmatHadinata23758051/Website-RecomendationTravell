import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class GeneratePlannerDto {
  @IsNotEmpty({ message: 'city_or_regency is required' })
  @IsString({ message: 'city_or_regency must be a string' })
  city_or_regency: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  categories?: string[];

  @IsOptional()
  @IsString()
  primary_category?: string;

  @IsOptional()
  @IsString()
  budget_level?: string;

  @IsOptional()
  @IsString()
  pace_style?: string;

  @IsNotEmpty({ message: 'duration_days is required' })
  @IsNumber({}, { message: 'duration_days must be a number' })
  @Min(1, { message: 'duration_days must be at least 1 day' })
  @Max(7, { message: 'duration_days cannot exceed 7 days' })
  @Type(() => Number)
  duration_days: number;
}

export class SwapSlotDto {
  @IsNotEmpty({ message: 'city_or_regency is required' })
  @IsString()
  city_or_regency: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  exclude_ids?: string[];
}
