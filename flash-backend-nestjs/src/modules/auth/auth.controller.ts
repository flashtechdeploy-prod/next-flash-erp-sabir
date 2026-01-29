
import { Body, Controller, Get, HttpException, HttpStatus, Inject, Logger, Post, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse } from '@nestjs/swagger';
import * as bcrypt from 'bcryptjs';
import { eq ,or, sql} from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE } from '../../db/drizzle.module';
import { employees } from '../../db/schema/employees';
import { LoginDto } from '../users/dto/user.dto';
import { AuthService, JwtPayload } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { EmployeeLoginDto } from './dto/employee-login.dto';
import { SetPasswordDto } from './dto/set-password.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';


@Controller('auth')
export class AuthController {
  private logger = new Logger(AuthController.name);

  constructor(
    @Inject(DRIZZLE) private db: NodePgDatabase<any>,
    private readonly jwtService: JwtService,
    private readonly authService: AuthService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiBearerAuth()
  async getMe(@CurrentUser() user: JwtPayload) {
    return this.authService.getCurrentUser(user);
  }

  @Post('login')
  @ApiOperation({ summary: 'Admin/Standard user login' })
  @ApiBody({ type: LoginDto })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('list-fss-numbers')
  async listFssNumbers() {
    const employeesList = await this.db.select({ fss_no: employees.fss_no, employee_id: employees.employee_id }).from(employees);
    return employeesList;
  }

  @Post('employee-login')
  @ApiBody({ type: EmployeeLoginDto })
  async employeeLogin(@Body() body: EmployeeLoginDto) {
    this.logger.log('Received login request body: ' + JSON.stringify({ ...body, password: '***' }));

    const { fss_no, password } = body || {};
  if (!fss_no) {
    this.logger.warn('Missing FSS number: ' + JSON.stringify(body));
    throw new HttpException('Missing FSS number', HttpStatus.BAD_REQUEST);
  }

  console

  // Fetch employee from DB

const cleanedInput = fss_no.replace(/-/g, ''); // Input without dashes
const numericInput = fss_no.replace(/^0+/, ''); // Input without leading zeros

const [employee] = await this.db
  .select()
  .from(employees)
  .where(
    or(
      // Match FSS No: exactly, or without leading zeros
      eq(employees.fss_no, fss_no),
      eq(sql`LTRIM(${employees.fss_no}, '0')`, numericInput),
      
      // Match CNIC: exactly, without dashes, or with cleaning-both
      eq(employees.cnic, fss_no),
      eq(employees.cnic, cleanedInput),
      eq(sql`REPLACE(${employees.cnic}, '-', '')`, cleanedInput),
      
      // Also check cnic_no field just in case
      eq(employees.cnic_no, fss_no),
      eq(sql`REPLACE(${employees.cnic_no}, '-', '')`, cleanedInput)
    )
  );


  // Check if employee exists
  if (!employee) {
    this.logger.warn(`No employee found for FSS number: ${fss_no}`);
    throw new HttpException('Invalid FSS number', HttpStatus.UNAUTHORIZED);
  }

    // Verify password
    if (employee.password) {
      const isPasswordValid = await bcrypt.compare(password, employee.password);
      if (!isPasswordValid) {
        this.logger.warn(`Invalid password for FSS number: ${fss_no}`);
        throw new HttpException('Invalid credentials', HttpStatus.UNAUTHORIZED);
      }
    } else {
      // If no password set, we might want to prevent login or allow default
      // For now, let's assume password is required if we are moving to password-based login
      this.logger.warn(`No password set for FSS number: ${fss_no}`);
      throw new HttpException('No password set for this account', HttpStatus.UNAUTHORIZED);
    }

    // Log fetched employee
    this.logger.log('Employee fetched: ' + JSON.stringify({ ...employee, password: '***' }));

    // Create JWT payload
    const payload = { 
      sub: employee.employee_id, 
      fss_no: employee.fss_no,
      type: 'employee'
    };
  const token = this.jwtService.sign(payload);

  this.logger.log(`Login successful for employee_id: ${employee.employee_id}`);
  return { 
    token, 
    employee_id: employee.employee_id, 
    fss_no: employee.fss_no,
    full_name: employee.full_name || employee.first_name || 'Employee'
  };
}

  @UseGuards(JwtAuthGuard)
  @Post('set-password')
  @ApiOperation({ summary: 'Set or update employee password' })
  @ApiBearerAuth()
  @ApiBody({ type: SetPasswordDto })
  @ApiResponse({ status: 200, description: 'Password set successfully' })
  async setPassword(@Body() body: SetPasswordDto, @CurrentUser() user: any) {
    const { fss_no, password } = body;

    if (!user.is_superuser && user.fss_no !== fss_no && user.cnic !== fss_no)  {
      throw new HttpException('You do not have permission to set this password', HttpStatus.FORBIDDEN);
    }

   
    const [employee] = await this.db
      .select({ id: employees.id, employee_id: employees.employee_id })
      .from(employees)
      .where(or(eq(employees.fss_no, fss_no), eq(employees.cnic, fss_no)));

    if (!employee) {
      throw new HttpException('Employee not found', HttpStatus.NOT_FOUND);
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update database
    await this.db
      .update(employees)
      .set({ 
        password: hashedPassword,
        updated_at: new Date()
      })
      .where(eq(employees.id, employee.id));

    this.logger.log(`Password set successfully for FSS: ${fss_no}`);
    return { success: true, message: 'Password set successfully' };
  }


}

