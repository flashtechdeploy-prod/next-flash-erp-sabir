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
import { GeneralInventoryService } from './general-inventory.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GeneralInventoryItemDto, InventoryTransactionDto } from './dto/inventory.dto';

@ApiTags('General Inventory')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('general-inventory')
export class GeneralInventoryController {
  constructor(private readonly service: GeneralInventoryService) {}

  @Get('items')
  async listItems() {
    return this.service.listItems();
  }

  @Post('items')
  async createItem(@Body() dto: GeneralInventoryItemDto) {
    return this.service.createItem(dto);
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
  async updateCategory(@Param('category') category: string, @Body() dto: { newCategory: string }) {
    return this.service.updateCategory(category, dto.newCategory);
  }

  @Delete('categories/:category')
  async deleteCategory(@Param('category') category: string) {
    return this.service.deleteCategory(category);
  }

  @Get('transactions')
  async listTransactions(@Query() query: any) {
    return this.service.listTransactions(query);
  }

  @Get('items/:item_code')
  async getItem(@Param('item_code') itemCode: string) {
    return this.service.getItem(itemCode);
  }

  @Put('items/:item_code')
  async updateItem(@Param('item_code') itemCode: string, @Body() dto: Partial<GeneralInventoryItemDto>) {
    return this.service.updateItem(itemCode, dto);
  }

  @Delete('items/:item_code')
  async deleteItem(@Param('item_code') itemCode: string) {
    return this.service.deleteItem(itemCode);
  }

  @Post('items/:item_code/issue')
  async issue(@Param('item_code') itemCode: string, @Body() dto: InventoryTransactionDto) {
    return this.service.issue(itemCode, dto);
  }

  @Post('items/:item_code/return')
  async returnItem(@Param('item_code') itemCode: string, @Body() dto: InventoryTransactionDto) {
    return this.service.returnItem(itemCode, dto);
  }

  @Post('items/:item_code/lost')
  async lostItem(@Param('item_code') itemCode: string, @Body() dto: any) {
    return this.service.lostItem(itemCode, dto);
  }

  @Post('items/:item_code/damaged')
  async damagedItem(@Param('item_code') itemCode: string, @Body() dto: any) {
    return this.service.damagedItem(itemCode, dto);
  }

  @Post('items/:item_code/adjust')
  async adjustItem(@Param('item_code') itemCode: string, @Body() dto: any) {
    return this.service.adjustItem(itemCode, dto);
  }
}
