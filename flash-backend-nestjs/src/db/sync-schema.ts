import { Client } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.join(__dirname, '../../.env') });

async function syncSchema() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL is not set in environment variables');
    process.exit(1);
  }

  const client = new Client({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Successfully connected to the database');

    const queries = [
      // Sync Employees table: Add password field for mobile login and metadata
      `ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "password" text;`,
      `ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now();`,
      `ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now();`,
      
      // Sync Attendance table: Add GPS location, selfie picture, and updated_at timestamp
      `ALTER TABLE "attendance" ADD COLUMN IF NOT EXISTS "location" text;`,
      `ALTER TABLE "attendance" ADD COLUMN IF NOT EXISTS "picture" text;`,
      `ALTER TABLE "attendance" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now();`,
    ];

    for (const query of queries) {
      console.log(`Executing: ${query}`);
      await client.query(query);
    }

    console.log('✅ Database schema sync completed successfully');
  } catch (err) {
    console.error('❌ Schema sync failed:', err);
  } finally {
    await client.end();
  }
}

syncSchema();
