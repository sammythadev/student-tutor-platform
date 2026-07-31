import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type * as schema from './schema';

export type AppDatabase = NodePgDatabase<typeof schema>;

/**
 * The transaction handle drizzle hands to a `db.transaction(async (tx) => ...)`
 * callback. Named here so repository helpers that run inside a caller's
 * transaction can declare it instead of restating the structural type.
 */
export type AppTransaction = Parameters<Parameters<AppDatabase['transaction']>[0]>[0];
