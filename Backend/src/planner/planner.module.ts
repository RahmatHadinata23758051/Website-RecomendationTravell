import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { PlannerService } from './planner.service';
import { PlannerController } from './planner.controller';

@Module({
  imports: [HttpModule],
  controllers: [PlannerController],
  providers: [PlannerService],
  exports: [PlannerService],
})
export class PlannerModule {}
