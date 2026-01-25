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

  @ApiPropertyOptional({ description: 'Selfie or picture URL' })
  @IsOptional()
  @IsString()
  picture?: string;

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

  @ApiPropertyOptional({ 
    description: 'Type of leave (required if status is leave)',
    enum: ['sick', 'casual', 'annual', 'unpaid', 'emergency']
  })
  @IsOptional()
  @IsString()
  leave_type?: string;
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
