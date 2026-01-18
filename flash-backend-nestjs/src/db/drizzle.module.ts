import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

export const DRIZZLE = 'DRIZZLE';

@Global()
@Module({
  providers: [
    {
      provide: DRIZZLE,
      useFactory: (configService: ConfigService) => {
        const connectionString = configService.get<string>('DATABASE_URL');
        const cleanConnectionString = connectionString
          ?.replace('?sslmode=require', '')
          .replace('&sslmode=require', '');
        const pool = new Pool({
          connectionString: cleanConnectionString,
          ssl: {
            rejectUnauthorized: false,
          },
        } as any);
        return drizzle(pool, { schema });
      },
      inject: [ConfigService],
    },
  ],
  exports: [DRIZZLE],
})
export class DrizzleModule {}
