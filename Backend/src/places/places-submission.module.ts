import { Module } from '@nestjs/common';
import { PlacesSubmissionController } from './places-submission.controller';
import { AdminSubmissionsController } from './admin-submissions.controller';
import { PlacesSubmissionService } from './places-submission.service';
import { SubmissionDedupService } from './submission-dedup.service';
import { SpatialModule } from '../spatial/spatial.module';

@Module({
  imports: [SpatialModule],
  controllers: [PlacesSubmissionController, AdminSubmissionsController],
  providers: [PlacesSubmissionService, SubmissionDedupService],
  exports: [PlacesSubmissionService, SubmissionDedupService],
})
export class PlacesSubmissionModule {}
