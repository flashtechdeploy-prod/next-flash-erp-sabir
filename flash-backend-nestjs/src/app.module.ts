import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';

// Database
import { DrizzleModule } from './db/drizzle.module';

// Storage
import { StorageModule } from './common/storage/storage.module';

// Core modules
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { AdminModule } from './modules/admin/admin.module';

// Business modules
import { EmployeesModule } from './modules/employees/employees.module';
import { EmployeesInactiveModule } from './modules/employees-inactive/employees-inactive.module';
import { VehiclesModule } from './modules/vehicles/vehicles.module';
import { VehicleAssignmentsModule } from './modules/vehicle-assignments/vehicle-assignments.module';
import { VehicleMaintenanceModule } from './modules/vehicle-maintenance/vehicle-maintenance.module';
import { FuelEntriesModule } from './modules/fuel-entries/fuel-entries.module';
import { AttendanceModule } from './modules/attendance/attendance.module';
import { LeavePeriodsModule } from './modules/leave-periods/leave-periods.module';
import { PayrollModule } from './modules/payroll/payroll.module';
import { FinanceModule } from './modules/finance/finance.module';
import { AdvancesModule } from './modules/advances/advances.module';
import { ClientManagementModule } from './modules/client-management/client-management.module';
import { GeneralInventoryModule } from './modules/general-inventory/general-inventory.module';
import { RestrictedInventoryModule } from './modules/restricted-inventory/restricted-inventory.module';
import { UploadsModule } from './modules/uploads/uploads.module';
import { CompanySettingsModule } from './modules/company-settings/company-settings.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      // Note: .env file only used in local development
      // In production, env vars come from the platform (Coolify, etc.)
    }),



    DrizzleModule,

    // Storage
    StorageModule,

    // Core modules
    AuthModule,
    UsersModule,
    AdminModule,

    // Business modules
    EmployeesModule,
    EmployeesInactiveModule,
    VehiclesModule,
    VehicleAssignmentsModule,
    VehicleMaintenanceModule,
    FuelEntriesModule,
    AttendanceModule,
    LeavePeriodsModule,
    PayrollModule,
    FinanceModule,
    AdvancesModule,
    ClientManagementModule,
    GeneralInventoryModule,
    RestrictedInventoryModule,
    RestrictedInventoryModule,
    UploadsModule,
    CompanySettingsModule,
  ],
})
export class AppModule {}
