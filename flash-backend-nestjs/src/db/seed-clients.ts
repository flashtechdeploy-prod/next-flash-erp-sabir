process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
import 'dotenv/config';
import fs from 'fs/promises';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

import { clients } from './schema/clients';

async function main() {
  const csvPath = path.resolve(__dirname, '../../../clinet_data.csv');
  console.log(`[INFO] Reading CSV from: ${csvPath}`);
  const csvContent = await fs.readFile(csvPath, 'utf8');
  const records: string[][] = parse(csvContent, { columns: false, skip_empty_lines: true });
  console.log(`[INFO] Parsed ${records.length} records from CSV.`);

  // Setup DB
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
    // ssl: { rejectUnauthorized: false },
  });
  const db = drizzle(pool);

  // Data starts at Row 3 (index 2)
  let insertedClients = 0;
  let insertedSites = 0;
  const clientMap = new Map(); // clientName -> {id, empCount}

  for (let i = 2; i < records.length; i++) {
    const row = records[i];
    const srNo = row[0]?.trim();
    const empCount = row[1]?.trim();
    const raw = row[2]?.trim();
    if (!srNo || !empCount || !raw || isNaN(Number(empCount))) continue;

    // Parse client and site name
    let clientName = raw;
    let siteName = null;
    const parenIdx = raw.indexOf('(');
    if (parenIdx !== -1) {
      clientName = raw.slice(0, parenIdx).trim();
      siteName = raw.slice(parenIdx + 1, raw.lastIndexOf(')')).trim();
    }

    // Use clientName as key for deduplication
    let clientRow = clientMap.get(clientName);
    if (!clientRow) {
      const client_id = `FSC-${String(clientMap.size + 1).padStart(2, '0')}`;
      const notes = `Employee count: ${empCount}`;
      try {
        await pool.query(
          'INSERT INTO clients (client_id, name, notes) VALUES ($1, $2, $3) ON CONFLICT (client_id) DO NOTHING',
          [client_id, clientName, notes]
        );
        const res = await pool.query('SELECT id FROM clients WHERE client_id = $1', [client_id]);
        clientRow = res.rows[0];
        clientRow.empCount = Number(empCount);
        clientRow.client_id = client_id;
        clientMap.set(clientName, clientRow);
        insertedClients++;
      } catch (err: any) {
        console.error(`[ERROR] Failed to insert client: ${clientName}`, err.message);
        continue;
      }
    } else {
      // If client already exists, increment employee count in notes
      clientRow.empCount += Number(empCount);
      await pool.query('UPDATE clients SET notes = $1 WHERE id = $2', [`Employee count: ${clientRow.empCount}`, clientRow.id]);
    }

    // Insert site if siteName exists
    if (siteName && clientRow && clientRow.id) {
      try {
        await pool.query(
          'INSERT INTO client_sites (client_id, name) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [clientRow.id, siteName]
        );
        insertedSites++;
      } catch (err: any) {
        console.error(`[ERROR] Failed to insert site: ${siteName} for client: ${clientName}`, err.message);
      }
    }
  }
  console.log(`[SUMMARY] Inserted ${insertedClients} clients and ${insertedSites} sites.`);
  await pool.end();
}

main().catch(err => {
  console.error('[FATAL ERROR]', err);
  process.exit(1);
});
