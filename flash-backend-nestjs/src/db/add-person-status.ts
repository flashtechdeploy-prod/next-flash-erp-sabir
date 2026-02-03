import { drizzle } from 'drizzle-orm/postgres-js';
// @ts-ignore
import postgres from 'postgres';

import * as dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('DATABASE_URL not found in environment variables');
  process.exit(1);
}

const client = postgres(connectionString);
const db = drizzle(client);

async function addPersonStatusColumn() {
  try {
    console.log('Adding person_status column to employees table...');
    
    await client`
      ALTER TABLE employees 
      ADD COLUMN IF NOT EXISTS person_status TEXT
    `;
    
    console.log('✓ Successfully added person_status column');
  } catch (error) {
    console.error('Error adding column:', error);
  } finally {
    await client.end();
  }
}

addPersonStatusColumn();
