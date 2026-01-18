import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
  ApiResponse,
  ApiBody,
} from '@nestjs/swagger';
import { PayrollService } from './payroll.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Payroll')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('payroll')
export class PayrollController {
  constructor(private readonly service: PayrollService) {}

  @Get('payment-status')
  @ApiOperation({ summary: 'Get payment status for a specific employee and month' })
  @ApiQuery({ name: 'month', required: true, description: 'Month in YYYY-MM format' })
  @ApiQuery({ name: 'employee_id', required: true, description: 'Employee ID' })
  @ApiResponse({ status: 200, description: 'Returns payment status' })
  async getPaymentStatus(
    @Query('month') month: string,
    @Query('employee_id') employee_id: string,
  ) {
    return this.service.getPaymentStatus(month, employee_id);
  }

  @Get('payment-statuses')
  @ApiOperation({ summary: 'Get all payment statuses for a month' })
  @ApiQuery({ name: 'month', required: true, description: 'Month in YYYY-MM format' })
  @ApiResponse({ status: 200, description: 'Returns all payment statuses for the month' })
  async getAllPaymentStatuses(@Query('month') month: string) {
    return this.service.getAllPaymentStatuses(month);
  }

  @Put('payment-status')
  @ApiOperation({ summary: 'Upsert payment status for an employee' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        month: { type: 'string', description: 'Month in YYYY-MM format' },
        employee_id: { type: 'string', description: 'Employee ID' },
        status: { type: 'string', enum: ['paid', 'unpaid'], description: 'Payment status' },
      },
      required: ['month', 'employee_id', 'status'],
    },
  })
  @ApiResponse({ status: 200, description: 'Returns updated payment status' })
  async upsertPaymentStatus(
    @Body() dto: { month: string; employee_id: string; status: string },
  ) {
    return this.service.upsertPaymentStatus(dto);
  }

  @Put('payment-status/bulk')
  @ApiOperation({ summary: 'Bulk update payment status for multiple employees' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        month: { type: 'string', description: 'Month in YYYY-MM format' },
        employee_ids: { type: 'array', items: { type: 'string' }, description: 'Array of employee IDs' },
        status: { type: 'string', enum: ['paid', 'unpaid'], description: 'Payment status' },
      },
      required: ['month', 'employee_ids', 'status'],
    },
  })
  @ApiResponse({ status: 200, description: 'Returns bulk update result' })
  async bulkUpdatePaymentStatus(
    @Body() dto: { month: string; employee_ids: string[]; status: string },
  ) {
    return this.service.bulkUpdatePaymentStatus(dto);
  }

  @Get('report')
  @ApiOperation({ summary: 'Get payroll report for a month' })
  @ApiQuery({ name: 'month', required: true, description: 'Month in YYYY-MM format' })
  @ApiResponse({ status: 200, description: 'Returns payroll report' })
  async getReport(@Query('month') month: string) {
    return this.service.getReport(month);
  }

  @Get('range-report')
  @ApiOperation({ summary: 'Get payroll range report' })
  @ApiQuery({ name: 'from_date', required: true, description: 'Start date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'to_date', required: true, description: 'End date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'month', required: false, description: 'Month filter (YYYY-MM)' })
  @ApiResponse({ status: 200, description: 'Returns payroll range report' })
  async getRangeReport(
    @Query('from_date') from_date: string,
    @Query('to_date') to_date: string,
    @Query('month') month?: string,
  ) {
    return this.service.getRangeReport(from_date, to_date, month);
  }

  @Get('sheet-entries')
  @ApiOperation({ summary: 'List payroll sheet entries for a date range' })
  @ApiQuery({ name: 'from_date', required: true, description: 'Start date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'to_date', required: true, description: 'End date (YYYY-MM-DD)' })
  @ApiResponse({ status: 200, description: 'Returns payroll sheet entries' })
  async listSheetEntries(
    @Query('from_date') from_date: string,
    @Query('to_date') to_date: string,
  ) {
    return this.service.listSheetEntries(from_date, to_date);
  }

  @Put('sheet-entries')
  @ApiOperation({ summary: 'Bulk upsert payroll sheet entries' })
  @ApiResponse({ status: 200, description: 'Returns upsert result' })
  async bulkUpsertSheetEntries(
    @Body() dto: { from_date: string; to_date: string; entries: Array<Record<string, unknown>> },
  ) {
    return this.service.bulkUpsertSheetEntries(dto as any);
  }

  @Post('export-pdf')
  @ApiOperation({ summary: 'Export payroll as PDF' })
  @ApiResponse({ status: 200, description: 'Returns PDF export result' })
  async exportPdf(
    @Query() query: Record<string, unknown>,
    @Body() body: Record<string, unknown>,
  ) {
    return this.service.exportPdf(query, body);
  }
}
