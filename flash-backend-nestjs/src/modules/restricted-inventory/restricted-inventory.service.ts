import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { DRIZZLE } from '../../db/drizzle.module';
import * as schema from '../../db/schema';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, and, asc, desc, SQL, sql } from 'drizzle-orm';
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
    
    console.log('📦 All items fetched:', items.length);
    
    // Calculate counts for each item
    const itemsWithCounts = await Promise.all(
      items.map(async (item) => {
        console.log(`\n🔍 Processing item: ${item.item_code} (${item.name})`);
        console.log(`   is_serial_tracked: ${item.is_serial_tracked}`);
        console.log(`   quantity_on_hand: ${item.quantity_on_hand}`);
        
        if (item.is_serial_tracked) {
          // For weapons: use serial units
          const serials = await this.db
            .select()
            .from(schema.restrictedSerialUnits)
            .where(eq(schema.restrictedSerialUnits.item_code, item.item_code));

          const serial_total = serials.length;
          const serial_in_stock = serials.filter((s) => s.status === 'in_stock').length;
          const serial_issued = serials.filter((s) => s.status === 'issued').length;
          
          console.log(`   [WEAPON] total=${serial_total}, in_stock=${serial_in_stock}, issued=${serial_issued}`);
          
          return {
            ...item,
            serial_total: serial_total,
            serial_in_stock: serial_in_stock,
            issued_units: serial_issued,
          };
        } else {
          // For ammunition: use quantity tracking from transactions
          const issuedTransactions = await this.db
            .select()
            .from(schema.restrictedTransactions)
            .where(
              and(
                eq(schema.restrictedTransactions.item_code, item.item_code),
                eq(schema.restrictedTransactions.action, 'issue')
              )
            );

          const returnedTransactions = await this.db
            .select()
            .from(schema.restrictedTransactions)
            .where(
              and(
                eq(schema.restrictedTransactions.item_code, item.item_code),
                eq(schema.restrictedTransactions.action, 'return')
              )
            );

          const quantityOnHand = item.quantity_on_hand || 0;
          const totalIssued = issuedTransactions.reduce((sum, trans) => sum + (trans.quantity || 0), 0);
          const totalReturned = returnedTransactions.reduce((sum, trans) => sum + (trans.quantity || 0), 0);
          const netIssued = totalIssued - totalReturned;
          const available = Math.max(0, quantityOnHand - netIssued);

          console.log(`   [AMMO] quantity_on_hand=${quantityOnHand}, issued=${totalIssued}, returned=${totalReturned}, net_issued=${netIssued}, available=${available}`);
          
          return {
            ...item,
            serial_total: quantityOnHand,
            serial_in_stock: available,
            issued_units: netIssued,
          };
        }
      })
    );
    
    console.log('✅ Items with counts calculated');
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

  async createItem(dto: RestrictedInventoryItemDto) {
    const item_code = dto.item_code ?? (await this.generateRestrictedInventoryId());
    const [result] = await this.db
      .insert(schema.restrictedInventoryItems)
      .values({
        ...dto,
        item_code,
        status: dto.status ?? 'active',
        is_serial_tracked: dto.is_serial_tracked !== undefined ? dto.is_serial_tracked : false,
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
    const rows = await this.db
      .selectDistinct({ category: schema.restrictedInventoryItems.category })
      .from(schema.restrictedInventoryItems)
      .orderBy(asc(schema.restrictedInventoryItems.category));
    return rows.map((r) => r.category).filter(Boolean);
  }

  async createCategory(category: string) {
    const item_code = await this.generateRestrictedInventoryId();
    await this.db.insert(schema.restrictedInventoryItems).values({
      item_code,
      name: category,
      category,
      unit_name: 'unit',
      quantity_on_hand: 0,
      status: 'inactive',
      is_serial_tracked: true,
    });
    return { message: 'Category created' };
  }

  async updateCategory(oldCategory: string, newCategory: string) {
    await this.db
      .update(schema.restrictedInventoryItems)
      .set({ category: newCategory })
      .where(eq(schema.restrictedInventoryItems.category, oldCategory));
    return { message: 'Category updated' };
  }

  async deleteCategory(category: string) {
    await this.db
      .delete(schema.restrictedInventoryItems)
      .where(
        and(
          eq(schema.restrictedInventoryItems.category, category),
          eq(schema.restrictedInventoryItems.status, 'inactive'),
        ),
      );
    return { message: 'Category deleted' };
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
    // Ensure serial number is unique to avoid constraint errors
    const existing = await this.db
      .select({ id: schema.restrictedSerialUnits.id })
      .from(schema.restrictedSerialUnits)
      .where(eq(schema.restrictedSerialUnits.serial_number, dto.serial_number));
    if (existing.length > 0) {
      throw new Error('Serial number already exists');
    }

    const [result] = await this.db
      .insert(schema.restrictedSerialUnits)
      .values(data)
      .returning();
    return result;
  }

  private async generateRestrictedInventoryId() {
    const [row] = await this.db
      .select({ maxId: sql<number>`max(id)` })
      .from(schema.restrictedInventoryItems);
    const next = (row?.maxId || 0) + 1;
    const padded = String(next).padStart(2, '0');
    return `FRI-${padded}`;
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

  async issueItem(itemCode: string, dto: any) {
    const { quantity, employee_id, notes } = dto;

    if (!quantity || quantity <= 0) {
      throw new Error('Quantity must be greater than 0');
    }

    if (!employee_id) {
      throw new Error('Employee ID is required');
    }

    // Get the item to verify it exists
    const [item] = await this.db
      .select()
      .from(schema.restrictedInventoryItems)
      .where(eq(schema.restrictedInventoryItems.item_code, itemCode));

    if (!item) {
      throw new NotFoundException('Item not found');
    }

    // Calculate available quantity: initial_quantity - issued_from_transactions
    const issuedTransactions = await this.db
      .select()
      .from(schema.restrictedTransactions)
      .where(
        and(
          eq(schema.restrictedTransactions.item_code, itemCode),
          eq(schema.restrictedTransactions.action, 'issue')
        )
      );

    const returnedTransactions = await this.db
      .select()
      .from(schema.restrictedTransactions)
      .where(
        and(
          eq(schema.restrictedTransactions.item_code, itemCode),
          eq(schema.restrictedTransactions.action, 'return')
        )
      );

    const quantityOnHand = item.quantity_on_hand || 0;
    const totalIssued = issuedTransactions.reduce((sum, trans) => sum + (trans.quantity || 0), 0);
    const totalReturned = returnedTransactions.reduce((sum, trans) => sum + (trans.quantity || 0), 0);
    const netIssued = totalIssued - totalReturned;
    const available = Math.max(0, quantityOnHand - netIssued);

    if (available < quantity) {
      throw new Error(`Insufficient quantity. Available: ${available}, Requested: ${quantity}`);
    }

    // Record transaction only - do NOT modify quantity_on_hand
    await this.db.insert(schema.restrictedTransactions).values({
      item_code: itemCode,
      employee_id: employee_id,
      action: 'issue',
      quantity: Number(quantity),
      notes: notes || null,
    });

    return { success: true, message: 'Item issued successfully', available: available - quantity };
  }

  async returnItem(itemCode: string, dto: any) {
    const { quantity, employee_id, notes } = dto;

    if (!quantity || quantity <= 0) {
      throw new Error('Quantity must be greater than 0');
    }

    if (!employee_id) {
      throw new Error('Employee ID is required');
    }

    // Get the item to verify it exists
    const [item] = await this.db
      .select()
      .from(schema.restrictedInventoryItems)
      .where(eq(schema.restrictedInventoryItems.item_code, itemCode));

    if (!item) {
      throw new NotFoundException('Item not found');
    }

    // Record transaction only - do NOT modify quantity_on_hand
    // quantity_on_hand is the initial stock, transactions track movements
    await this.db.insert(schema.restrictedTransactions).values({
      item_code: itemCode,
      employee_id: employee_id,
      action: 'return',
      quantity: Number(quantity),
      notes: notes || null,
    });

    return { success: true, message: 'Item returned successfully' };
  }

  async listWeaponRegions() {
    const rows = await this.db
      .selectDistinct({ weapon_region: schema.restrictedInventoryItems.weapon_region })
      .from(schema.restrictedInventoryItems)
      .orderBy(asc(schema.restrictedInventoryItems.weapon_region));
    return rows.map((r) => r.weapon_region).filter(Boolean);
  }

  async createWeaponRegion(region: string) {
    const item_code = await this.generateRestrictedInventoryId();
    await this.db.insert(schema.restrictedInventoryItems).values({
      item_code,
      name: region,
      category: 'temp',
      weapon_region: region,
      unit_name: 'unit',
      quantity_on_hand: 0,
      status: 'inactive',
      is_serial_tracked: true,
    });
    return { message: 'Weapon region created' };
  }

  async updateWeaponRegion(oldRegion: string, newRegion: string) {
    await this.db
      .update(schema.restrictedInventoryItems)
      .set({ weapon_region: newRegion })
      .where(eq(schema.restrictedInventoryItems.weapon_region, oldRegion));
    return { message: 'Weapon region updated' };
  }

  async deleteWeaponRegion(region: string) {
    await this.db
      .delete(schema.restrictedInventoryItems)
      .where(
        and(
          eq(schema.restrictedInventoryItems.weapon_region, region),
          eq(schema.restrictedInventoryItems.status, 'inactive'),
        ),
      );
    return { message: 'Weapon region deleted' };
  }
}
