import { Module } from '@nestjs/common';
import { EmployeesInactiveController } from './employees-inactive.controller';

@Module({
  controllers: [EmployeesInactiveController],
})
export class EmployeesInactiveModule {}
