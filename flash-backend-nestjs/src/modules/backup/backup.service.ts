import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class BackupService {
  private readonly logger = new Logger(BackupService.name);

  constructor(private configService: ConfigService) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleCron() {
    this.logger.log('Starting scheduled 24-hour portable backup to Cloudflare R2...');
    await this.runBackup();
  }

  async runBackup() {
    const DATABASE_URL = this.configService.get<string>('DATABASE_URL');
    const R2_ACCESS_KEY_ID = this.configService.get<string>('R2_ACCESS_KEY_ID');
    const R2_SECRET_ACCESS_KEY = this.configService.get<string>('R2_SECRET_ACCESS_KEY');
    const R2_BUCKET_NAME = this.configService.get<string>('R2_BUCKET_NAME');
    const R2_ENDPOINT = this.configService.get<string>('R2_ENDPOINT');

    if (!DATABASE_URL || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME || !R2_ENDPOINT) {
      this.logger.warn('Cloudflare R2 backup skipped: Missing required environment variables.');
      return;
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFilename = `backup-portable-${timestamp}.json`;
    const backupPath = path.join(process.cwd(), backupFilename);

    const client = new Client({ 
        connectionString: DATABASE_URL,
        ssl: DATABASE_URL.includes('sslmode=require') ? { rejectUnauthorized: false } : false
    });

    try {
      this.logger.log('Connecting to database for portable extraction...');
      await client.connect();

      this.logger.log('Discovering tables in public schema...');
      const tableRes = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
      `);
      
      const tables = tableRes.rows.map(r => r.table_name);
      this.logger.log(`Found ${tables.length} tables to back up.`);

      const backupData: any = {
        metadata: {
          timestamp,
          tables_count: tables.length,
          generated_by: 'Flash ERP Portable Backup Engine'
        },
        tables: {}
      };

      for (const table of tables) {
        this.logger.log(`Extracting data from table: ${table}...`);
        const dataRes = await client.query(`SELECT * FROM "${table}"`);
        backupData.tables[table] = dataRes.rows;
      }

      this.logger.log('Extraction complete. Saving to temporary file...');
      fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2));

      const fileContent = fs.readFileSync(backupPath);
      const s3Client = new S3Client({
        endpoint: R2_ENDPOINT,
        region: 'auto',
        credentials: {
          accessKeyId: R2_ACCESS_KEY_ID,
          secretAccessKey: R2_SECRET_ACCESS_KEY,
        },
      });

      this.logger.log(`Uploading ${backupFilename} to Cloudflare R2...`);
      await s3Client.send(
        new PutObjectCommand({
          Bucket: R2_BUCKET_NAME,
          Key: `db-backups/${backupFilename}`,
          Body: fileContent,
          ContentType: 'application/json',
        }),
      );
      this.logger.log('Upload to Cloudflare R2 successful.');

    } catch (error) {
      this.logger.error(`Backup failed: ${error.message}`);
      throw error;
    } finally {
      await client.end().catch(e => this.logger.error(`Failed to close db client: ${e.message}`));
      if (fs.existsSync(backupPath)) {
        fs.unlinkSync(backupPath);
        this.logger.log('Temporary local file cleaned up.');
      }
    }
  }
}
