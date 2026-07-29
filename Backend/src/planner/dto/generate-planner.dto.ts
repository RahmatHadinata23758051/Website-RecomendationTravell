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
  @IsNotEmpty({ message: 'title is required' })
  @IsString({ message: 'title must be a string' })
  title: string;

  @IsNotEmpty({ message: 'duration_days is required' })
  @IsNumber({}, { message: 'duration_days must be a number' })
  @Min(1, { message: 'duration_days must be at least 1 day' })
  @Max(14, { message: 'duration_days cannot exceed 14 days' })
  @Type(() => Number)
  duration_days: number;

  @IsOptional()
  @IsArray({ message: 'categories must be an array of strings' })
  @IsString({ each: true, message: 'each category must be a string' })
  categories?: string[];

  @IsOptional()
  @IsNumber({}, { message: 'budget_max_idr must be a number' })
  @Min(0)
  @Type(() => Number)
  budget_max_idr?: number;
}
