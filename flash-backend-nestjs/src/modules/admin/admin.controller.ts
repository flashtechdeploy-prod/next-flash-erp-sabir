import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import {
  CreateRoleDto,
  UpdateRoleDto,
  CreatePermissionDto,
} from './dto/admin.dto';
import { AdminUserCreateDto, AdminUserUpdateDto } from '../users/dto/user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SuperUserGuard } from '../auth/guards/superuser.guard';

@ApiTags('Admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, SuperUserGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // Permissions
  @Get('permissions')
  @ApiOperation({ summary: 'List all permissions' })
  async listPermissions() {
    return this.adminService.listPermissions();
  }

  @Post('permissions')
  @ApiOperation({ summary: 'Create a new permission' })
  @HttpCode(HttpStatus.CREATED)
  async createPermission(@Body() createDto: CreatePermissionDto) {
    return this.adminService.createPermission(createDto);
  }

  // Roles
  @Get('roles')
  @ApiOperation({ summary: 'List all roles' })
  async listRoles() {
    return this.adminService.listRoles();
  }

  @Post('roles')
  @ApiOperation({ summary: 'Create a new role' })
  @HttpCode(HttpStatus.CREATED)
  async createRole(@Body() createDto: CreateRoleDto) {
    return this.adminService.createRole(createDto);
  }

  @Put('roles/:role_id')
  @ApiOperation({ summary: 'Update a role' })
  async updateRole(
    @Param('role_id', ParseIntPipe) roleId: number,
    @Body() updateDto: UpdateRoleDto,
  ) {
    return this.adminService.updateRole(roleId, updateDto);
  }

  @Delete('roles/:role_id')
  @ApiOperation({ summary: 'Delete a role' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteRole(@Param('role_id', ParseIntPipe) roleId: number) {
    await this.adminService.deleteRole(roleId);
  }

  // Users
  @Get('users')
  @ApiOperation({ summary: 'List all users' })
  async listUsers() {
    return this.adminService.listUsers();
  }

  @Post('users')
  @ApiOperation({ summary: 'Create a new user with roles' })
  @HttpCode(HttpStatus.CREATED)
  async createUser(@Body() createDto: AdminUserCreateDto) {
    const user = await this.adminService.createUser(createDto);
    const { password: _password, ...result } = user;
    return result;
  }

  @Put('users/:user_id')
  @ApiOperation({ summary: 'Update a user' })
  async updateUser(
    @Param('user_id', ParseIntPipe) userId: number,
    @Body() updateDto: AdminUserUpdateDto,
  ) {
    const user = await this.adminService.updateUser(userId, updateDto);
    const { password: _password, ...result } = user;
    return result;
  }

  @Delete('users/:user_id')
  @ApiOperation({ summary: 'Delete a user' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteUser(@Param('user_id', ParseIntPipe) userId: number) {
    await this.adminService.deleteUser(userId);
  }
}
