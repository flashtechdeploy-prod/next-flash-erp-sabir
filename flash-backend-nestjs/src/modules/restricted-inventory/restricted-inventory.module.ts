import { Module } from '@nestjs/common';
import { RestrictedInventoryService } from './restricted-inventory.service';
import { RestrictedInventoryController } from './restricted-inventory.controller';

@Module({
  providers: [RestrictedInventoryService],
  controllers: [RestrictedInventoryController],
  exports: [RestrictedInventoryService],
})
export class RestrictedInventoryModule {}
