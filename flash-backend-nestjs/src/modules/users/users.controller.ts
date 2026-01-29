import {
  Controller,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SuperUserGuard } from '../auth/guards/superuser.guard';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, SuperUserGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'Get all users (superuser only)' })
  @ApiQuery({ name: 'skip', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async findAll(@Query('skip') skip?: number, @Query('limit') limit?: number) {
    return this.usersService.findAll(skip, limit);
  }

  @Get(':user_id')
  @ApiOperation({ summary: 'Get user by ID (superuser only)' })
  async findOne(@Param('user_id', ParseIntPipe) user_id: number) {
    return this.usersService.findOne(user_id);
  }

  @Put(':user_id')
  @ApiOperation({ summary: 'Update user (superuser only)' })
  async update(
    @Param('user_id', ParseIntPipe) user_id: number,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.usersService.update(user_id, updateUserDto);
  }

  @Delete(':user_id')
  @ApiOperation({ summary: 'Delete user (superuser only)' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('user_id', ParseIntPipe) user_id: number) {
    await this.usersService.remove(user_id);
  }
}
