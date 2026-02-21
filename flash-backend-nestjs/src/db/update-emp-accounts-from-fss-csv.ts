import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq, or } from 'drizzle-orm';
import { Pool } from 'pg';
import * as schema from './schema';
import * as csv from 'csv-parse/sync';

type EmployeeMatch = {
  id: number;
  fss_no: string | null;
  account_number: string | null;
  main_number: string | null;
};

const OVERWRITE_EXISTING = process.env.OVERWRITE_EXISTING === 'true';
const DRY_RUN = process.env.DRY_RUN === 'true';

function isBlank(value: string | null | undefined): boolean {
  return !value || value.trim().length === 0;
}

function normalizeFssCandidates(raw: string): string[] {
  const candidates = new Set<string>();
  const cleaned = raw.trim();
  const noSpaces = cleaned.replace(/\s+/g, '');
  const upper = noSpaces.toUpperCase();

  if (cleaned) candidates.add(cleaned);
  if (noSpaces) candidates.add(noSpaces);
  if (upper) candidates.add(upper);

  if (upper.startsWith('FSS')) {
    const stripped = upper.replace(/^FSS/i, '').trim();
    if (stripped) candidates.add(stripped);
  } else if (/^\d+$/.test(upper)) {
    candidates.add(`FSS${upper}`);
  }

  return Array.from(candidates);
}

async function updateEmpAccountsFromFssCsv() {
  try {
    console.log('Starting employee account/main update from CSV...');

    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL is not set in the environment');
    }

    const cleanConnectionString = connectionString
      .replace('?sslmode=require', '')
      .replace('&sslmode=require', '');

    const pool = new Pool({
      connectionString: cleanConnectionString,
      ssl: {
        rejectUnauthorized: false,
      },
    });

    const db = drizzle(pool, { schema });

    const csvPath = path.join(process.cwd(), '..', 'data - Sheet.csv');
    if (!fs.existsSync(csvPath)) {
      console.error(`CSV file not found at: ${csvPath}`);
      process.exit(1);
    }

    const fileContent = fs.readFileSync(csvPath, 'utf-8');
    const records = csv.parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    console.log(`Loaded ${records.length} records from CSV`);

    let updated = 0;
    let notFound = 0;
    let skippedMissing = 0;
    let alreadySet = 0;
    let conflicts = 0;
    let multiMatch = 0;

    for (const record of records) {
      const fssRaw = String(record['FSS No.'] ?? '').trim();
      const accountNumber = String(record['account_number'] ?? '').trim();
      const mainNumber = String(record['main_number'] ?? '').trim();

      if (!fssRaw) {
        skippedMissing++;
        continue;
      }

      if (!accountNumber && !mainNumber) {
        skippedMissing++;
        continue;
      }

      const candidates = normalizeFssCandidates(fssRaw);
      if (candidates.length === 0) {
        skippedMissing++;
        continue;
      }

      const whereExpr =
        candidates.length === 1
          ? eq(schema.employees.fss_no, candidates[0])
          : or(...candidates.map((candidate) => eq(schema.employees.fss_no, candidate)));

      const matches = await db
        .select({
          id: schema.employees.id,
          fss_no: schema.employees.fss_no,
          account_number: schema.employees.account_number,
          main_number: schema.employees.main_number,
        })
        .from(schema.employees)
        .where(whereExpr);

      if (!matches || matches.length === 0) {
        notFound++;
        console.warn(`✗ Employee not found for FSS: ${fssRaw}`);
        continue;
      }

      if (matches.length > 1) {
        multiMatch++;
        console.warn(`! Multiple employees found for FSS: ${fssRaw} (${matches.length})`);
      }

      for (const match of matches as EmployeeMatch[]) {
        const updatePayload: Partial<Pick<EmployeeMatch, 'account_number' | 'main_number'>> = {};

        if (accountNumber) {
          if (OVERWRITE_EXISTING || isBlank(match.account_number)) {
            updatePayload.account_number = accountNumber;
          } else if (match.account_number?.trim() !== accountNumber) {
            conflicts++;
          }
        }

        if (mainNumber) {
          if (OVERWRITE_EXISTING || isBlank(match.main_number)) {
            updatePayload.main_number = mainNumber;
          } else if (match.main_number?.trim() !== mainNumber) {
            conflicts++;
          }
        }

        if (Object.keys(updatePayload).length === 0) {
          alreadySet++;
          continue;
        }

        if (!DRY_RUN) {
          await db
            .update(schema.employees)
            .set(updatePayload)
            .where(eq(schema.employees.id, match.id));
        }

        updated++;
        const payloadDesc = Object.entries(updatePayload)
          .map(([key, value]) => `${key}=${value}`)
          .join(', ');
        const prefix = DRY_RUN ? '[DRY RUN] ' : '';
        console.log(`${prefix}✓ Updated FSS ${match.fss_no ?? fssRaw} - ${payloadDesc}`);
      }
    }

    console.log('\n=== Update Summary ===');
    console.log(`Total Records in CSV: ${records.length}`);
    console.log(`Successfully Updated: ${updated}`);
    console.log(`Not Found in DB: ${notFound}`);
    console.log(`Skipped (Missing Data): ${skippedMissing}`);
    console.log(`Already Set (No Change): ${alreadySet}`);
    console.log(`Conflicts (Existing Value Differs): ${conflicts}`);
    console.log(`Multiple Matches: ${multiMatch}`);
    console.log(`Overwrite Existing: ${OVERWRITE_EXISTING}`);
    console.log(`Dry Run: ${DRY_RUN}`);
    console.log('====================\n');

    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

updateEmpAccountsFromFssCsv();
