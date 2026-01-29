import { Module } from '@nestjs/common';
import { FuelEntriesService } from './fuel-entries.service';
import { FuelEntriesController } from './fuel-entries.controller';

@Module({
  providers: [FuelEntriesService],
  controllers: [FuelEntriesController],
  exports: [FuelEntriesService],
})
export class FuelEntriesModule {}
