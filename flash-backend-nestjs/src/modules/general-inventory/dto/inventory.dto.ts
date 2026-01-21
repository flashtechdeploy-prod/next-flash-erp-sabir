import { IsString, IsNumber, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GeneralInventoryItemDto {
  @ApiPropertyOptional() @IsString() @IsOptional() item_code?: string;
  @ApiProperty() @IsString() name: string;
  @ApiProperty() @IsString() category: string;
  @ApiProperty() @IsString() unit_name: string;
  @ApiPropertyOptional() @IsString() @IsOptional() description?: string;
  @ApiPropertyOptional() @IsNumber() @IsOptional() quantity_on_hand?: number;
  @ApiPropertyOptional() @IsNumber() @IsOptional() min_quantity?: number;
  @ApiPropertyOptional() @IsString() @IsOptional() image_url?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() status?: string;
}

export class RestrictedInventoryItemDto extends GeneralInventoryItemDto {
  @ApiPropertyOptional() @IsBoolean() @IsOptional() is_serial_tracked?: boolean;
  @ApiPropertyOptional() @IsNumber() @IsOptional() serial_total?: number;
  @ApiPropertyOptional() @IsNumber() @IsOptional() serial_in_stock?: number;
  @ApiPropertyOptional() @IsString() @IsOptional() make_model?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() caliber?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() storage_location?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() license_number?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() weapon_region?: string;
  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  requires_maintenance?: boolean;
  @ApiPropertyOptional() @IsBoolean() @IsOptional() requires_cleaning?: boolean;
}

export class InventoryTransactionDto {
  @ApiProperty() @IsString() employee_id: string;
  @ApiProperty() @IsNumber() quantity: number;
  @ApiPropertyOptional() @IsString() @IsOptional() notes?: string;
}
