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
      `ALTER TABLE vehicle_maintenance ADD COLUMN IF NOT EXISTS maintenance_type TEXT;`,
      `ALTER TABLE vehicle_maintenance ADD COLUMN IF NOT EXISTS odometer_reading INTEGER;`,
      `ALTER TABLE vehicle_maintenance ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'completed';`,
      `ALTER TABLE vehicle_maintenance ADD COLUMN IF NOT EXISTS notes TEXT;`,
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
