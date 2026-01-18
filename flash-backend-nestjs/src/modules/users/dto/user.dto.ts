import {
  IsEmail,
  IsString,
  IsOptional,
  MinLength,
  IsBoolean,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'password123', minLength: 6 })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiPropertyOptional({ example: 'John Doe' })
  @IsString()
  @IsOptional()
  full_name?: string;

  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  @IsOptional()
  is_superuser?: boolean;
}

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'user@example.com' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ example: 'newpassword123', minLength: 6 })
  @IsString()
  @MinLength(6)
  @IsOptional()
  password?: string;

  @ApiPropertyOptional({ example: 'Jane Doe' })
  @IsString()
  @IsOptional()
  full_name?: string;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  is_active?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  is_superuser?: boolean;
}

export class LoginDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  password: string;
}

export class AdminUserCreateDto extends CreateUserDto {
  @ApiPropertyOptional({ type: [Number], description: 'Array of role IDs' })
  @IsOptional()
  role_ids?: number[];
}

export class AdminUserUpdateDto extends UpdateUserDto {
  @ApiPropertyOptional({ type: [Number], description: 'Array of role IDs' })
  @IsOptional()
  role_ids?: number[];
}

export class TokenResponseDto {
  @ApiProperty()
  access_token: string;

  @ApiProperty({ default: 'bearer' })
  token_type: string;
}

export class UserResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  email: string;

  @ApiProperty()
  full_name: string;

  @ApiProperty()
  is_superuser: boolean;

  @ApiProperty()
  is_active: boolean;

  @ApiProperty()
  created_at: Date;

  @ApiProperty()
  updated_at: Date;
}
