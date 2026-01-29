import {
  Injectable,
  NotFoundException,
  ConflictException,
  Inject,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { DRIZZLE } from '../../db/drizzle.module';
import * as schema from '../../db/schema';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import {
  CreateUserDto,
  UpdateUserDto,
  AdminUserCreateDto,
  AdminUserUpdateDto,
} from './dto/user.dto';

@Injectable()
export class UsersService {
  constructor(
    @Inject(DRIZZLE)
    private db: NodePgDatabase<typeof schema>,
  ) {}

  async findAll(skip = 0, limit = 100) {
    const result = await this.db
      .select()
      .from(schema.users)
      .offset(skip)
      .limit(limit);
    return result.map(u => ({ ...u, is_superuser: u.is_admin }));
  }

  async findOne(id: number) {
    const [user] = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, id));
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return { ...user, is_superuser: user.is_admin };
  }

  async findByEmail(email: string) {
    const [user] =
      (await this.db
        .select()
        .from(schema.users)
        .where(eq(schema.users.email, email))) || [];
    return user || null;
  }

  async create(createUserDto: CreateUserDto) {
    const existing = await this.findByEmail(createUserDto.email);
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
    const [id] = await this.db
      .insert(schema.users)
      .values({
        email: createUserDto.email,
        password: hashedPassword,
        full_name: createUserDto.full_name,
        is_admin: createUserDto.is_superuser ?? false,
      })
      .returning({ id: schema.users.id });

    return this.findOne(id.id);
  }

  async createAdmin(createUserDto: AdminUserCreateDto) {
    const existing = await this.findByEmail(createUserDto.email);
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
    const [id] = await this.db
      .insert(schema.users)
      .values({
        email: createUserDto.email,
        password: hashedPassword,
        full_name: createUserDto.full_name,
        is_active: true,
        is_admin: createUserDto.is_superuser ?? false,
      })
      .returning({ id: schema.users.id });

    if (createUserDto.role_ids && createUserDto.role_ids.length > 0) {
      for (const roleId of createUserDto.role_ids) {
        await this.db.insert(schema.users_to_roles).values({
          user_id: id.id,
          role_id: roleId,
        });
      }
    }

    return this.findOne(id.id);
  }

  async update(id: number, updateUserDto: UpdateUserDto) {
    await this.findOne(id);

    const values: any = {};
    if (updateUserDto.email) values.email = updateUserDto.email;
    if (updateUserDto.password)
      values.password = await bcrypt.hash(updateUserDto.password, 10);
    if (updateUserDto.full_name) values.full_name = updateUserDto.full_name;
    if (updateUserDto.is_active !== undefined)
      values.is_active = updateUserDto.is_active;
    if (updateUserDto.is_superuser !== undefined)
      values.is_admin = updateUserDto.is_superuser;

    await this.db
      .update(schema.users)
      .set(values)
      .where(eq(schema.users.id, id));
    return this.findOne(id);
  }

  async updateAdmin(id: number, updateUserDto: AdminUserUpdateDto) {
    await this.findOne(id);

    const { role_ids, ...rest } = updateUserDto;
    const values: any = {};
    if (rest.email) values.email = rest.email;
    if (rest.password) values.password = await bcrypt.hash(rest.password, 10);
    if (rest.full_name) values.full_name = rest.full_name;
    if (rest.is_active !== undefined) values.is_active = rest.is_active;
    if (rest.is_superuser !== undefined) values.is_admin = rest.is_superuser;

    await this.db
      .update(schema.users)
      .set(values)
      .where(eq(schema.users.id, id));

    if (role_ids !== undefined) {
      await this.db
        .delete(schema.users_to_roles)
        .where(eq(schema.users_to_roles.user_id, id));
      for (const roleId of role_ids) {
        await this.db.insert(schema.users_to_roles).values({
          user_id: id,
          role_id: roleId,
        });
      }
    }

    return this.findOne(id);
  }

  async remove(id: number) {
    await this.findOne(id);
    await this.db.delete(schema.users).where(eq(schema.users.id, id));
  }

  async validatePassword(user: any, password: string) {
    return bcrypt.compare(password, user.password);
  }

  async getUserPermissions(userId: number) {
    const user = await this.findOne(userId);
    const roles = await this.db
      .select({
        role_id: schema.users_to_roles.role_id,
      })
      .from(schema.users_to_roles)
      .where(eq(schema.users_to_roles.user_id, userId));

    const permissionsSet = new Set<string>();

    if ((user as any).is_admin) {
      const allPerms = await this.db.select().from(schema.permissions);
      allPerms.forEach((p) => permissionsSet.add(p.name));
    } else {
      for (const r of roles) {
        const rp = await this.db
          .select({
            name: schema.permissions.name,
          })
          .from(schema.roles_to_permissions)
          .innerJoin(
            schema.permissions,
            eq(
              schema.permissions.id,
              schema.roles_to_permissions.permission_id,
            ),
          )
          .where(eq(schema.roles_to_permissions.role_id, (r as any).role_id));

        rp.forEach((p) => permissionsSet.add(p.name));
      }
    }

    return Array.from(permissionsSet);
  }

  async getUserRoles(userId: number) {
    const roles = await this.db
      .select({
        name: schema.roles.name,
      })
      .from(schema.users_to_roles)
      .innerJoin(
        schema.roles,
        eq(schema.roles.id, schema.users_to_roles.role_id),
      )
      .where(eq(schema.users_to_roles.user_id, userId));

    return roles.map((r) => r.name);
  }

  async findEmployeeById(employeeId: string) {
    return this.db
      .select()
      .from(schema.employees)
      .where(eq(schema.employees.employee_id, employeeId));
  }
}
