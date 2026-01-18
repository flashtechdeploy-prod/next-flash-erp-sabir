import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { DRIZZLE } from '../../db/drizzle.module';
import * as schema from '../../db/schema';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, and, asc, desc, SQL } from 'drizzle-orm';
import { GeneralInventoryItemDto, InventoryTransactionDto } from './dto/inventory.dto';

@Injectable()
export class GeneralInventoryService {
  constructor(
    @Inject(DRIZZLE)
    private db: NodePgDatabase<typeof schema>,
  ) {}

  async listItems() {
    return this.db
      .select()
      .from(schema.generalInventoryItems)
      .orderBy(asc(schema.generalInventoryItems.item_code));
  }

  async getItem(itemCode: string) {
    const [item] = await this.db
      .select()
      .from(schema.generalInventoryItems)
      .where(eq(schema.generalInventoryItems.item_code, itemCode));
    if (!item) throw new NotFoundException('Item not found');
    return item;
  }

  async createItem(dto: GeneralInventoryItemDto) {
    const [result] = await this.db
      .insert(schema.generalInventoryItems)
      .values(dto)
      .returning();
    return result;
  }

  async updateItem(itemCode: string, dto: Partial<GeneralInventoryItemDto>) {
    await this.getItem(itemCode);
    await this.db
      .update(schema.generalInventoryItems)
      .set(dto)
      .where(eq(schema.generalInventoryItems.item_code, itemCode));
    return this.getItem(itemCode);
  }

  async deleteItem(itemCode: string) {
    await this.getItem(itemCode);
    await this.db
      .delete(schema.generalInventoryItems)
      .where(eq(schema.generalInventoryItems.item_code, itemCode));
    return { message: 'Deleted' };
  }

  async listCategories() {
    const result = await this.db
      .selectDistinct({ category: schema.generalInventoryItems.category })
      .from(schema.generalInventoryItems);
    return result.map((r) => r.category).filter(Boolean);
  }

  async listTransactions(query: {
    item_code?: string;
    employee_id?: string;
    limit?: number;
  }) {
    const filters: SQL[] = [];
    if (query.item_code)
      filters.push(
        eq(schema.generalInventoryTransactions.item_code, query.item_code),
      );
    if (query.employee_id)
      filters.push(
        eq(schema.generalInventoryTransactions.employee_id, query.employee_id),
      );
    const finalFilter = filters.length > 0 ? and(...filters) : undefined;
    return this.db
      .select()
      .from(schema.generalInventoryTransactions)
      .where(finalFilter)
      .limit(query.limit || 100)
      .orderBy(desc(schema.generalInventoryTransactions.id));
  }

  async issue(
    itemCode: string,
    dto: InventoryTransactionDto,
  ) {
    const item = await this.getItem(itemCode);
    const newQty = (item.quantity_on_hand || 0) - dto.quantity;
    await this.db
      .update(schema.generalInventoryItems)
      .set({ quantity_on_hand: newQty })
      .where(eq(schema.generalInventoryItems.item_code, itemCode));
    await this.db.insert(schema.generalInventoryTransactions).values({
      item_code: itemCode,
      employee_id: dto.employee_id,
      quantity: dto.quantity,
      notes: dto.notes,
      action: 'issue',
    });
    return this.getItem(itemCode);
  }

  async returnItem(
    itemCode: string,
    dto: InventoryTransactionDto,
  ) {
    const item = await this.getItem(itemCode);
    const newQty = (item.quantity_on_hand || 0) + dto.quantity;
    await this.db
      .update(schema.generalInventoryItems)
      .set({ quantity_on_hand: newQty })
      .where(eq(schema.generalInventoryItems.item_code, itemCode));
    await this.db.insert(schema.generalInventoryTransactions).values({
      item_code: itemCode,
      employee_id: dto.employee_id,
      quantity: dto.quantity,
      notes: dto.notes,
      action: 'return',
    });
    return this.getItem(itemCode);
  }

  async lostItem(
    itemCode: string,
    dto: { employee_id: string; quantity: number; notes?: string },
  ) {
    const item = await this.getItem(itemCode);
    await this.db.insert(schema.generalInventoryTransactions).values({
      item_code: itemCode,
      employee_id: dto.employee_id,
      quantity: dto.quantity,
      notes: dto.notes,
      action: 'lost',
    });
    return item;
  }

  async damagedItem(
    itemCode: string,
    dto: { employee_id: string; quantity: number; notes?: string },
  ) {
    const item = await this.getItem(itemCode);
    await this.db.insert(schema.generalInventoryTransactions).values({
      item_code: itemCode,
      employee_id: dto.employee_id,
      quantity: dto.quantity,
      notes: dto.notes,
      action: 'damaged',
    });
    return item;
  }

  async adjustItem(
    itemCode: string,
    dto: { quantity: number; notes?: string },
  ) {
    await this.db
      .update(schema.generalInventoryItems)
      .set({ quantity_on_hand: dto.quantity })
      .where(eq(schema.generalInventoryItems.item_code, itemCode));
    await this.db.insert(schema.generalInventoryTransactions).values({
      item_code: itemCode,
      quantity: dto.quantity,
      notes: dto.notes,
      action: 'adjust',
    });
    return this.getItem(itemCode);
  }
}
