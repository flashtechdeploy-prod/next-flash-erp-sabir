import 'dotenv/config';
import fs from 'fs/promises';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { Pool } from 'pg';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function main() {
  const csvPath = path.resolve(__dirname, '../../../clinet_data.csv');
  console.log(`[INFO] Reading CSV from: ${csvPath}`);
  
  const csvContent = await fs.readFile(csvPath, 'utf8');
  const records: string[][] = parse(csvContent, { 
    columns: false, 
    skip_empty_lines: true,
    relax_column_count: true 
  });
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  const clientMap = new Map<string, number>(); // Name -> ID
  let clientsCreated = 0;
  let sitesCreated = 0;

  console.log(`[INFO] Processing ${records.length} rows...`);

  // Data starts at Row 5 in the CSV (Sr. No. 1 is line 5)
  // Let's find where "Sr. No." is or just start from a known record
  for (let i = 0; i < records.length; i++) {
    const row = records[i];
    const srNo = row[0]?.trim();
    const empCount = parseInt(row[1]?.trim() || '0');
    const particulars = row[2]?.trim();

    // Skip header and summary rows
    if (!particulars || particulars === 'Particulars' || isNaN(empCount) || empCount === 0 && !particulars.includes('Naveed')) {
       // Note: Row 57 has 0 employees but is a valid site. 
       if (isNaN(empCount) || !srNo || isNaN(parseInt(srNo))) continue;
    }
    if (!srNo || isNaN(parseInt(srNo))) continue;

    // Logic for Client vs Site
    let clientName = particulars;
    let siteName = particulars;
    
    const parenIdx = particulars.indexOf('(');
    if (parenIdx !== -1) {
      clientName = particulars.slice(0, parenIdx).trim();
      siteName = particulars.slice(parenIdx + 1, particulars.lastIndexOf(')')).trim();
      if (!siteName) siteName = particulars; // Fallback
    } else {
      // No parentheses. Check if it's a known client prefix
      // For now, if no parentheses, treat as both or try to split by address if there's a comma
      const commaIdx = particulars.indexOf(',');
      if (commaIdx !== -1 && commaIdx < 30) { // arbitrary limit to avoid splitting long client names
         // clientName might be before comma
      }
    }

    // Normalize Client Name (Optional, but PEL and Petroleum Exploration might be different)
    // Let's just use what's before parenthesis as Client.
    
    try {
      let clientId = clientMap.get(clientName);
      if (!clientId) {
        // Create Client
        const clientRefId = `CLI-${String(clientMap.size + 1).padStart(3, '0')}`;
        const res = await pool.query(
          'INSERT INTO clients (client_id, name, status) VALUES ($1, $2, $3) RETURNING id',
          [clientRefId, clientName, 'active']
        );
        clientId = res.rows[0].id;
        clientMap.set(clientName, clientId);
        clientsCreated++;
      }

      // Create Site
      await pool.query(
        'INSERT INTO client_sites (client_id, name, guards_required, status) VALUES ($1, $2, $3, $4)',
        [clientId, siteName, empCount, 'active']
      );
      sitesCreated++;
      
    } catch (err) {
      console.error(`[ERROR] Failed at row ${i + 1} (${particulars}):`, err.message);
    }
  }

  console.log(`\n[SUCCESS] Summary:`);
  console.log(` - Clients Created/Matched: ${clientsCreated}`);
  console.log(` - Sites Created: ${sitesCreated}`);

  await pool.end();
}

main().catch(console.error);
