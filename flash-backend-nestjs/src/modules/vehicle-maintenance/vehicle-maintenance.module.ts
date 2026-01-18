import { Module } from '@nestjs/common';
import { VehicleMaintenanceService } from './vehicle-maintenance.service';
import { VehicleMaintenanceController } from './vehicle-maintenance.controller';

@Module({
  providers: [VehicleMaintenanceService],
  controllers: [VehicleMaintenanceController],
  exports: [VehicleMaintenanceService],
})
export class VehicleMaintenanceModule {}
