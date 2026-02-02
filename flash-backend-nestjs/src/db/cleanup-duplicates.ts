import { Client } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

async function cleanup() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    console.log('Connected to database');

    const tables = ['vehicle_categories', 'industries', 'vehicle_types'];

    for (const table of tables) {
      console.log(`Checking table: ${table}`);
      
      // Check if table exists first
      const tableExists = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = $1
        );
      `, [table]);

      if (!tableExists.rows[0].exists) {
        console.log(`Table ${table} does not exist, skipping.`);
        continue;
      }

      // Find duplicates
      const dups = await client.query(`
        SELECT name, COUNT(*)
        FROM ${table}
        GROUP BY name
        HAVING COUNT(*) > 1;
      `);

      if (dups.rows.length > 0) {
        console.log(`Found ${dups.rows.length} duplicate names in ${table}. Cleaning up...`);
        const deleteQuery = `
          DELETE FROM ${table}
          WHERE id NOT IN (
            SELECT MIN(id)
            FROM ${table}
            GROUP BY name
          );
        `;
        const res = await client.query(deleteQuery);
        console.log(`Deleted ${res.rowCount} duplicate rows from ${table}.`);
      } else {
        console.log(`No duplicates found in ${table}.`);
      }
      const data = await client.query(`SELECT * FROM ${table}`);
      console.log(`Data in ${table}:`, JSON.stringify(data.rows, null, 2));
    }

    // Fix orphan records in inventory tables
    console.log('Checking for orphan inventory records...');
    const orphanTasks = [
      {
        table: 'general_inventory_transactions',
        childCol: 'item_code',
        parentTable: 'general_inventory_items',
        parentCol: 'item_code'
      },
      {
        table: 'restricted_serial_units',
        childCol: 'item_code',
        parentTable: 'restricted_inventory_items',
        parentCol: 'item_code'
      },
      {
        table: 'restricted_transactions',
        childCol: 'item_code',
        parentTable: 'restricted_inventory_items',
        parentCol: 'item_code'
      },
      {
        table: 'employee_files',
        childCol: 'employee_id',
        parentTable: 'employees',
        parentCol: 'employee_id'
      },
      {
        table: 'attendance',
        childCol: 'employee_id',
        parentTable: 'employees',
        parentCol: 'employee_id'
      },
      {
        table: 'leave_periods',
        childCol: 'employee_id',
        parentTable: 'employees',
        parentCol: 'employee_id'
      },
      {
        table: 'payroll_payment_status',
        childCol: 'employee_id',
        parentTable: 'employees',
        parentCol: 'employee_id'
      },
      {
        table: 'employee_advances',
        childCol: 'employee_db_id',
        parentTable: 'employees',
        parentCol: 'id'
      },
      {
        table: 'employee_advance_deductions',
        childCol: 'employee_db_id',
        parentTable: 'employees',
        parentCol: 'id'
      },
      {
        table: 'payroll_sheet_entries',
        childCol: 'employee_db_id',
        parentTable: 'employees',
        parentCol: 'id'
      },
      {
        table: 'client_contacts',
        childCol: 'client_id',
        parentTable: 'clients',
        parentCol: 'id'
      },
      {
        table: 'client_addresses',
        childCol: 'client_id',
        parentTable: 'clients',
        parentCol: 'id'
      },
      {
        table: 'client_sites',
        childCol: 'client_id',
        parentTable: 'clients',
        parentCol: 'id'
      },
      {
        table: 'client_contracts',
        childCol: 'client_id',
        parentTable: 'clients',
        parentCol: 'id'
      },
      {
        table: 'site_guard_assignments',
        childCol: 'site_id',
        parentTable: 'client_sites',
        parentCol: 'id'
      }
    ];

    for (const task of orphanTasks) {
      // Check if both tables exist
      const tableCheck = await client.query(`
        SELECT COUNT(*) as count FROM information_schema.tables 
        WHERE table_name IN ($1, $2);
      `, [task.table, task.parentTable]);

      if (parseInt(tableCheck.rows[0].count) < 2) {
        console.log(`Skipping orphan check for ${task.table} -> ${task.parentTable} because one of them is missing.`);
        continue;
      }

      const orphans = await client.query(`
        SELECT COUNT(*) FROM ${task.table} t
        WHERE t.${task.childCol} NOT IN (SELECT ${task.parentCol} FROM ${task.parentTable});
      `);
      
      const count = parseInt(orphans.rows[0].count);
      if (count > 0) {
        console.log(`Found ${count} orphan records in ${task.table}. Deleting...`);
        await client.query(`
          DELETE FROM ${task.table} t
          WHERE t.${task.childCol} NOT IN (SELECT ${task.parentCol} FROM ${task.parentTable});
        `);
      } else {
        console.log(`No orphan records in ${task.table}.`);
      }
    }

    console.log('Cleanup successful');
  } catch (err) {
    console.error('Cleanup failed:', err);
  } finally {
    await client.end();
  }
}

cleanup();
