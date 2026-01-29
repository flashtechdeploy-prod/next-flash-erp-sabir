import { IsString, IsOptional, IsIn, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateLeavePeriodDto {
  @ApiProperty({ description: 'Employee ID' })
  @IsString()
  employee_id: string;

  @ApiProperty({ description: 'Start date in YYYY-MM-DD format' })
  @IsDateString()
  from_date: string;

  @ApiProperty({ description: 'End date in YYYY-MM-DD format' })
  @IsDateString()
  to_date: string;

  @ApiProperty({ 
    description: 'Type of leave',
    enum: ['sick', 'casual', 'annual', 'unpaid', 'emergency', 'maternity', 'paternity', 'bereavement']
  })
  @IsString()
  @IsIn(['sick', 'casual', 'annual', 'unpaid', 'emergency', 'maternity', 'paternity', 'bereavement'])
  leave_type: string;

  @ApiPropertyOptional({ description: 'Reason for leave' })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({ 
    description: 'Status of the leave request',
    enum: ['pending', 'approved', 'rejected', 'cancelled'],
    default: 'approved'
  })
  @IsOptional()
  @IsString()
  @IsIn(['pending', 'approved', 'rejected', 'cancelled'])
  status?: string;
}

export class UpdateLeavePeriodDto {
  @ApiPropertyOptional({ description: 'Employee ID' })
  @IsOptional()
  @IsString()
  employee_id?: string;

  @ApiPropertyOptional({ description: 'Start date in YYYY-MM-DD format' })
  @IsOptional()
  @IsDateString()
  from_date?: string;

  @ApiPropertyOptional({ description: 'End date in YYYY-MM-DD format' })
  @IsOptional()
  @IsDateString()
  to_date?: string;

  @ApiPropertyOptional({ 
    description: 'Type of leave',
    enum: ['sick', 'casual', 'annual', 'unpaid', 'emergency', 'maternity', 'paternity', 'bereavement']
  })
  @IsOptional()
  @IsString()
  @IsIn(['sick', 'casual', 'annual', 'unpaid', 'emergency', 'maternity', 'paternity', 'bereavement'])
  leave_type?: string;

  @ApiPropertyOptional({ description: 'Reason for leave' })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({ 
    description: 'Status of the leave request',
    enum: ['pending', 'approved', 'rejected', 'cancelled']
  })
  @IsOptional()
  @IsString()
  @IsIn(['pending', 'approved', 'rejected', 'cancelled'])
  status?: string;
}

export class QueryLeavePeriodDto {
  @ApiPropertyOptional({ description: 'Filter by Employee ID' })
  @IsOptional()
  @IsString()
  employee_id?: string;

  @ApiPropertyOptional({ description: 'Filter by leave type' })
  @IsOptional()
  @IsString()
  leave_type?: string;

  @ApiPropertyOptional({ description: 'Filter by status' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: 'Filter leaves active on this date (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  active_on?: string;

  @ApiPropertyOptional({ description: 'Filter leaves starting from this date (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  from_date?: string;

  @ApiPropertyOptional({ description: 'Filter leaves ending before this date (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  to_date?: string;

  @ApiPropertyOptional({ description: 'Page number for pagination', default: 1 })
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ description: 'Number of records per page', default: 50 })
  @IsOptional()
  limit?: number;
}
