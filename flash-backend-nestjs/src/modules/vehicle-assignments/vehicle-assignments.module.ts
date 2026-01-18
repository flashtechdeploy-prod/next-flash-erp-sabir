import { Module } from '@nestjs/common';
import { VehicleAssignmentsService } from './vehicle-assignments.service';
import { VehicleAssignmentsController } from './vehicle-assignments.controller';

@Module({
  providers: [VehicleAssignmentsService],
  controllers: [VehicleAssignmentsController],
  exports: [VehicleAssignmentsService],
})
export class VehicleAssignmentsModule {}
