import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { PlacesSubmissionService } from './places-submission.service';
import { QuerySubmissionsDto } from './dto/query-submissions.dto';
import { ModerateSubmissionDto } from './dto/moderate-submission.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Admin - Place Submissions')
@Controller('api/v1/admin/places/submissions')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiBearerAuth('bearer')
export class AdminSubmissionsController {
  constructor(private readonly submissionService: PlacesSubmissionService) {}

  @Get()
  @ApiOperation({ summary: 'Get submission moderation queue with filtering and pagination' })
  @ApiResponse({ status: 200, description: 'Moderation queue items' })
  async getModerationQueue(@Query() query: QuerySubmissionsDto) {
    return this.submissionService.getModerationQueue(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get full submission details for administrative review' })
  @ApiParam({ name: 'id', description: 'Submission UUID' })
  @ApiResponse({ status: 200, description: 'Full submission details with audit info' })
  @ApiResponse({ status: 404, description: 'Submission not found' })
  async getSubmissionDetail(@Param('id') id: string) {
    return this.submissionService.getSubmissionDetailForAdmin(id);
  }

  @Patch(':id/review')
  @ApiOperation({ summary: 'Review and update place submission status (approve, reject, etc.)' })
  @ApiParam({ name: 'id', description: 'Submission UUID' })
  @ApiResponse({ status: 200, description: 'Submission updated successfully' })
  @ApiResponse({ status: 400, description: 'Missing required rejection reason or duplicate id' })
  @ApiResponse({ status: 404, description: 'Submission not found' })
  async reviewSubmission(
    @Param('id') id: string,
    @Req() req: any,
    @Body() dto: ModerateSubmissionDto,
  ) {
    return this.submissionService.moderateSubmission(
      id,
      req.user.id,
      dto.action,
      dto.moderationNotes,
      dto.rejectionReason,
      dto.duplicateOfId,
    );
  }
}
