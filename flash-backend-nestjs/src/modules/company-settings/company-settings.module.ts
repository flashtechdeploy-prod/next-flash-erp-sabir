import { Module } from '@nestjs/common';
import { CompanySettingsController } from './company-settings.controller';
import { CompanySettingsService } from './company-settings.service';
import { CloudStorageService } from 'src/common/storage/cloud-storage.service';

@Module({
  controllers: [CompanySettingsController],
  providers: [CompanySettingsService, CloudStorageService],
  exports: [CompanySettingsService],
})
export class CompanySettingsModule {}
