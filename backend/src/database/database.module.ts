import { Global, Module } from '@nestjs/common';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { getDatabaseUrl } from '@config';
import { DATABASE } from './database.constants';
import * as schema from './schema';

@Global()
@Module({
  providers: [
    {
      provide: DATABASE,
      useFactory: () => {
        const pool = new Pool({ connectionString: getDatabaseUrl() });
        return drizzle(pool, { schema });
      },
    },
  ],
  exports: [DATABASE],
})
export class DatabaseModule {}
