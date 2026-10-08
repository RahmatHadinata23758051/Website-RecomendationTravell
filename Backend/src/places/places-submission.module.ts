import { Module } from '@nestjs/common';
import { PlacesSubmissionController } from './places-submission.controller';
import { PlacesSubmissionService } from './places-submission.service';
import { SubmissionDedupService } from './submission-dedup.service';
import { SpatialModule } from '../spatial/spatial.module';

@Module({
  imports: [SpatialModule],
  controllers: [PlacesSubmissionController],
  providers: [PlacesSubmissionService, SubmissionDedupService],
  exports: [PlacesSubmissionService, SubmissionDedupService],
})
export class PlacesSubmissionModule {}
