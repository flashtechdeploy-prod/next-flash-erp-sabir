import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { Client } from 'pg';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

async function runBackup() {
  const DATABASE_URL = process.env.DATABASE_URL;
  const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
  const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
  const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;
  const R2_ENDPOINT = process.env.R2_ENDPOINT;

  if (!DATABASE_URL || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME || !R2_ENDPOINT) {
    console.error('Required environment variables are not fully defined in .env');
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
    console.log('SAFETY CHECK: Using Portable Node.js Extraction (Read-Only).');
    console.log('Connecting to database...');
    await client.connect();

    console.log('Fetching table list...');
    const tableRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
    `);
    
    const tables = tableRes.rows.map(r => r.table_name);
    console.log(`Found ${tables.length} tables to back up.`);

    const backupData: any = {
      metadata: {
        timestamp,
        tables_count: tables.length,
        engine: 'Node.js Portable Extractor'
      },
      tables: {}
    };

    for (const table of tables) {
      console.log(`Extracting: ${table}...`);
      const dataRes = await client.query(`SELECT * FROM "${table}"`);
      backupData.tables[table] = dataRes.rows;
    }

    console.log('Extraction complete. Saving to temporary file...');
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

    console.log(`Uploading ${backupFilename} to Cloudflare R2...`);
    await s3Client.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: `db-backups/${backupFilename}`,
        Body: fileContent,
        ContentType: 'application/json',
      }),
    );
    console.log('Upload to Cloudflare R2 successful!');

  } catch (error) {
    console.error('Backup failed:', error);
  } finally {
    await client.end().catch(() => {});
    if (fs.existsSync(backupPath)) {
      fs.unlinkSync(backupPath);
      console.log('Temporary local file cleaned up.');
    }
  }
}

runBackup().catch(console.error);
