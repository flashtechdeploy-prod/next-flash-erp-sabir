import { Module } from '@nestjs/common';
import { GeneralInventoryService } from './general-inventory.service';
import { GeneralInventoryController } from './general-inventory.controller';

@Module({
  providers: [GeneralInventoryService],
  controllers: [GeneralInventoryController],
  exports: [GeneralInventoryService],
})
export class GeneralInventoryModule {}
