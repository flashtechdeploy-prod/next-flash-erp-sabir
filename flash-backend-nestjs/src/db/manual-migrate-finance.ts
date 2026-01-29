import { pgTable, text, serial, real, timestamp, integer, boolean } from 'drizzle-orm/pg-core';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Client } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

async function migrate() {
  await client.connect();
  const db = drizzle(client);

  console.log('Running manual migration for finance table updates...');

  try {
    // Add columns to expenses
    await client.query(`ALTER TABLE expenses ADD COLUMN IF NOT EXISTS reference TEXT;`);
    
    // Add columns to finance_journal_entries
    await client.query(`ALTER TABLE finance_journal_entries ADD COLUMN IF NOT EXISTS entry_type TEXT DEFAULT 'journal';`);
    await client.query(`ALTER TABLE finance_journal_entries ADD COLUMN IF NOT EXISTS amount REAL DEFAULT 0;`);
    await client.query(`ALTER TABLE finance_journal_entries ADD COLUMN IF NOT EXISTS reference TEXT;`);
    await client.query(`ALTER TABLE finance_journal_entries ADD COLUMN IF NOT EXISTS category TEXT;`);

    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await client.end();
  }
}

migrate();
