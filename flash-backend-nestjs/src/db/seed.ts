import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as bcrypt from 'bcryptjs';
import * as schema from './schema';
import { eq } from 'drizzle-orm';

async function main() {
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

  try {
    const adminEmail = 'admin@flash.com';

    const existingUsers = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, adminEmail));

    if (existingUsers.length === 0) {
      const passwordHash = await bcrypt.hash('password123', 10);

      const [user] = await db
        .insert(schema.users)
        .values({
          email: adminEmail,
          password: passwordHash,
          full_name: 'Admin User',
          is_admin: true,
          is_active: true,
        })
        .returning();

      console.log('Seeded admin user with id:', user.id);
    } else {
      console.log('Admin user already exists, skipping user seed');
    }
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error('Error running seed:', err);
  process.exit(1);
});
