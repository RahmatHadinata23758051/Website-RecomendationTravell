import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { RedisModule } from './redis/redis.module';
import { DestinationsModule } from './destinations/destinations.module';
import { SpatialModule } from './spatial/spatial.module';
import { FavoritesModule } from './favorites/favorites.module';
import { PlannerModule } from './planner/planner.module';
import { ReviewsModule } from './reviews/reviews.module';
import { ChatbotModule } from './chatbot/chatbot.module';
import { ItinerariesModule } from './itineraries/itineraries.module';

import { ActivityModule } from './activity/activity.module';
import { PlacesSubmissionModule } from './places/places-submission.module';
import { HealthModule } from './health/health.module';
import { PerformanceInterceptor } from './common/interceptors/performance.interceptor';
import { EnvValidationService } from './common/config/env-validation.service';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { RedisService } from './redis/redis.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ThrottlerModule.forRootAsync({
      imports: [RedisModule],
      inject: [RedisService],
      useFactory: (redisService: RedisService) => ({
        throttlers: [{ ttl: 60000, limit: 60 }],
        storage: redisService,
      }),
    }),
    PrismaModule,
    AuthModule,
    RedisModule,
    DestinationsModule,
    SpatialModule,
    FavoritesModule,
    PlannerModule,
    ReviewsModule,
    ChatbotModule,
    ItinerariesModule,
    ActivityModule,
    PlacesSubmissionModule,
    HealthModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    EnvValidationService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: PerformanceInterceptor,
    },
  ],
})
export class AppModule {}
