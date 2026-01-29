import { Client } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

async function migrate() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    console.log('Connected to database');

    const queries = [
      `ALTER TABLE vehicle_assignments ADD COLUMN IF NOT EXISTS from_date TEXT;`,
      `ALTER TABLE vehicle_assignments ADD COLUMN IF NOT EXISTS to_date TEXT;`,
      `ALTER TABLE vehicle_assignments ADD COLUMN IF NOT EXISTS location TEXT;`,
      `ALTER TABLE vehicle_assignments ADD COLUMN IF NOT EXISTS purpose TEXT;`,
    ];

    for (const query of queries) {
      console.log(`Executing: ${query}`);
      await client.query(query);
    }

    console.log('Migration successful');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await client.end();
  }
}

migrate();
