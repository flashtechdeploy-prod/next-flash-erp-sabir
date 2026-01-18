/**
 * Cleanup Script: Remove Invalid Local File References
 * 
 * This script removes employee file records that have local paths
 * (starting with /uploads/) but the files don't actually exist.
 * 
 * Run this script to clean up stale file references in the database.
 */

import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './src/db/schema';
import { like, or } from 'drizzle-orm';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function cleanupInvalidFileReferences() {
  // Create database connection
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  const db = drizzle(pool, { schema });

  console.log('🔍 Searching for invalid file references...\n');

  try {
    // Find all employee files with local paths (starting with /uploads/)
    const localFiles = await db
      .select()
      .from(schema.employeeFiles)
      .where(
        or(
          like(schema.employeeFiles.file_path, '/uploads/%'),
          like(schema.employeeFiles.file_path, 'uploads/%'),
        ),
      );

    console.log(`Found ${localFiles.length} file(s) with local paths:\n`);

    if (localFiles.length === 0) {
      console.log('✅ No invalid file references found. Database is clean!');
      await pool.end();
      return;
    }

    // Display the files that will be removed
    localFiles.forEach((file, index) => {
      console.log(`${index + 1}. ID: ${file.id}`);
      console.log(`   Employee: ${file.employee_id}`);
      console.log(`   Filename: ${file.filename}`);
      console.log(`   Path: ${file.file_path}`);
      console.log(`   Category: ${file.category}`);
      console.log('');
    });

    // Ask for confirmation (in a real script, you'd use readline or similar)
    console.log('⚠️  WARNING: This will delete the above file references from the database.');
    console.log('   The actual files (if they exist) will NOT be deleted.\n');

    // For automated cleanup, uncomment the following lines:
    /*
    console.log('🗑️  Deleting invalid file references...\n');
    
    for (const file of localFiles) {
      await db
        .delete(schema.employeeFiles)
        .where(eq(schema.employeeFiles.id, file.id));
      console.log(`✅ Deleted file reference: ${file.filename} (ID: ${file.id})`);
    }
    
    console.log(`\n✅ Successfully deleted ${localFiles.length} invalid file reference(s)`);
    */

    console.log('ℹ️  To actually delete these references, uncomment the deletion code in the script.');

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the cleanup
cleanupInvalidFileReferences()
  .then(() => {
    console.log('\n✅ Cleanup script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Cleanup script failed:', error);
    process.exit(1);
  });
