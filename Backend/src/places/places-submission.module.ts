import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { PlacesSubmissionController } from './places-submission.controller';
import { AdminSubmissionsController } from './admin-submissions.controller';
import { PlacesSubmissionService } from './places-submission.service';
import { SubmissionDedupService } from './submission-dedup.service';
import { SpatialModule } from '../spatial/spatial.module';
import { ActivityModule } from '../activity/activity.module';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [SpatialModule, ActivityModule, RedisModule, HttpModule],
  controllers: [PlacesSubmissionController, AdminSubmissionsController],
  providers: [PlacesSubmissionService, SubmissionDedupService],
  exports: [PlacesSubmissionService, SubmissionDedupService],
})
export class PlacesSubmissionModule {}
