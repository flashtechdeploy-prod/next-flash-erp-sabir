import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AdvancesService } from './advances.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Accounts & Advances')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('accounts-advances')
export class AdvancesController {
  constructor(private readonly service: AdvancesService) {}

  @Get('advances')
  @ApiOperation({ summary: 'List employee advances' })
  async listAdvances(@Query() query: any) {
    return this.service.listAdvances(query);
  }

  @Post('advances')
  @ApiOperation({ summary: 'Create employee advance' })
  async createAdvance(@Body() dto: any) {
    return this.service.createAdvance(dto);
  }

  @Delete('advances/:id')
  @ApiOperation({ summary: 'Delete advance' })
  async deleteAdvance(@Param('id', ParseIntPipe) id: number) {
    return this.service.deleteAdvance(id);
  }

  @Get('deductions')
  @ApiOperation({ summary: 'List advance deductions' })
  async listDeductions(@Query() query: any) {
    return this.service.listDeductions(query);
  }

  @Put('deductions')
  @ApiOperation({ summary: 'Upsert advance deduction' })
  async upsertDeduction(@Body() dto: any) {
    return this.service.upsertDeduction(dto);
  }

  @Get('summary/:employee_db_id')
  @ApiOperation({ summary: 'Get advance summary for employee' })
  async getSummary(@Param('employee_db_id', ParseIntPipe) id: number) {
    return this.service.getSummary(id);
  }
}
