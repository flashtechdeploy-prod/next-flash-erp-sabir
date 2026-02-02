import { IsString, IsNumber, IsOptional, IsEnum, IsInt } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateVehicleDto {
  @ApiProperty() @IsString() vehicle_id: string;
  @ApiProperty() @IsString() vehicle_type: string;
  @ApiProperty() @IsString() category: string;
  @ApiProperty() @IsString() make_model: string;
  @ApiProperty() @IsString() license_plate: string;
  @ApiPropertyOptional() @IsString() @IsOptional() chassis_number?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() asset_tag?: string;
  @ApiPropertyOptional() @IsInt() @IsOptional() year?: number;
  @ApiPropertyOptional() @IsString() @IsOptional() status?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() compliance?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() government_permit?: string;
  @ApiPropertyOptional() @IsNumber() @IsOptional() fuel_limit_monthly?: number;
  @ApiPropertyOptional() @IsString() @IsOptional() registration_date?: string;
}

export class UpdateVehicleDto {
  @ApiPropertyOptional() @IsString() @IsOptional() vehicle_type?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() category?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() make_model?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() license_plate?: string;
  @ApiPropertyOptional() @IsNumber() @IsOptional() fuel_limit_monthly?: number;
  @ApiPropertyOptional() @IsString() @IsOptional() chassis_number?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() asset_tag?: string;
  @ApiPropertyOptional() @IsInt() @IsOptional() year?: number;
  @ApiPropertyOptional() @IsString() @IsOptional() status?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() compliance?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() government_permit?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() registration_date?: string;
}
