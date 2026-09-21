import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import {
  getDatabaseUrl,
  getMigrationsFolder,
  isDatabaseAutoSeedEnabled,
  isDatabaseAutoSetupEnabled,
  loadEnvironmentFiles,
} from '@config';
import { runCoursesSeed } from './seeds/courses.seed';
import { runNigerianSecondarySeed } from './seeds/nigerian-secondary.seed';

export interface DatabaseSetupResult {
  /** Whether pending migrations were applied. */
  migrated: boolean;
  /** Whether demo data was seeded (requires `DB_AUTO_SEED`). */
  seeded: boolean;
}

/**
 * Applies pending migrations and, when `DB_AUTO_SEED` is set, seeds demo data
 * before the server starts listening.
 *
 * Controlled entirely by environment flags so the same build can auto-provision
 * a fresh local database and still leave production migrations to a deliberate
 * `db:migrate` step:
 *
 * - `DB_AUTO_SETUP=true` — run pending migrations on boot (default: off)
 * - `DB_AUTO_SEED=true`  — also run the demo seeds (default: off; needs the above)
 *
 * Both seeds are idempotent, so running this repeatedly is safe. Callers are
 * responsible for deciding what a failure means; this function rethrows.
 */
export async function runDatabaseSetup(): Promise<DatabaseSetupResult> {
  if (!isDatabaseAutoSetupEnabled()) {
    return { migrated: false, seeded: false };
  }

  // Env files may not have been loaded yet when this runs outside the Nest
  // bootstrap (for example a script), so make DATABASE_URL resolution explicit.
  loadEnvironmentFiles();

  const pool = new Pool({ connectionString: getDatabaseUrl() });

  try {
    const db = drizzle(pool);

    await migrate(db, { migrationsFolder: getMigrationsFolder() });

    if (!isDatabaseAutoSeedEnabled()) {
      return { migrated: true, seeded: false };
    }

    await runNigerianSecondarySeed(db);
    await runCoursesSeed(db);

    return { migrated: true, seeded: true };
  } finally {
    await pool.end();
  }
}
