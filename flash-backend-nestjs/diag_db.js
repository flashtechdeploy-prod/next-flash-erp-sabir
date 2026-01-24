import 'dotenv/config';
import fs from 'fs';
import { parse } from 'csv-parse/sync';
import { Pool } from 'pg';

async function main() {
  const csvPath = 'c:/Users/HomePC/Downloads/erp-fls/data - Sheet1.csv';
  const csvContent = fs.readFileSync(csvPath, 'utf8');
  const records = parse(csvContent, { columns: false, skip_empty_lines: true });

  console.log('--- FIRST 5 ROWS ---');
  for (let i = 0; i < 5; i++) {
    console.log(`Row ${i}:`, JSON.stringify(records[i].slice(0, 5)));
  }

  console.log('Testing DB Connection for:', process.env.DATABASE_URL?.substring(0, 20) + '...');
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  try {
    const res = await pool.query('SELECT 1');
    console.log('DB Connection: SUCCESS');
  } catch (err) {
    console.error('DB Connection: FAILED', err.code, err.message);
  }
  await pool.end();
}

main().catch(console.error);
