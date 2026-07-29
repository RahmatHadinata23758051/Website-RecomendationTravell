import {
  IsOptional,
  IsString,
  IsArray,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export class GetRecommendationsDto {
  @IsOptional()
  @IsString({ message: 'category must be a string' })
  category?: string;

  @IsOptional()
  @IsString({ message: 'city_or_regency must be a string' })
  city_or_regency?: string;

  @IsOptional()
  @IsArray({ message: 'facilities must be an array of strings' })
  @IsString({ each: true, message: 'each facility must be a string' })
  facilities?: string[];

  @IsOptional()
  @IsNumber({}, { message: 'latitude must be a number' })
  @Min(-90)
  @Max(90)
  @Type(() => Number)
  latitude?: number;

  @IsOptional()
  @IsNumber({}, { message: 'longitude must be a number' })
  @Min(-180)
  @Max(180)
  @Type(() => Number)
  longitude?: number;

  @IsOptional()
  @IsNumber({}, { message: 'budget_max_idr must be a number' })
  @Min(0)
  @Type(() => Number)
  budget_max_idr?: number;

  @IsOptional()
  @IsNumber({}, { message: 'top_k must be a number' })
  @Min(1)
  @Max(50)
  @Type(() => Number)
  top_k?: number = 10;
}
