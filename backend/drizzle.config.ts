import { defineConfig } from 'drizzle-kit';
import { loadEnvironmentFiles } from './src/configs/environment';

loadEnvironmentFiles();

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/database/schema.ts',
  out: './drizzle',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? '',
  },
  migrations: {
    table: '__drizzle_migrations',
    schema: 'public',
  },
  strict: true,
  verbose: true,
});
