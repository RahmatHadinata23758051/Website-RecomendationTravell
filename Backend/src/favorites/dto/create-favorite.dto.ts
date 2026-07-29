import { IsNotEmpty, IsString } from 'class-validator';

export class CreateFavoriteDto {
  @IsNotEmpty({ message: 'canonicalId is required' })
  @IsString({ message: 'canonicalId must be a string' })
  canonicalId: string;
}
