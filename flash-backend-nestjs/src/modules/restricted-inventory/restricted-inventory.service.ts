import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { DRIZZLE } from '../../db/drizzle.module';
import * as schema from '../../db/schema';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, and, asc, desc, SQL } from 'drizzle-orm';
import { RestrictedInventoryItemDto } from '../general-inventory/dto/inventory.dto';

@Injectable()
export class RestrictedInventoryService {
  constructor(
    @Inject(DRIZZLE)
    private db: NodePgDatabase<typeof schema>,
  ) {}

  async listItems() {
    const items = await this.db
      .select()
      .from(schema.restrictedInventoryItems)
      .where(eq(schema.restrictedInventoryItems.status, 'active'))
      .orderBy(desc(schema.restrictedInventoryItems.id));
    
    // Calculate serial counts for each item
    const itemsWithCounts = await Promise.all(
      items.map(async (item) => {
        const serials = await this.db
          .select()
          .from(schema.restrictedSerialUnits)
          .where(eq(schema.restrictedSerialUnits.item_code, item.item_code));
        
        const serial_total = serials.length;
        const serial_in_stock = serials.filter((s) => s.status === 'in_stock').length;
        const issued_units = serials.filter((s) => s.status === 'issued').length;
        
        return {
          ...item,
          serial_total,
          serial_in_stock,
          issued_units,
        };
      })
    );
    
    return itemsWithCounts;
  }

  async getItem(itemCode: string) {
    const [item] = await this.db
      .select()
      .from(schema.restrictedInventoryItems)
      .where(eq(schema.restrictedInventoryItems.item_code, itemCode));
    if (!item) throw new NotFoundException('Item not found');
    return item;
  }

  private async generateRestrictedInventoryId(): Promise<string> {
    const items = await this.db
      .select({ id: schema.restrictedInventoryItems.id })
      .from(schema.restrictedInventoryItems)
      .orderBy(desc(schema.restrictedInventoryItems.id))
      .limit(1);
    const nextId = (items[0]?.id || 0) + 1;
    return `FRI-${String(nextId).padStart(2, '0')}`;
  }

  async createItem(dto: RestrictedInventoryItemDto) {
    const itemCode = dto.item_code || await this.generateRestrictedInventoryId();
    const [result] = await this.db
      .insert(schema.restrictedInventoryItems)
      .values({
        ...dto,
        item_code: itemCode,
      })
      .returning();
    return result;
  }

  async updateItem(itemCode: string, dto: Partial<RestrictedInventoryItemDto>) {
    await this.getItem(itemCode);
    await this.db
      .update(schema.restrictedInventoryItems)
      .set(dto)
      .where(eq(schema.restrictedInventoryItems.item_code, itemCode));
    return this.getItem(itemCode);
  }

  async deleteItem(itemCode: string) {
    await this.getItem(itemCode);
    await this.db
      .delete(schema.restrictedInventoryItems)
      .where(eq(schema.restrictedInventoryItems.item_code, itemCode));
    return { message: 'Deleted' };
  }

  async listCategories() {
    const result = await this.db
      .selectDistinct({ category: schema.restrictedInventoryItems.category })
      .from(schema.restrictedInventoryItems);
    return result
      .map((r) => r.category)
      .filter(Boolean)
      .sort();
  }

  async createCategory(category: string) {
    // Check if category already exists
    const existing = await this.db
      .select({ category: schema.restrictedInventoryItems.category })
      .from(schema.restrictedInventoryItems)
      .where(eq(schema.restrictedInventoryItems.category, category));
    if (existing.length > 0) {
      throw new Error('Category already exists');
    }
    // Create a placeholder item with this category to persist it
    const itemCode = await this.generateRestrictedInventoryId();
    const [result] = await this.db
      .insert(schema.restrictedInventoryItems)
      .values({
        item_code: itemCode,
        name: `[${category}]`, // Placeholder name to indicate it's a category holder
        category: category,
        unit_name: 'N/A',
        is_serial_tracked: false,
        status: 'inactive',
      })
      .returning();
    return { category, message: 'Category created' };
  }

  async deleteCategory(category: string) {
    // Delete the placeholder item for this category
    await this.db
      .delete(schema.restrictedInventoryItems)
      .where(
        and(
          eq(schema.restrictedInventoryItems.category, category),
          eq(schema.restrictedInventoryItems.name, `[${category}]`)
        )
      );
    return { message: 'Category deleted' };
  }

  async updateCategory(oldCategory: string, newCategory: string) {
    // Update all items with this category
    await this.db
      .update(schema.restrictedInventoryItems)
      .set({ category: newCategory })
      .where(eq(schema.restrictedInventoryItems.category, oldCategory));
    return { message: 'Category updated' };
  }

  async listSerialUnits(itemCode: string) {
    return this.db
      .select()
      .from(schema.restrictedSerialUnits)
      .where(eq(schema.restrictedSerialUnits.item_code, itemCode))
      .orderBy(asc(schema.restrictedSerialUnits.serial_number));
  }

  async createSerialUnit(itemCode: string, dto: any) {
    const data: any = { ...dto, item_code: itemCode };
    const [result] = await this.db
      .insert(schema.restrictedSerialUnits)
      .values(data)
      .returning();
    return result;
  }

  async listTransactions(query: { item_code?: string; employee_id?: string }) {
    const filters: SQL[] = [];
    if (query.item_code)
      filters.push(
        eq(schema.restrictedTransactions.item_code, query.item_code),
      );
    if (query.employee_id)
      filters.push(
        eq(schema.restrictedTransactions.employee_id, query.employee_id),
      );
    const finalFilter = filters.length > 0 ? and(...filters) : undefined;
    return this.db
      .select()
      .from(schema.restrictedTransactions)
      .where(finalFilter)
      .orderBy(desc(schema.restrictedTransactions.id));
  }

  async issueSerial(serialUnitId: number, employeeId: string) {
    const [unit] = await this.db
      .select()
      .from(schema.restrictedSerialUnits)
      .where(eq(schema.restrictedSerialUnits.id, serialUnitId));
    if (!unit) throw new NotFoundException('Serial unit not found');

    await this.db
      .update(schema.restrictedSerialUnits)
      .set({
        status: 'issued',
        issued_to_employee_id: employeeId,
      })
      .where(eq(schema.restrictedSerialUnits.id, serialUnitId));

    await this.db.insert(schema.restrictedTransactions).values({
      item_code: unit.item_code,
      employee_id: employeeId,
      serial_unit_id: serialUnitId,
      action: 'issue',
    });
    const [updatedUnit] = await this.db
      .select()
      .from(schema.restrictedSerialUnits)
      .where(eq(schema.restrictedSerialUnits.id, serialUnitId));
    return updatedUnit;
  }

  async returnSerial(serialUnitId: number) {
    const [unit] = await this.db
      .select()
      .from(schema.restrictedSerialUnits)
      .where(eq(schema.restrictedSerialUnits.id, serialUnitId));
    if (!unit) throw new NotFoundException('Serial unit not found');

    const employee_id = (unit as any).issued_to_employee_id;

    await this.db
      .update(schema.restrictedSerialUnits)
      .set({
        status: 'in_stock',
        issued_to_employee_id: null,
      })
      .where(eq(schema.restrictedSerialUnits.id, serialUnitId));

    await this.db.insert(schema.restrictedTransactions).values({
      item_code: (unit as any).item_code,
      employee_id: employee_id,
      serial_unit_id: serialUnitId,
      action: 'return',
    });
    const [updatedUnit] = await this.db
      .select()
      .from(schema.restrictedSerialUnits)
      .where(eq(schema.restrictedSerialUnits.id, serialUnitId));
    return updatedUnit;
  }
}
