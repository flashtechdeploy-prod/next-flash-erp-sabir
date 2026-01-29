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
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { RestrictedInventoryService } from './restricted-inventory.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RestrictedInventoryItemDto } from '../general-inventory/dto/inventory.dto';

@ApiTags('Restricted Inventory')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('restricted-inventory')
export class RestrictedInventoryController {
  constructor(private readonly service: RestrictedInventoryService) {}

  @Get('items')
  async listItems() {
    return this.service.listItems();
  }

  @Post('items')
  async createItem(@Body() dto: RestrictedInventoryItemDto) {
    return this.service.createItem(dto);
  }

  @Get('items/:item_code')
  async getItem(@Param('item_code') item_code: string) {
    return this.service.getItem(item_code);
  }

  @Put('items/:item_code')
  async updateItem(
    @Param('item_code') item_code: string,
    @Body() dto: Partial<RestrictedInventoryItemDto>,
  ) {
    return this.service.updateItem(item_code, dto);
  }

  @Delete('items/:item_code')
  async deleteItem(@Param('item_code') item_code: string) {
    return this.service.deleteItem(item_code);
  }

  @Get('categories')
  async listCategories() {
    return this.service.listCategories();
  }

  @Post('categories')
  async createCategory(@Body() dto: { category: string }) {
    return this.service.createCategory(dto.category);
  }

  @Put('categories/:category')
  async updateCategory(
    @Param('category') category: string,
    @Body() dto: { newCategory: string },
  ) {
    return this.service.updateCategory(category, dto.newCategory);
  }

  @Delete('categories/:category')
  async deleteCategory(@Param('category') category: string) {
    return this.service.deleteCategory(category);
  }

  @Get('items/:item_code/serial-units')
  async listSerialUnits(@Param('item_code') item_code: string) {
    return this.service.listSerialUnits(item_code);
  }

  @Post('items/:item_code/serial-units')
  async createSerialUnit(
    @Param('item_code') item_code: string,
    @Body() dto: any,
  ) {
    return this.service.createSerialUnit(item_code, dto);
  }

  @Get('transactions')
  async listTransactions(@Query() query: any) {
    return this.service.listTransactions(query);
  }

  @Post('serial-units/:serial_unit_id/issue')
  async issueSerial(
    @Param('serial_unit_id') id: number,
    @Body('employee_id') employee_id: string,
  ) {
    return this.service.issueSerial(id, employee_id);
  }

  @Post('serial-units/:serial_unit_id/return')
  async returnSerial(@Param('serial_unit_id') id: number) {
    return this.service.returnSerial(id);
  }

  @Post('items/:item_code/issue')
  async issueItem(
    @Param('item_code') item_code: string,
    @Body() dto: any,
  ) {
    return this.service.issueItem(item_code, dto);
  }

  @Post('items/:item_code/return')
  async returnItem(
    @Param('item_code') item_code: string,
    @Body() dto: any,
  ) {
    return this.service.returnItem(item_code, dto);
  }

  @Get('weapon-regions')
  async listWeaponRegions() {
    return this.service.listWeaponRegions();
  }

  @Post('weapon-regions')
  async createWeaponRegion(@Body() dto: { region: string }) {
    return this.service.createWeaponRegion(dto.region);
  }

  @Put('weapon-regions/:region')
  async updateWeaponRegion(
    @Param('region') region: string,
    @Body() dto: { newRegion: string },
  ) {
    return this.service.updateWeaponRegion(region, dto.newRegion);
  }

  @Delete('weapon-regions/:region')
  async deleteWeaponRegion(@Param('region') region: string) {
    return this.service.deleteWeaponRegion(region);
  }
}
