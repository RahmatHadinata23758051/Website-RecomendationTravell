import {
  IsString,
  IsOptional,
  IsEnum,
  IsIn,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PlaceSubmissionStatus, PlaceSubmissionSource } from '@prisma/client';

export const SUBMISSION_SORT_FIELDS = [
  'submittedAt',
  'updatedAt',
  'name',
  'cityRegency',
  'status',
] as const;

export type SubmissionSortField = (typeof SUBMISSION_SORT_FIELDS)[number];

export class QuerySubmissionsDto {
  @ApiPropertyOptional({ description: 'Filter by submission status', enum: PlaceSubmissionStatus })
  @IsOptional()
  @IsEnum(PlaceSubmissionStatus)
  status?: PlaceSubmissionStatus;

  @ApiPropertyOptional({ description: 'Filter by city/regency' })
  @IsOptional()
  @IsString()
  cityRegency?: string;

  @ApiPropertyOptional({ description: 'Filter by source', enum: PlaceSubmissionSource })
  @IsOptional()
  @IsEnum(PlaceSubmissionSource)
  source?: PlaceSubmissionSource;

  @ApiPropertyOptional({ description: 'Page number (1-indexed)', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', default: 20, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Sort by field',
    enum: SUBMISSION_SORT_FIELDS,
    default: 'submittedAt',
  })
  @IsOptional()
  @IsIn(SUBMISSION_SORT_FIELDS)
  sortBy?: SubmissionSortField = 'submittedAt';

  @ApiPropertyOptional({ description: 'Sort order', enum: ['asc', 'desc'] })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}

export class MySubmissionsDto {
  @ApiPropertyOptional({ description: 'Filter by status', enum: PlaceSubmissionStatus })
  @IsOptional()
  @IsEnum(PlaceSubmissionStatus)
  status?: PlaceSubmissionStatus;

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}