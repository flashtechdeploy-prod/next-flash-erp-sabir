import { Module } from '@nestjs/common';
import { FinanceService } from './finance.service';
import { FinanceController, ExpensesController } from './finance.controller';

@Module({
  providers: [FinanceService],
  controllers: [FinanceController, ExpensesController],
  exports: [FinanceService],
})
export class FinanceModule {}
