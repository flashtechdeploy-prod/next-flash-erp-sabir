import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { CreateUserDto, LoginDto } from '../users/dto/user.dto';

export interface JwtPayload {
  sub: number;
  email: string;
  is_superuser: boolean;
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
    const user = await this.usersService.findOne(payload.sub);
    if (!user || !(user as any).is_active) {
      throw new UnauthorizedException();
    }
    return user;
  }

  async getCurrentUser(userId: number) {
    return this.usersService.findOne(userId);
  }

  async getMyPermissions(userId: number) {
    return this.usersService.getUserPermissions(userId);
  }

  async getMyRoles(userId: number) {
    return this.usersService.getUserRoles(userId);
  }
}
