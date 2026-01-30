import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { CreateUserDto, LoginDto } from '../users/dto/user.dto';
import { UsersService } from '../users/users.service';

export interface JwtPayload {
  sub: any;
  email?: string;
  fss_no?: string;
  is_superuser?: boolean;
  type?: 'user' | 'employee';
}

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async register(createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  async login(
    loginDto: LoginDto,
  ): Promise<{ access_token: string; token_type: string }> {
    const user = await this.usersService.findByEmail(loginDto.email);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!(user as any).is_active) {
      throw new UnauthorizedException('Account is deactivated');
    }

    const isPasswordValid = await this.usersService.validatePassword(
      user,
      loginDto.password,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      is_superuser: (user as any).is_admin ?? false,
    };

    return {
      access_token: this.jwtService.sign(payload),
      token_type: 'bearer',
    };
  }

  async validateUser(payload: JwtPayload) {
    if (payload.type === 'employee') {
      const [employee] = await this.usersService.findEmployeeById(payload.sub);
      
      if (!employee) {
        console.warn(`Auth Failed: Employee not found for ID ${payload.sub}`);
        throw new UnauthorizedException();
      }

      // Check status case-insensitively
      const status = employee.status ? employee.status.toLowerCase() : '';
      if (status !== 'active') {
        console.warn(`Auth Failed: Employee ${payload.sub} status is '${employee.status}'`);
        throw new UnauthorizedException('Employee account is not active');
      }

      return { ...employee, sub: employee.employee_id, type: 'employee' };
    }

    const user = await this.usersService.findOne(payload.sub);
    if (!user || !(user as any).is_active) {
      throw new UnauthorizedException();
    }
    return { ...user, sub: (user as any).id, type: 'user', is_superuser: (user as any).is_admin };
  }

  async getCurrentUser(payload: JwtPayload) {
    if (payload.type === 'employee') {
      const [employee] = await this.usersService.findEmployeeById(payload.sub);
      if (!employee) throw new UnauthorizedException('Employee not found');
      return employee;
    }
    return this.usersService.findOne(payload.sub);
  }

  async getMyPermissions(userId: number) {
    return this.usersService.getUserPermissions(userId);
  }

  async getMyRoles(userId: number) {
    return this.usersService.getUserRoles(userId);
  }
}
