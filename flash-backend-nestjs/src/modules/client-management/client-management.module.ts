import { Module } from '@nestjs/common';
import { ClientManagementService } from './client-management.service';
import { ClientManagementController } from './client-management.controller';
import { StorageModule } from '../../common/storage/storage.module';

@Module({
  imports: [StorageModule],
  providers: [ClientManagementService],
  controllers: [ClientManagementController],
  exports: [ClientManagementService],
})
export class ClientManagementModule {}
