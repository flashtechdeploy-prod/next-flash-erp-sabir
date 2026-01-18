import { IsString, IsOptional, IsArray, IsInt } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePermissionDto {
  @ApiProperty({ example: 'employees:read' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'Can view employees' })
  @IsString()
  @IsOptional()
  description?: string;
}

export class CreateRoleDto {
  @ApiProperty({ example: 'HR Manager' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'Can manage all HR operations' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    type: [Number],
    description: 'Array of permission IDs',
  })
  @IsArray()
  @IsInt({ each: true })
  @IsOptional()
  permission_ids?: number[];
}

export class UpdateRoleDto {
  @ApiPropertyOptional({ example: 'Senior HR Manager' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    example: 'Can manage all HR operations with elevated access',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    type: [Number],
    description: 'Array of permission IDs',
  })
  @IsArray()
  @IsInt({ each: true })
  @IsOptional()
  permission_ids?: number[];
}
