import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ReviewsService } from './reviews.service';
import { ReviewsController } from './reviews.controller';

import { ActivityModule } from '../activity/activity.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [HttpModule, ActivityModule, AuthModule],
  controllers: [ReviewsController],
  providers: [ReviewsService],
  exports: [ReviewsService],
})
export class ReviewsModule {}
