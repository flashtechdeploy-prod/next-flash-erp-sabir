import { Pool } from 'pg';
import * as dotenv from 'dotenv';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
dotenv.config();

async function main() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    const clientCount = await pool.query('SELECT COUNT(*) FROM clients');
    const siteCount = await pool.query('SELECT COUNT(*) FROM client_sites');
    console.log(`\n--- DB COUNTS ---`);
    console.log(`Clients: ${clientCount.rows[0].count}`);
    console.log(`Sites: ${siteCount.rows[0].count}`);
    
    console.log(`\n--- SAMPLE SITES (with Guard counts) ---`);
    const samples = await pool.query(`
      SELECT s.name as site_name, s.guards_required, c.name as client_name 
      FROM client_sites s 
      JOIN clients c ON s.client_id = c.id 
      LIMIT 10
    `);
    console.table(samples.rows);

  } catch (err) {
    console.error('Check failed:', err.message);
  } finally {
    await pool.end();
  }
}

main();
