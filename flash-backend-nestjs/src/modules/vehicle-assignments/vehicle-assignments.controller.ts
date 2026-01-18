import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { VehicleAssignmentsService } from './vehicle-assignments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Vehicle Assignments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('vehicle-assignments')
export class VehicleAssignmentsController {
  constructor(private readonly service: VehicleAssignmentsService) {}

  @Get()
  @ApiOperation({ summary: 'List vehicle assignments' })
  @ApiQuery({ name: 'vehicle_id', required: false })
  @ApiQuery({ name: 'from_date', required: false })
  @ApiQuery({ name: 'to_date', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async findAll(
    @Query('vehicle_id') vehicle_id?: string,
    @Query('from_date') from_date?: string,
    @Query('to_date') to_date?: string,
    @Query('status') status?: string,
    @Query('limit') limit?: number,
  ) {
    return this.service.findAll({
      vehicle_id,
      from_date,
      to_date,
      status,
      limit,
    });
  }

  @Post()
  @ApiOperation({ summary: 'Create vehicle assignment' })
  async create(@Body() createDto: any) {
    return this.service.create(createDto);
  }

  @Get('analytics')
  @ApiOperation({ summary: 'Get assignment analytics' })
  async getAnalytics(
    @Query('period') period?: string,
    @Query('day') day?: string,
    @Query('month') month?: string,
    @Query('year') year?: number,
    @Query('vehicle_id') vehicle_id?: string,
  ) {
    return this.service.getAnalytics({ period, day, month, year, vehicle_id });
  }

  @Get('efficiency')
  @ApiOperation({ summary: 'Get assignment efficiency' })
  async getEfficiency(@Query() query: any) {
    return this.service.getEfficiency(query);
  }

  @Get(':assignment_id')
  @ApiOperation({ summary: 'Get assignment by ID' })
  async findOne(@Param('assignment_id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Put(':assignment_id')
  @ApiOperation({ summary: 'Update assignment' })
  async update(
    @Param('assignment_id', ParseIntPipe) id: number,
    @Body() updateDto: any,
  ) {
    return this.service.update(id, updateDto);
  }

  @Delete(':assignment_id')
  @ApiOperation({ summary: 'Delete assignment' })
  async remove(@Param('assignment_id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
