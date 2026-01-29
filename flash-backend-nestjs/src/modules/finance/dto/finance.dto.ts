import { IsString, IsNumber, IsOptional, IsEnum, IsArray, ValidateNested, IsDateString, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class FinanceAccountDto {
  @ApiProperty() @IsString() name: string;
  @ApiProperty() @IsString() code: string;
  @ApiProperty() @IsString() account_type: string;
  @ApiPropertyOptional() @IsNumber() @IsOptional() parent_id?: number;
  @ApiPropertyOptional() @IsBoolean() @IsOptional() is_system?: boolean;
  @ApiPropertyOptional() @IsBoolean() @IsOptional() is_active?: boolean;
}

export class JournalLineDto {
  @ApiProperty() @IsNumber() account_id: number;
  @ApiPropertyOptional() @IsString() @IsOptional() description?: string;
  @ApiProperty() @IsNumber() debit: number;
  @ApiProperty() @IsNumber() credit: number;
}

export class CreateJournalEntryDto {
  @ApiPropertyOptional() @IsDateString() @IsOptional() entry_date?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() memo?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() entry_type?: string;
  @ApiProperty() @IsNumber() amount: number;
  @ApiPropertyOptional() @IsString() @IsOptional() reference?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() category?: string;
  
  @ApiProperty({ type: [JournalLineDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => JournalLineDto)
  lines: JournalLineDto[];
}

export class CreateExpenseDto {
  @ApiProperty() @IsDateString() expense_date: string;
  @ApiProperty() @IsString() category: string;
  @ApiProperty() @IsString() description: string;
  @ApiProperty() @IsNumber() amount: number;
  @ApiPropertyOptional() @IsString() @IsOptional() vendor?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() payment_method?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() reference_no?: string;
}
