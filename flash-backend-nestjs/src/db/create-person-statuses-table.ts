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

const initialStatuses = [
  'Army',
  'Navy',
  'PAF',
  'Police',
  'FC',
  'MJD',
  'Civil',
  'ASP',
];

async function createPersonStatusesTable() {
  console.log('Creating person_statuses table...');
  
  try {
    // Create table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS person_statuses (
        id SERIAL PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    console.log('✓ person_statuses table created');

    // Seed initial data
    console.log('Seeding initial person statuses...');
    for (const statusName of initialStatuses) {
      try {
        await db.insert(schema.personStatuses).values({ name: statusName });
        console.log(`  ✓ Added: ${statusName}`);
      } catch (error: any) {
        if (error.code === '23505') {
          // Unique constraint violation - status already exists
          console.log(`  - Skipped (already exists): ${statusName}`);
        } else {
          throw error;
        }
      }
    }
    
    console.log('✓ Successfully created and seeded person_statuses table');
  } catch (error) {
    console.error('Error:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

createPersonStatusesTable().catch(console.error);
