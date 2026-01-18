require('dotenv/config');

/** @type {import('drizzle-kit').Config} */
module.exports = {
  schema: './src/db/schema/index.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    connectionString: process.env.DATABASE_URL,
  },
};

