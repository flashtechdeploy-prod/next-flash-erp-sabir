import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';
import { eq } from 'drizzle-orm';
import * as csv from 'csv-parse/sync';

async function updateMainNumberFromSalaryCSV() {
  try {
    console.log('Starting update of main_number from Salary CSV...');

    // Initialize database connection
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

    // Read CSV file
    const csvPath = path.join(process.cwd(), '..', '..', 'Salary Data (1) - Sheet.csv');
    
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
    let skipped = 0;

    for (const record of records) {
      const fssNo = record['FSS No.']?.trim();
      const mobileNumber = record['Mobile Number']?.trim();

      if (!fssNo || !mobileNumber) {
        skipped++;
        continue;
      }

      try {
        // Find employee by FSS number
        const employee = await db
          .select()
          .from(schema.employees)
          .where(eq(schema.employees.fss_no, fssNo))
          .limit(1);

        if (employee && employee.length > 0) {
          // Update main_number
          await db
            .update(schema.employees)
            .set({ main_number: mobileNumber })
            .where(eq(schema.employees.fss_no, fssNo));

          updated++;
          console.log(
            `✓ Updated FSS ${fssNo} - Main Number: ${mobileNumber}`,
          );
        } else {
          notFound++;
          console.warn(`✗ Employee not found for FSS: ${fssNo}`);
        }
      } catch (error) {
        console.error(
          `Error updating FSS ${fssNo}:`,
          error instanceof Error ? error.message : error,
        );
      }
    }

    console.log('\n=== Update Summary ===');
    console.log(`Total Records in CSV: ${records.length}`);
    console.log(`Successfully Updated: ${updated}`);
    console.log(`Not Found in DB: ${notFound}`);
    console.log(`Skipped (Missing Data): ${skipped}`);
    console.log('=====================\n');

    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

updateMainNumberFromSalaryCSV();
