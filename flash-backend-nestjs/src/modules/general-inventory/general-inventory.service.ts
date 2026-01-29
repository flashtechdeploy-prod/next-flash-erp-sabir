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
      .where(eq(schema.generalInventoryItems.status, 'active'))
      .orderBy(desc(schema.generalInventoryItems.id));
  }

  async getItem(itemCode: string) {
    const [item] = await this.db
      .select()
      .from(schema.generalInventoryItems)
      .where(eq(schema.generalInventoryItems.item_code, itemCode));
    if (!item) throw new NotFoundException('Item not found');
    return item;
  }

  private async generateGeneralInventoryId(): Promise<string> {
    const items = await this.db
      .select({ id: schema.generalInventoryItems.id })
      .from(schema.generalInventoryItems)
      .orderBy(desc(schema.generalInventoryItems.id))
      .limit(1);
    const nextId = (items[0]?.id || 0) + 1;
    return `FGI-${String(nextId).padStart(2, '0')}`;
  }

  async createItem(dto: GeneralInventoryItemDto) {
    const itemCode = dto.item_code || await this.generateGeneralInventoryId();
    const [result] = await this.db
      .insert(schema.generalInventoryItems)
      .values({
        ...dto,
        item_code: itemCode,
      })
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
    return result
      .map((r) => r.category)
      .filter(Boolean)
      .sort();
  }

  async createCategory(category: string) {
    // Check if category already exists
    const existing = await this.db
      .select({ category: schema.generalInventoryItems.category })
      .from(schema.generalInventoryItems)
      .where(eq(schema.generalInventoryItems.category, category));
    if (existing.length > 0) {
      throw new Error('Category already exists');
    }
    // Create a placeholder item with this category to persist it
    const itemCode = await this.generateGeneralInventoryId();
    const [result] = await this.db
      .insert(schema.generalInventoryItems)
      .values({
        item_code: itemCode,
        name: `[${category}]`, // Placeholder name to indicate it's a category holder
        category: category,
        unit_name: 'N/A',
        quantity_on_hand: 0,
        status: 'inactive',
      })
      .returning();
    return { category, message: 'Category created' };
  }

  async deleteCategory(category: string) {
    // Delete the placeholder item for this category
    await this.db
      .delete(schema.generalInventoryItems)
      .where(
        and(
          eq(schema.generalInventoryItems.category, category),
          eq(schema.generalInventoryItems.name, `[${category}]`)
        )
      );
    return { message: 'Category deleted' };
  }

  async updateCategory(oldCategory: string, newCategory: string) {
    // Update all items with this category
    await this.db
      .update(schema.generalInventoryItems)
      .set({ category: newCategory })
      .where(eq(schema.generalInventoryItems.category, oldCategory));
    return { message: 'Category updated' };
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
