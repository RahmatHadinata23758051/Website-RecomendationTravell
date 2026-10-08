import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsArray,
  Min,
  Max,
  Length,
  Matches,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export const LAMPUNG_REGIONS = [
  'Kota Bandar Lampung',
  'Kota Metro',
  'Kabupaten Lampung Selatan',
  'Kabupaten Lampung Barat',
  'Kabupaten Lampung Tengah',
  'Kabupaten Lampung Timur',
  'Kabupaten Lampung Utara',
  'Kabupaten Mesuji',
  'Kabupaten Pesawaran',
  'Kabupaten Pesisir Barat',
  'Kabupaten Pringsewu',
  'Kabupaten Tanggamus',
  'Kabupaten Tulang Bawang',
  'Kabupaten Tulang Bawang Barat',
  'Kabupaten Way Kanan',
] as const;

export const TOURISM_CATEGORIES = [
  'beach',
  'waterfall',
  'park',
  'museum',
  'history',
  'culture',
  'religious',
  'nature',
  'recreation',
  'agrotourism',
  'camping',
  'mountain',
  'hill',
  'island',
  'lake',
  'river',
  'forest',
  'waterpark',
  'family',
  'education',
  'other',
] as const;

export class SubmitPlaceDto {
  @ApiProperty({ description: 'Name of the tourism spot', example: 'Pantai Gigi Hiu' })
  @IsString()
  @IsNotEmpty()
  @Length(2, 200)
  name: string;

  @ApiProperty({ description: 'Normalized category', enum: TOURISM_CATEGORIES, example: 'beach' })
  @IsString()
  @IsNotEmpty()
  @IsIn(TOURISM_CATEGORIES, {
    message: `category must be one of: ${TOURISM_CATEGORIES.join(', ')}`,
  })
  category: string;

  @ApiPropertyOptional({ description: 'Sub-tags or highlights', example: ['sunset', 'spot foto'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  categoryTags?: string[];

  @ApiProperty({ description: 'Physical street address', example: 'Pekon Kelumbayan, Tanggamus' })
  @IsString()
  @IsNotEmpty()
  @Length(5, 500)
  address: string;

  @ApiProperty({ description: 'City or regency name', enum: LAMPUNG_REGIONS, example: 'Kabupaten Tanggamus' })
  @IsString()
  @IsNotEmpty()
  @IsIn(LAMPUNG_REGIONS, {
    message: `cityRegency must be one of: ${LAMPUNG_REGIONS.join(', ')}`,
  })
  cityRegency: string;

  @ApiPropertyOptional({ description: 'Kecamatan (District)', example: 'Kelumbayan' })
  @IsOptional()
  @IsString()
  district?: string;

  @ApiPropertyOptional({ description: 'Desa/Kelurahan (Village)', example: 'Kiluan Negeri' })
  @IsOptional()
  @IsString()
  village?: string;

  @ApiProperty({ description: 'Latitude coordinate (Lampung bounding box -6.2 to -3.5)', example: -5.7533 })
  @Type(() => Number)
  @IsNumber()
  @Min(-6.2, { message: 'latitude is outside Lampung bounding box (min -6.2)' })
  @Max(-3.5, { message: 'latitude is outside Lampung bounding box (max -3.5)' })
  latitude: number;

  @ApiProperty({ description: 'Longitude coordinate (Lampung bounding box 103.5 to 106.0)', example: 105.1123 })
  @Type(() => Number)
  @IsNumber()
  @Min(103.5, { message: 'longitude is outside Lampung bounding box (min 103.5)' })
  @Max(106.0, { message: 'longitude is outside Lampung bounding box (max 106.0)' })
  longitude: number;

  @ApiPropertyOptional({ description: 'Indonesian contact phone number', example: '081234567890' })
  @IsOptional()
  @IsString()
  @Matches(/^(\+62|62|0)8[1-9][0-9]{6,10}$/, {
    message: 'phone must be a valid Indonesian mobile number',
  })
  phone?: string;

  @ApiPropertyOptional({ description: 'Official website URL' })
  @IsOptional()
  @IsString()
  website?: string;

  @ApiPropertyOptional({ description: 'Detailed destination description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Operating hours JSON mapping', example: { monday: '08:00-17:00' } })
  @IsOptional()
  openingHours?: Record<string, string>;

  @ApiPropertyOptional({ description: 'Minimum ticket price (IDR)', example: 15000 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  priceMin?: number;

  @ApiPropertyOptional({ description: 'Maximum ticket price (IDR)', example: 25000 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  priceMax?: number;

  @ApiPropertyOptional({ description: 'Currency unit', default: 'IDR' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ description: 'Amenities and facilities list', example: ['toilet', 'mushola', 'parkir'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  facilities?: string[];

  @ApiPropertyOptional({ description: 'Primary display photo URL' })
  @IsOptional()
  @IsString()
  primaryPhotoUrl?: string;

  @ApiPropertyOptional({ description: 'List of photo metadata' })
  @IsOptional()
  photos?: any;

  @ApiPropertyOptional({ description: 'Proof of business ownership for claim' })
  @IsOptional()
  ownershipProof?: any;
}
