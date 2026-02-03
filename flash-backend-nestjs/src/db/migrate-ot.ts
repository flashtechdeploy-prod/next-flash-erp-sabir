import { Client } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config();

async function migrate() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL not found');
    return;
  }

  console.log('Connecting to database...');
  const client = new Client({
    connectionString,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    console.log('Connected. Adding column ot_amount_override to payroll_sheet_entries...');
    
    await client.query(`
      ALTER TABLE payroll_sheet_entries 
      ADD COLUMN IF NOT EXISTS ot_amount_override REAL;
    `);
    
    console.log('Success! Column added.');
  } catch (err) {
    console.error('Migration failed:', err.message);
  } finally {
    await client.end();
  }
}

migrate();
