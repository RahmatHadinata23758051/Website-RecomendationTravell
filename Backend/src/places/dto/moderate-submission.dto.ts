import { IsEnum, IsOptional, IsString, IsUUID, ValidateIf } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum ModerationAction {
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
  REQUEST_INFO = 'REQUEST_INFO',
  MARK_DUPLICATE = 'MARK_DUPLICATE',
}

export class ModerateSubmissionDto {
  @ApiProperty({ enum: ModerationAction })
  @IsEnum(ModerationAction)
  action: ModerationAction;

  @ApiPropertyOptional({ description: 'Internal note visible to moderators' })
  @IsOptional()
  @IsString()
  moderationNotes?: string;

  @ApiPropertyOptional({ description: 'Required when action is REJECT' })
  @ValidateIf((dto: ModerateSubmissionDto) => dto.action === ModerationAction.REJECT)
  @IsString()
  rejectionReason?: string;

  @ApiPropertyOptional({ description: 'Canonical/submission ID when action is MARK_DUPLICATE' })
  @ValidateIf((dto: ModerateSubmissionDto) => dto.action === ModerationAction.MARK_DUPLICATE)
  @IsUUID()
  duplicateOfId?: string;
}
