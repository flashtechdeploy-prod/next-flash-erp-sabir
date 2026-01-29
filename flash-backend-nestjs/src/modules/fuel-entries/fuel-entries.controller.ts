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
import { FuelEntriesService } from './fuel-entries.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Fuel Entries')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('fuel-entries')
export class FuelEntriesController {
  constructor(private readonly service: FuelEntriesService) {}

  @Get()
  @ApiOperation({ summary: 'List fuel entries' })
  async findAll(@Query() query: any) {
    return this.service.findAll(query);
  }

  @Post()
  @ApiOperation({ summary: 'Create fuel entry' })
  async create(@Body() dto: any) {
    return this.service.create(dto);
  }

  @Get('summary')
  @ApiOperation({ summary: 'Get fuel mileage summary' })
  async getSummary(@Query() query: any) {
    return this.service.getSummary(query);
  }

  @Get(':entry_id')
  @ApiOperation({ summary: 'Get fuel entry' })
  async findOne(@Param('entry_id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Put(':entry_id')
  @ApiOperation({ summary: 'Update fuel entry' })
  async update(@Param('entry_id', ParseIntPipe) id: number, @Body() dto: any) {
    return this.service.update(id, dto);
  }

  @Delete(':entry_id')
  @ApiOperation({ summary: 'Delete fuel entry' })
  async remove(@Param('entry_id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
