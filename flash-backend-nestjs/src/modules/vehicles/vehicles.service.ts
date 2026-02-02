import { Injectable, NotFoundException, Inject, Logger } from '@nestjs/common';
import { DRIZZLE } from '../../db/drizzle.module';
import * as schema from '../../db/schema';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, and, desc, sql, asc } from 'drizzle-orm';
import { CloudStorageService } from '../../common/storage/cloud-storage.service';

@Injectable()
export class VehiclesService {
  private logger = new Logger(VehiclesService.name);

  constructor(
    @Inject(DRIZZLE)
    private db: NodePgDatabase<typeof schema>,
    private cloudStorageService: CloudStorageService,
  ) {}

  async findAll(skip = 0, limit = 100, category?: string) {
    const filters = [];
    if (category) {
      filters.push(eq(schema.vehicles.category, category));
    }

    return this.db
      .select()
      .from(schema.vehicles)
      .where(filters.length > 0 ? and(...filters) : undefined)
      .limit(limit)
      .offset(skip)
      .orderBy(desc(schema.vehicles.id));
  }

  async getCategories() {
    const result = await this.db
      .select()
      .from(schema.vehicleCategories)
      .orderBy(asc(schema.vehicleCategories.name));
    
    // If table is empty, fall back to distinct categories from vehicles table to avoid losing data
    if (result.length === 0) {
      const distinctResult = await this.db
        .selectDistinct({ name: schema.vehicles.category })
        .from(schema.vehicles)
        .where(sql`${schema.vehicles.category} IS NOT NULL AND ${schema.vehicles.category} != ''`);
      
      // Auto-populate the categories table if it's empty but vehicles have categories
      if (distinctResult.length > 0) {
        for (const r of distinctResult) {
          if (r.name) {
            await this.addCategory(r.name);
          }
        }
        return distinctResult.map(r => r.name).sort();
      }
    }
    
    return result.map((r) => r.name);
  }

  async addCategory(name: string) {
    if (!name) return { message: 'Invalid input' };
    try {
      const [result] = await this.db
        .insert(schema.vehicleCategories)
        .values({ name })
        .onConflictDoNothing()
        .returning();
      return result || { message: 'Category already exists' };
    } catch (error) {
      this.logger.error('Failed to add category:', error);
      throw error;
    }
  }

  async updateCategory(oldCategory: string, newCategory: string) {
    if (!oldCategory || !newCategory) return { message: 'Invalid input' };
    
    // Update dictionary
    await this.db
      .update(schema.vehicleCategories)
      .set({ name: newCategory })
      .where(eq(schema.vehicleCategories.name, oldCategory));

    // Update vehicles
    await this.db
      .update(schema.vehicles)
      .set({ category: newCategory })
      .where(eq(schema.vehicles.category, oldCategory));
      
    return { message: 'Category updated successfully' };
  }

  async deleteCategory(category: string) {
    // Delete from dictionary
    await this.db
      .delete(schema.vehicleCategories)
      .where(eq(schema.vehicleCategories.name, category));

    // Update vehicles to 'Uncategorized'
    await this.db
      .update(schema.vehicles)
      .set({ category: 'Uncategorized' })
      .where(eq(schema.vehicles.category, category));
      
    return { message: 'Category deleted (vehicles moved to Uncategorized)' };
  }

  async getTypes() {
    const result = await this.db
      .select()
      .from(schema.vehicleTypes)
      .orderBy(asc(schema.vehicleTypes.name));
    
    // If table is empty, fall back to distinct types from vehicles table
    if (result.length === 0) {
      const distinctResult = await this.db
        .selectDistinct({ name: schema.vehicles.vehicle_type })
        .from(schema.vehicles)
        .where(sql`${schema.vehicles.vehicle_type} IS NOT NULL AND ${schema.vehicles.vehicle_type} != ''`);
      
      if (distinctResult.length > 0) {
        for (const r of distinctResult) {
          if (r.name) {
            await this.addType(r.name);
          }
        }
        return distinctResult.map(r => r.name).sort();
      }
    }
    
    return result.map((r) => r.name);
  }

  async addType(name: string) {
    if (!name) return { message: 'Invalid input' };
    try {
      const [result] = await this.db
        .insert(schema.vehicleTypes)
        .values({ name })
        .onConflictDoNothing()
        .returning();
      return result || { message: 'Type already exists' };
    } catch (error) {
      this.logger.error('Failed to add vehicle type:', error);
      throw error;
    }
  }

  async updateType(oldType: string, newType: string) {
    if (!oldType || !newType) return { message: 'Invalid input' };
    
    await this.db
      .update(schema.vehicleTypes)
      .set({ name: newType })
      .where(eq(schema.vehicleTypes.name, oldType));

    await this.db
      .update(schema.vehicles)
      .set({ vehicle_type: newType })
      .where(eq(schema.vehicles.vehicle_type, oldType));
      
    return { message: 'Vehicle type updated successfully' };
  }

  async deleteType(type: string) {
    await this.db
      .delete(schema.vehicleTypes)
      .where(eq(schema.vehicleTypes.name, type));

    await this.db
      .update(schema.vehicles)
      .set({ vehicle_type: 'Other' })
      .where(eq(schema.vehicles.vehicle_type, type));
      
    return { message: 'Vehicle type deleted (vehicles moved to Other)' };
  }

  async findOne(vehicleId: string) {
    const [vehicle] = await this.db
      .select()
      .from(schema.vehicles)
      .where(eq(schema.vehicles.vehicle_id, vehicleId));
    if (!vehicle) {
      throw new NotFoundException(`Vehicle ${vehicleId} not found`);
    }

    const documents = await this.db
      .select()
      .from(schema.vehicleDocuments)
      .where(eq(schema.vehicleDocuments.vehicle_id, vehicleId));
    const images = await this.db
      .select()
      .from(schema.vehicleImages)
      .where(eq(schema.vehicleImages.vehicle_id, vehicleId));

    return { ...vehicle, documents, images };
  }

  async create(createDto: any) {
    const data: any = { ...createDto };
    // Mapping handled by snake_case keys in schema
    const [result] = await this.db
      .insert(schema.vehicles)
      .values(data)
      .returning();
    return result;
  }

  async update(vehicleId: string, updateDto: any) {
    await this.findOne(vehicleId);

    const data: any = { ...updateDto };
    await this.db
      .update(schema.vehicles)
      .set(data)
      .where(eq(schema.vehicles.vehicle_id, vehicleId));
    return this.findOne(vehicleId);
  }

  async remove(vehicleId: string) {
    await this.findOne(vehicleId);
    await this.db
      .delete(schema.vehicles)
      .where(eq(schema.vehicles.vehicle_id, vehicleId));
    return { message: `Vehicle ${vehicleId} deleted` };
  }

  async importBulk(vehicles: any[]) {
    let imported = 0;
    for (const v of vehicles) {
      await this.create(v);
      imported++;
    }
    return { imported };
  }

  // Documents
  async listDocuments(vehicleId: string) {
    return this.db
      .select()
      .from(schema.vehicleDocuments)
      .where(eq(schema.vehicleDocuments.vehicle_id, vehicleId))
      .orderBy(desc(schema.vehicleDocuments.created_at));
  }

  async uploadDocument(
    vehicleId: string,
    filename: string,
    fileBuffer?: Buffer,
    mimeType?: string,
  ) {
    try {
      if (!fileBuffer) {
        throw new Error('File buffer is required');
      }

      // Upload to Cloud Storage
      this.logger.log(`Uploading vehicle document to cloud: vehicles/${vehicleId}/${filename}`);
      const { url } = await this.cloudStorageService.uploadFile(
        fileBuffer,
        filename,
        mimeType || 'application/octet-stream',
        `vehicles/${vehicleId}`,
      );

      // Store reference in database
      const [result] = await this.db
        .insert(schema.vehicleDocuments)
        .values({
          vehicle_id: vehicleId,
          filename,
          url: url, 
          mime_type: mimeType,
        })
        .returning();
      
      this.logger.log(`Vehicle document uploaded successfully: ${filename}`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to upload document for vehicle ${vehicleId}:`, error);
      throw error;
    }
  }

  async deleteDocument(vehicleId: string, docId: number) {
    await this.db
      .delete(schema.vehicleDocuments)
      .where(
        and(
          eq(schema.vehicleDocuments.id, docId),
          eq(schema.vehicleDocuments.vehicle_id, vehicleId),
        ),
      );
    return { message: 'Document deleted' };
  }

  // Images
  async listImages(vehicleId: string) {
    return this.db
      .select()
      .from(schema.vehicleImages)
      .where(eq(schema.vehicleImages.vehicle_id, vehicleId))
      .orderBy(desc(schema.vehicleImages.created_at));
  }

  async uploadImage(
    vehicleId: string,
    filename: string,
    fileBuffer: Buffer,
    mimeType: string,
  ) {
    try {
      // Upload to Cloud Storage
      this.logger.log(`Uploading vehicle image to cloud: vehicles/${vehicleId}/images/${filename}`);
      const { url } = await this.cloudStorageService.uploadFile(
        fileBuffer,
        filename,
        mimeType || 'image/jpeg',
        `vehicles/${vehicleId}/images`,
      );

      // Store reference in database
      const [result] = await this.db
        .insert(schema.vehicleImages)
        .values({
          vehicle_id: vehicleId,
          filename,
          url: url, 
          mime_type: mimeType,
        })
        .returning();
      
      this.logger.log(`Vehicle image uploaded successfully: ${filename}`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to upload image for vehicle ${vehicleId}:`, error);
      throw error;
    }
  }

  async deleteImage(vehicleId: string, imageId: number) {
    await this.db
      .delete(schema.vehicleImages)
      .where(
        and(
          eq(schema.vehicleImages.id, imageId),
          eq(schema.vehicleImages.vehicle_id, vehicleId),
        ),
      );
    return { message: 'Image deleted' };
  }
}
