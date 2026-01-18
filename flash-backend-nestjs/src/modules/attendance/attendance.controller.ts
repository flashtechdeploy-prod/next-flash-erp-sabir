import {
  Controller,
  Get,
  Put,
  Body,
  Query,
  Param,
  UseGuards,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
  ApiBody,
  ApiResponse,
} from '@nestjs/swagger';
import { AttendanceService } from './attendance.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BulkUpsertAttendanceDto } from './attendance.dto';

@ApiTags('Attendance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('attendance')
export class AttendanceController {
  constructor(private readonly service: AttendanceService) {}

  @Get()
  @ApiOperation({ summary: 'List attendance for a date' })
  @ApiQuery({ name: 'date', required: true, description: 'Date in YYYY-MM-DD format' })
  @ApiResponse({ status: 200, description: 'Returns attendance records for the specified date' })
  async findByDate(@Query('date') date: string) {
    if (!date) {
      throw new HttpException('Date parameter is required', HttpStatus.BAD_REQUEST);
    }
    
    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      throw new HttpException('Invalid date format. Use YYYY-MM-DD', HttpStatus.BAD_REQUEST);
    }
    
    return this.service.findByDate(date);
  }

  @Put()
  @ApiOperation({ summary: 'Bulk upsert attendance records' })
  @ApiBody({ type: BulkUpsertAttendanceDto })
  @ApiResponse({ status: 200, description: 'Returns the number of records upserted' })
  async bulkUpsert(@Body() body: BulkUpsertAttendanceDto) {
    // Ensure leave_type is set for leave status
    for (const record of body.records) {
      if (record.status === 'leave' && !record.leave_type) {
        record.leave_type = 'casual'; // Default to casual leave
      }
    }
    
    return this.service.bulkUpsert(body.date, body.records);
  }

  @Get('range')
  @ApiOperation({ summary: 'List attendance for date range' })
  @ApiQuery({ name: 'from_date', required: true, description: 'Start date in YYYY-MM-DD format' })
  @ApiQuery({ name: 'to_date', required: true, description: 'End date in YYYY-MM-DD format' })
  @ApiResponse({ status: 200, description: 'Returns attendance records for the date range' })
  async findByRange(
    @Query('from_date') from_date: string,
    @Query('to_date') to_date: string,
  ) {
    if (!from_date || !to_date) {
      throw new HttpException('Both from_date and to_date are required', HttpStatus.BAD_REQUEST);
    }
    return this.service.findByRange(from_date, to_date);
  }

  @Get('employee/:employee_id')
  @ApiOperation({ summary: 'Get employee attendance for date range' })
  @ApiQuery({ name: 'from_date', required: true, description: 'Start date in YYYY-MM-DD format' })
  @ApiQuery({ name: 'to_date', required: true, description: 'End date in YYYY-MM-DD format' })
  @ApiResponse({ status: 200, description: 'Returns attendance records for the employee' })
  async findByEmployee(
    @Param('employee_id') employee_id: string,
    @Query('from_date') from_date: string,
    @Query('to_date') to_date: string,
  ) {
    if (!from_date || !to_date) {
      throw new HttpException('Both from_date and to_date are required', HttpStatus.BAD_REQUEST);
    }
    return this.service.findByEmployee(employee_id, from_date, to_date);
  }

  @Get('summary')
  @ApiOperation({ summary: 'Get attendance summary for date range' })
  @ApiQuery({ name: 'from_date', required: true, description: 'Start date in YYYY-MM-DD format' })
  @ApiQuery({ name: 'to_date', required: true, description: 'End date in YYYY-MM-DD format' })
  @ApiQuery({ name: 'department', required: false, description: 'Filter by department' })
  @ApiQuery({ name: 'designation', required: false, description: 'Filter by designation' })
  @ApiResponse({ status: 200, description: 'Returns attendance summary with counts by status' })
  async getSummary(
    @Query('from_date') from_date: string,
    @Query('to_date') to_date: string,
    @Query('department') department?: string,
    @Query('designation') designation?: string,
  ) {
    if (!from_date || !to_date) {
      throw new HttpException('Both from_date and to_date are required', HttpStatus.BAD_REQUEST);
    }
    return this.service.getSummary(from_date, to_date, {
      department,
      designation,
    });
  }

  @Get('with-employees')
  @ApiOperation({ summary: 'Get attendance with employee details for a date' })
  @ApiQuery({ name: 'date', required: true, description: 'Date in YYYY-MM-DD format' })
  @ApiResponse({ status: 200, description: 'Returns attendance records with employee details' })
  async getWithEmployees(@Query('date') date: string) {
    if (!date) {
      throw new HttpException('Date parameter is required', HttpStatus.BAD_REQUEST);
    }
    return this.service.getAttendanceWithEmployees(date);
  }
}
