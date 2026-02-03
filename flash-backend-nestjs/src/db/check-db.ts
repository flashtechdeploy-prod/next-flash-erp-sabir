import { Client } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

async function checkColumns() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  try {
    await client.connect();
    const res = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'payroll_sheet_entries';
    `);
    console.log('Columns in payroll_sheet_entries:');
    res.rows.forEach(row => console.log(` - ${row.column_name} (${row.data_type})`));
  } catch (err) {
    console.error('Check failed:', err.message);
  } finally {
    await client.end();
  }
}

checkColumns();
