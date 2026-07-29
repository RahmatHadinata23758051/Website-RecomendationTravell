import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class GetNearbyDestinationsDto {
  @IsNotEmpty({ message: 'latitude is required' })
  @IsNumber({}, { message: 'latitude must be a number' })
  @Min(-90)
  @Max(90)
  @Type(() => Number)
  latitude: number;

  @IsNotEmpty({ message: 'longitude is required' })
  @IsNumber({}, { message: 'longitude must be a number' })
  @Min(-180)
  @Max(180)
  @Type(() => Number)
  longitude: number;

  @IsOptional()
  @IsNumber({}, { message: 'radius_km must be a number' })
  @Min(0.1)
  @Max(200)
  @Type(() => Number)
  radius_km?: number = 10;

  @IsOptional()
  @IsNumber({}, { message: 'top_k must be a number' })
  @Min(1)
  @Max(50)
  @Type(() => Number)
  top_k?: number = 10;

  @IsOptional()
  @IsString({ message: 'category must be a string' })
  category?: string;
}
