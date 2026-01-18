import {
  Injectable,
  NotFoundException,
  ConflictException,
  Inject,
} from '@nestjs/common';
import { DRIZZLE } from '../../db/drizzle.module';
import * as schema from '../../db/schema';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import { UsersService } from '../users/users.service';
import {
  CreateRoleDto,
  UpdateRoleDto,
  CreatePermissionDto,
} from './dto/admin.dto';
import { AdminUserCreateDto, AdminUserUpdateDto } from '../users/dto/user.dto';

@Injectable()
export class AdminService {
  constructor(
    @Inject(DRIZZLE)
    private db: NodePgDatabase<typeof schema>,
    private usersService: UsersService,
  ) {}

  // Permissions
  async listPermissions() {
    return this.db.select().from(schema.permissions);
  }

  async createPermission(createDto: CreatePermissionDto) {
    const [existing] = await this.db
      .select()
      .from(schema.permissions)
      .where(eq(schema.permissions.name, createDto.name));
    if (existing) {
      throw new ConflictException('Permission already exists');
    }
    const [result] = await this.db
      .insert(schema.permissions)
      .values(createDto)
      .returning();
    return result;
  }

  // Roles
  async listRoles() {
    return this.db.select().from(schema.roles);
  }

  async createRole(createDto: CreateRoleDto) {
    const [existing] = await this.db
      .select()
      .from(schema.roles)
      .where(eq(schema.roles.name, createDto.name));
    if (existing) {
      throw new ConflictException('Role already exists');
    }

    const { permission_ids, ...roleData } = createDto;
    const [role] = await this.db
      .insert(schema.roles)
      .values(roleData)
      .returning();

    if (permission_ids && permission_ids.length > 0) {
      for (const pId of permission_ids) {
        await this.db.insert(schema.roles_to_permissions).values({
          role_id: role.id,
          permission_id: pId,
        });
      }
    }

    return role;
  }

  async updateRole(roleId: number, updateDto: UpdateRoleDto) {
    const [role] = await this.db
      .select()
      .from(schema.roles)
      .where(eq(schema.roles.id, roleId));
    if (!role) {
      throw new NotFoundException(`Role with ID ${roleId} not found`);
    }

    const { permission_ids, ...roleData } = updateDto;
    await this.db
      .update(schema.roles)
      .set(roleData)
      .where(eq(schema.roles.id, roleId));

    if (permission_ids !== undefined) {
      await this.db
        .delete(schema.roles_to_permissions)
        .where(eq(schema.roles_to_permissions.role_id, roleId));
      for (const pId of permission_ids) {
        await this.db.insert(schema.roles_to_permissions).values({
          role_id: roleId,
          permission_id: pId,
        });
      }
    }

    const [updatedRole] = await this.db
      .select()
      .from(schema.roles)
      .where(eq(schema.roles.id, roleId));
    return updatedRole;
  }

  async deleteRole(roleId: number) {
    const [role] = await this.db
      .select()
      .from(schema.roles)
      .where(eq(schema.roles.id, roleId));
    if (!role) {
      throw new NotFoundException(`Role with ID ${roleId} not found`);
    }
    await this.db.delete(schema.roles).where(eq(schema.roles.id, roleId));
  }

  // Users (admin operations)
  async listUsers() {
    return this.usersService.findAll();
  }

  async createUser(createDto: AdminUserCreateDto) {
    return this.usersService.createAdmin(createDto);
  }

  async updateUser(userId: number, updateDto: AdminUserUpdateDto) {
    return this.usersService.updateAdmin(userId, updateDto);
  }

  async deleteUser(userId: number) {
    return this.usersService.remove(userId);
  }
}
