import { Module } from '@nestjs/common';
import { LeavePeriodsService } from './leave-periods.service';
import { LeavePeriodsController } from './leave-periods.controller';

@Module({
  providers: [LeavePeriodsService],
  controllers: [LeavePeriodsController],
  exports: [LeavePeriodsService],
})
export class LeavePeriodsModule {}
