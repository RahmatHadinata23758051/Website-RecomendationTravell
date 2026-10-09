import { IsOptional, IsString, IsNumber, Min, Max, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export class GetDestinationsDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  city_or_regency?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  min_price?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  max_price?: number;

  @IsOptional()
  @IsIn(['all', 'free', 'paid'])
  price_status?: 'all' | 'free' | 'paid';

  @IsOptional()
  @IsString()
  operational_status?: string;

  @IsOptional()
  @IsIn(['rating', 'reviews_count', 'name', 'price_min_idr', 'popular'])
  sort_by?: 'rating' | 'reviews_count' | 'name' | 'price_min_idr' | 'popular' = 'popular';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sort_order?: 'asc' | 'desc' = 'desc';

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 20;
}
