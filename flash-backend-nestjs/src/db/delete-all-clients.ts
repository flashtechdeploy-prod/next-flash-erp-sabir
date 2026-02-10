process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
import 'dotenv/config';
import { Pool } from 'pg';

async function main() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  try {
    await pool.query('DELETE FROM client_sites');
    await pool.query('DELETE FROM clients');
    console.log('All client and site data deleted.');
  } catch (err) {
    console.error('Error deleting data:', err);
  } finally {
    await pool.end();
  }
}

main();
