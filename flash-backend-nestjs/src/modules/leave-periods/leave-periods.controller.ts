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
import { 
  ApiTags, 
  ApiOperation, 
  ApiBearerAuth, 
  ApiQuery, 
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { LeavePeriodsService } from './leave-periods.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateLeavePeriodDto, UpdateLeavePeriodDto, QueryLeavePeriodDto } from './leave-periods.dto';

@ApiTags('Leave Periods')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('leave-periods')
export class LeavePeriodsController {
  constructor(private readonly service: LeavePeriodsService) {}

  @Get()
  @ApiOperation({ summary: 'List all leave periods with filtering and pagination' })
  @ApiResponse({ status: 200, description: 'Returns paginated list of leave periods' })
  async findAll(@Query() query: QueryLeavePeriodDto) {
    return this.service.findAll(query);
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Get leave statistics' })
  @ApiQuery({ name: 'from_date', required: false, description: 'Start date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'to_date', required: false, description: 'End date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'employee_id', required: false, description: 'Filter by employee' })
  @ApiResponse({ status: 200, description: 'Returns leave statistics' })
  async getStatistics(
    @Query('from_date') from_date?: string,
    @Query('to_date') to_date?: string,
    @Query('employee_id') employee_id?: string,
  ) {
    return this.service.getStatistics({ from_date, to_date, employee_id });
  }

  @Get('alerts')
  @ApiOperation({ summary: 'Get leave period alerts (ending soon)' })
  @ApiQuery({ name: 'as_of', required: false, description: 'Reference date (YYYY-MM-DD), defaults to today' })
  @ApiQuery({ name: 'employee_id', required: false, description: 'Filter by employee' })
  @ApiQuery({ name: 'threshold_days', required: false, description: 'Days threshold for alerts (default: 3)' })
  @ApiResponse({ status: 200, description: 'Returns list of leaves ending soon' })
  async getAlerts(
    @Query('as_of') as_of?: string,
    @Query('employee_id') employee_id?: string,
    @Query('threshold_days') threshold_days?: number,
  ) {
    return this.service.getAlerts({ as_of, employee_id, threshold_days });
  }

  @Get('employee/:employee_id/balance')
  @ApiOperation({ summary: 'Get employee leave balance for a year' })
  @ApiParam({ name: 'employee_id', description: 'Employee ID' })
  @ApiQuery({ name: 'year', required: false, description: 'Year (defaults to current year)' })
  @ApiResponse({ status: 200, description: 'Returns employee leave balance' })
  async getEmployeeBalance(
    @Param('employee_id') employee_id: string,
    @Query('year') year?: number,
  ) {
    return this.service.getEmployeeLeaveBalance(employee_id, year);
  }

  @Get('on-leave')
  @ApiOperation({ summary: 'Get employees on leave for a specific date' })
  @ApiQuery({ name: 'date', required: true, description: 'Date in YYYY-MM-DD format' })
  @ApiResponse({ status: 200, description: 'Returns list of employees on leave' })
  async getEmployeesOnLeave(@Query('date') date: string) {
    return this.service.getEmployeesOnLeave(date);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single leave period by ID' })
  @ApiParam({ name: 'id', description: 'Leave period ID' })
  @ApiResponse({ status: 200, description: 'Returns the leave period' })
  @ApiResponse({ status: 404, description: 'Leave period not found' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new leave period' })
  @ApiResponse({ status: 201, description: 'Leave period created successfully' })
  async create(@Body() dto: CreateLeavePeriodDto) {
    return this.service.create(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a leave period' })
  @ApiParam({ name: 'id', description: 'Leave period ID' })
  @ApiResponse({ status: 200, description: 'Leave period updated successfully' })
  @ApiResponse({ status: 404, description: 'Leave period not found' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateLeavePeriodDto,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a leave period' })
  @ApiParam({ name: 'id', description: 'Leave period ID' })
  @ApiResponse({ status: 200, description: 'Leave period deleted successfully' })
  @ApiResponse({ status: 404, description: 'Leave period not found' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
