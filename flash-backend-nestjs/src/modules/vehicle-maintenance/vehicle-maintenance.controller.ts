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
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { VehicleMaintenanceService } from './vehicle-maintenance.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Vehicle Maintenance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('vehicle-maintenance')
export class VehicleMaintenanceController {
  constructor(private readonly service: VehicleMaintenanceService) {}

  @Get()
  @ApiOperation({ summary: 'List maintenance records' })
  async findAll(@Query() query: any) {
    return this.service.findAll(query);
  }

  @Post()
  @ApiOperation({ summary: 'Create maintenance record' })
  async create(@Body() dto: any) {
    return this.service.create(dto);
  }

  @Get(':record_id')
  @ApiOperation({ summary: 'Get maintenance record' })
  async findOne(@Param('record_id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Put(':record_id')
  @ApiOperation({ summary: 'Update maintenance record' })
  async update(@Param('record_id', ParseIntPipe) id: number, @Body() dto: any) {
    return this.service.update(id, dto);
  }

  @Delete(':record_id')
  @ApiOperation({ summary: 'Delete maintenance record' })
  async remove(@Param('record_id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
