import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CloudStorageService } from './cloud-storage.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [CloudStorageService],
  exports: [CloudStorageService],
})
export class StorageModule {}
