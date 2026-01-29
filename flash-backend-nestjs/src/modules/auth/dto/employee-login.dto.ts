// employee-login.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class EmployeeLoginDto {
  @ApiProperty({ description: 'Employee FSS number' })
  @IsString()
  @IsNotEmpty()
  fss_no: string;

  @ApiProperty({ description: 'Employee password' })
  @IsString()
  @IsNotEmpty()
  password: string;
}
