import { Client } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

async function migrateAttendance() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to database');

    const columns = [
      'check_in TEXT',
      'check_in_date TEXT',
      'check_out TEXT', 
      'check_out_date TEXT',
      'check_out_picture TEXT',
      'check_out_location TEXT',
      'overtime_in TEXT',
      'overtime_in_date TEXT',
      'overtime_in_picture TEXT',
      'overtime_in_location TEXT',
      'overtime_out TEXT',
      'overtime_out_date TEXT',
      'overtime_out_picture TEXT',
      'overtime_out_location TEXT'
    ];

    for (const col of columns) {
      const name = col.split(' ')[0];
      try {
        await client.query(`ALTER TABLE attendance ADD COLUMN IF NOT EXISTS ${col}`);
        console.log(`Added column: ${name}`);
      } catch (e: any) {
        console.log(`Column ${name} already exists or error:`, e.message);
      }
    }

    console.log('Attendance migration complete!');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await client.end();
  }
}

migrateAttendance();
