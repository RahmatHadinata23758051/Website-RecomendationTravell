import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  Ip,
  Headers,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { PlacesSubmissionService } from './places-submission.service';
import { SubmitPlaceDto } from './dto/submit-place.dto';
import { QuerySubmissionsDto, MySubmissionsDto } from './dto/query-submissions.dto';
import { JwtAuthGuard, OptionalJwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Throttle } from '@nestjs/throttler';

@ApiTags('Place Submissions')
@Controller('api/v1/places/submissions')
export class PlacesSubmissionController {
  constructor(private readonly submissionService: PlacesSubmissionService) {}

  @Post()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Submit a new place for catalog consideration' })
  @ApiResponse({ status: 201, description: 'Place submitted successfully' })
  @ApiResponse({ status: 400, description: 'Validation failed or outside Lampung bounds' })
  async submitPlace(
    @Req() req: any,
    @Body() dto: SubmitPlaceDto,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
    return this.submissionService.submitPlace(req.user.id, dto, ip, userAgent);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: "Get current user's submitted places" })
  @ApiResponse({ status: 200, description: 'List of submissions by caller' })
  async getMySubmissions(@Req() req: any, @Query() query: MySubmissionsDto) {
    return this.submissionService.getMySubmissions(req.user.id, query);
  }

  @Get(':id')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Get submission details by ID' })
  @ApiParam({ name: 'id', description: 'Submission UUID' })
  @ApiResponse({ status: 200, description: 'Submission detail' })
  @ApiResponse({ status: 403, description: 'Forbidden if not approved or not owner' })
  @ApiResponse({ status: 404, description: 'Submission not found' })
  async getSubmissionById(@Param('id') id: string, @Req() req: any) {
    const userId = req.user?.id;
    return this.submissionService.getSubmissionById(id, userId);
  }

  @Get()
  @ApiOperation({ summary: 'Browse approved public place submissions' })
  @ApiResponse({ status: 200, description: 'Paginated list of approved submissions' })
  async getPublicSubmissions(@Query() query: QuerySubmissionsDto) {
    return this.submissionService.getPublicSubmissions(query);
  }
}