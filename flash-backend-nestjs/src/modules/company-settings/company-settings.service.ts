import { Injectable, Logger } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Inject } from '@nestjs/common';
import { DRIZZLE } from 'src/db/drizzle.module';
import * as schema from 'src/db/schema';
import { eq } from 'drizzle-orm';
import { UpdateCompanySettingsDto } from './dto/company-settings.dto';

@Injectable()
export class CompanySettingsService {
  private readonly logger = new Logger(CompanySettingsService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async getSettings() {
    const settings = await this.db.select().from(schema.companySettings).limit(1);
    
    if (settings.length === 0) {
      // Create default settings if none exist
      const [newSettings] = await this.db
        .insert(schema.companySettings)
        .values({
          name: 'Flash Security Services',
        })
        .returning();
      return newSettings;
    }
    
    return settings[0];
  }

  async updateSettings(updateDto: UpdateCompanySettingsDto) {
    const existing = await this.getSettings();
    
    const [updated] = await this.db
      .update(schema.companySettings)
      .set({
        ...updateDto,
        updated_at: new Date(),
      })
      .where(eq(schema.companySettings.id, existing.id))
      .returning();
      
    return updated;
  }
}
