import { Module } from '@nestjs/common';
import { PlacesSubmissionController } from './places-submission.controller';
import { PlacesSubmissionService } from './places-submission.service';

@Module({
  controllers: [PlacesSubmissionController],
  providers: [PlacesSubmissionService],
  exports: [PlacesSubmissionService],
})
export class PlacesSubmissionModule {}
