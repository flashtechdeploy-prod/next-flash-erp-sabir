import {
    Body,
    Controller,
    Get,
    HttpException,
    HttpStatus,
    Param,
    Post,
    Put,
    Query,
    UploadedFile,
    UseGuards,
    UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
    ApiBearerAuth,
    ApiBody,
    ApiOperation,
    ApiQuery,
    ApiResponse,
    ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from 'src/modules/auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/auth.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BulkUpsertAttendanceDto, MarkSelfAttendanceDto } from './attendance.dto';
import { AttendanceService } from './attendance.service';

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

  @Post('mark-self')
  @UseInterceptors(FileInterceptor('picture'))
  @ApiOperation({ summary: 'Mark attendance for self (employee)' })
  @ApiBody({ type: MarkSelfAttendanceDto })
  @ApiResponse({ status: 200, description: 'Attendance marked successfully' })
  async markSelf(
    @CurrentUser() user: JwtPayload,
    @Body() body: any, // Use any because multipart body comes as strings
    @UploadedFile() file?: Express.Multer.File,
  ) {
    console.log('--- Received mark-self request ---');
    console.log('User Context:', JSON.stringify(user));
    console.log('File received:', file ? `${file.originalname} (${file.size} bytes)` : 'NONE');

    if (user.type !== 'employee') {
      throw new HttpException('Only employees can mark their own attendance', HttpStatus.FORBIDDEN);
    }
    
    // Convert string fields from multipart back to correct types if needed
    const type = body.type || 'check_in'; // default to check_in if not provided
    const record: any = {
      status: body.status || 'present',
      note: body.note,
      leave_type: body.leave_type,
    };

    // Use the employee ID from the JWT payload
    const employeeId = user.sub;
    
    // Pass everything to the service which now handles all mapping and timestamps authoritatively
    return this.service.markSelf(employeeId, '', body, file, type);
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

  @Get('my-status')
  @ApiOperation({ summary: "Get current employee's attendance status for today" })
  @ApiResponse({ status: 200, description: "Returns today's attendance record or null" })
  async getMyStatus(@CurrentUser() user: JwtPayload) {
    // Get date in Pakistan timezone (UTC+5)
    const date = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Karachi' }).format(new Date());
    const employeeId = user.sub;
    return this.service.getEmployeeStatus(employeeId, date);
  }

  @Get('my-stats')
  @ApiOperation({ summary: "Get current employee's attendance statistics for the current month" })
  @ApiResponse({ status: 200, description: 'Returns attendance counts by status' })
  async getMyStats(@CurrentUser() user: JwtPayload) {
    const employeeId = user.sub;
    return this.service.getEmployeeStats(employeeId);
  }

  @Get('my-history')
  @ApiOperation({ summary: "Get current employee's attendance history" })
  @ApiResponse({ status: 200, description: 'Returns last 30 attendance records' })
  async getMyHistory(@CurrentUser() user: JwtPayload) {
    const employeeId = user.sub;
    return this.service.getEmployeeHistory(employeeId);
  }

  @Get('full-day-sheet')
  @ApiOperation({ summary: 'Get full attendance sheet (employee join) for a date' })
  @ApiResponse({ status: 200, description: 'Returns all active employees merged with attendance' })
  async getFullDaySheet(@Query('date') date: string) {
    return this.service.getFullDaySheet(date);
  }
}
