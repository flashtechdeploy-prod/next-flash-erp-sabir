import { IsString, IsArray, IsOptional, IsNumber, ValidateNested, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AttendanceRecordDto {
  @ApiProperty({ description: 'Employee ID' })
  @IsString()
  employee_id: string;

  @ApiProperty({ 
    description: 'Attendance status',
    enum: ['present', 'late', 'absent', 'leave']
  })
  @IsString()
  @IsIn(['present', 'late', 'absent', 'leave'])
  status: string;

  @ApiPropertyOptional({ description: 'Note or remarks' })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiPropertyOptional({ description: 'GPS location (lat,lng JSON)' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({ description: 'GPS location captured at selfie time (lat,lng JSON)' })
  @IsOptional()
  @IsString()
  initial_location?: string;

  @ApiPropertyOptional({ description: 'Selfie or picture URL' })
  @IsOptional()
  @IsString()
  picture?: string;

  @ApiPropertyOptional({ description: 'Check in time' })
  @IsOptional()
  @IsString()
  check_in?: string;

  @ApiPropertyOptional({ description: 'Check in date' })
  @IsOptional()
  @IsString()
  check_in_date?: string;

  @ApiPropertyOptional({ description: 'Overtime minutes worked' })
  @IsOptional()
  @IsNumber()
  overtime_minutes?: number;

  @ApiPropertyOptional({ description: 'Overtime rate per hour' })
  @IsOptional()
  @IsNumber()
  overtime_rate?: number;

  @ApiPropertyOptional({ description: 'Minutes late' })
  @IsOptional()
  @IsNumber()
  late_minutes?: number;

  @ApiPropertyOptional({ description: 'Deduction for being late' })
  @IsOptional()
  @IsNumber()
  late_deduction?: number;

  @ApiPropertyOptional({ 
    description: 'Type of leave (required if status is leave)',
    enum: ['sick', 'casual', 'annual', 'unpaid', 'emergency']
  })
  @IsOptional()
  @IsString()
  leave_type?: string;

  @ApiPropertyOptional({ description: 'Fine amount in rupees' })
  @IsOptional()
  @IsNumber()
  fine_amount?: number;

  @ApiPropertyOptional({ description: 'Check out time' })
  @IsOptional()
  @IsString()
  check_out?: string;

  @ApiPropertyOptional({ description: 'Overtime start time' })
  @IsOptional()
  @IsString()
  overtime_in?: string;

  @ApiPropertyOptional({ description: 'Overtime end time' })
  @IsOptional()
  @IsString()
  overtime_out?: string;

  @ApiPropertyOptional({ description: 'Check out picture URL' })
  @IsOptional()
  @IsString()
  check_out_picture?: string;

  @ApiPropertyOptional({ description: 'Overtime in picture URL' })
  @IsOptional()
  @IsString()
  overtime_in_picture?: string;

  @ApiPropertyOptional({ description: 'Overtime out picture URL' })
  @IsOptional()
  @IsString()
  overtime_out_picture?: string;

  @ApiPropertyOptional({ description: 'Check out location (lat,lng JSON)' })
  @IsOptional()
  @IsString()
  check_out_location?: string;

  @ApiPropertyOptional({ description: 'Check out date' })
  @IsOptional()
  @IsString()
  check_out_date?: string;

  @ApiPropertyOptional({ description: 'Overtime in location (lat,lng JSON)' })
  @IsOptional()
  @IsString()
  overtime_in_location?: string;

  @ApiPropertyOptional({ description: 'Overtime in date' })
  @IsOptional()
  @IsString()
  overtime_in_date?: string;

  @ApiPropertyOptional({ description: 'Overtime out location (lat,lng JSON)' })
  @IsOptional()
  @IsString()
  overtime_out_location?: string;

  @ApiPropertyOptional({ description: 'Overtime out date' })
  @IsOptional()
  @IsString()
  overtime_out_date?: string;
}

export class MarkSelfAttendanceDto {
  @ApiProperty({ 
    description: 'Attendance status',
    enum: ['present', 'late', 'absent', 'leave']
  })
  @IsString()
  @IsIn(['present', 'late', 'absent', 'leave'])
  status: string;

  @ApiPropertyOptional({ description: 'Note or remarks' })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiPropertyOptional({ description: 'GPS location (lat,lng JSON)' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({ description: 'GPS location captured at selfie time (lat,lng JSON)' })
  @IsOptional()
  @IsString()
  initial_location?: string;

  @ApiPropertyOptional({ 
    description: 'Type of leave (required if status is leave)',
    enum: ['sick', 'casual', 'annual', 'unpaid', 'emergency']
  })
  @IsOptional()
  @IsString()
  leave_type?: string;

  @ApiPropertyOptional({ description: 'Check in time' })
  @IsOptional()
  @IsString()
  check_in?: string;

  @ApiPropertyOptional({ description: 'Check in date' })
  @IsOptional()
  @IsString()
  check_in_date?: string;

  @ApiPropertyOptional({ description: 'Check out time' })
  @IsOptional()
  @IsString()
  check_out?: string;

  @ApiPropertyOptional({ description: 'Overtime start time' })
  @IsOptional()
  @IsString()
  overtime_in?: string;

  @ApiPropertyOptional({ description: 'Overtime end time' })
  @IsOptional()
  @IsString()
  overtime_out?: string;

  @ApiPropertyOptional({ description: 'Check out picture URL' })
  @IsOptional()
  @IsString()
  check_out_picture?: string;

  @ApiPropertyOptional({ description: 'Overtime in picture URL' })
  @IsOptional()
  @IsString()
  overtime_in_picture?: string;

  @ApiPropertyOptional({ description: 'Overtime out picture URL' })
  @IsOptional()
  @IsString()
  overtime_out_picture?: string;

  @ApiPropertyOptional({ description: 'Check out location (lat,lng JSON)' })
  @IsOptional()
  @IsString()
  check_out_location?: string;

  @ApiPropertyOptional({ description: 'Check out date' })
  @IsOptional()
  @IsString()
  check_out_date?: string;

  @ApiPropertyOptional({ description: 'Overtime in location (lat,lng JSON)' })
  @IsOptional()
  @IsString()
  overtime_in_location?: string;

  @ApiPropertyOptional({ description: 'Overtime in date' })
  @IsOptional()
  @IsString()
  overtime_in_date?: string;

  @ApiPropertyOptional({ description: 'Overtime out location (lat,lng JSON)' })
  @IsOptional()
  @IsString()
  overtime_out_location?: string;

  @ApiPropertyOptional({ description: 'Overtime out date' })
  @IsOptional()
  @IsString()
  overtime_out_date?: string;
}

export class BulkUpsertAttendanceDto {
  @ApiProperty({ description: 'Date in YYYY-MM-DD format' })
  @IsString()
  date: string;

  @ApiProperty({ 
    description: 'Array of attendance records',
    type: [AttendanceRecordDto]
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttendanceRecordDto)
  records: AttendanceRecordDto[];
}
