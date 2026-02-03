import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';
import { sql } from 'drizzle-orm';
import * as dotenv from 'dotenv';
import { join } from 'path';

dotenv.config({ path: join(__dirname, '../../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const db = drizzle(pool, { schema });

async function addPersonStatusColumn() {
  console.log('Adding person_status column to employees table...');
  
  try {
    await db.execute(sql`
      ALTER TABLE employees 
      ADD COLUMN IF NOT EXISTS person_status TEXT
    `);
    
    console.log('✓ Successfully added person_status column to employees table');
  } catch (error) {
    console.error('Error adding column:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

addPersonStatusColumn().catch(console.error);
