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
  main_number: string | null;
};

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

async function syncMainNumberFromCsv() {
  try {
    console.log('Starting main_number sync from CSV...');

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

    let cleared = 0;
    let alreadyClear = 0;
    let notFound = 0;
    let multiMatch = 0;

    for (const record of records) {
      const fssRaw = String(record['FSS No.'] ?? '').trim();
      const mainNumber = String(record['main_number'] ?? '').trim();

      if (!fssRaw) {
        continue;
      }

      // Only process if CSV has blank main_number
      if (!isBlank(mainNumber)) {
        continue;
      }

      const candidates = normalizeFssCandidates(fssRaw);
      if (candidates.length === 0) {
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
          main_number: schema.employees.main_number,
        })
        .from(schema.employees)
        .where(whereExpr);

      if (!matches || matches.length === 0) {
        notFound++;
        continue;
      }

      if (matches.length > 1) {
        multiMatch++;
      }

      for (const match of matches as EmployeeMatch[]) {
        // If DB has main_number but CSV is blank, clear it
        if (!isBlank(match.main_number)) {
          if (!DRY_RUN) {
            await db
              .update(schema.employees)
              .set({ main_number: null })
              .where(eq(schema.employees.id, match.id));
          }
          cleared++;
          const prefix = DRY_RUN ? '[DRY RUN] ' : '';
          console.log(
            `${prefix}✓ Cleared FSS ${match.fss_no ?? fssRaw} main_number (was: ${match.main_number})`
          );
        } else {
          alreadyClear++;
        }
      }
    }

    console.log('\n=== Sync Summary ===');
    console.log(`Total Records in CSV: ${records.length}`);
    console.log(`Main_number Cleared: ${cleared}`);
    console.log(`Already Clear: ${alreadyClear}`);
    console.log(`Not Found in DB: ${notFound}`);
    console.log(`Multiple Matches: ${multiMatch}`);
    console.log(`Dry Run: ${DRY_RUN}`);
    console.log('===================\n');

    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

syncMainNumberFromCsv();
