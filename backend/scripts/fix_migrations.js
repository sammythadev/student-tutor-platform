const { Pool } = require('pg');
const fs = require('fs');
const crypto = require('crypto');

const pool = new Pool({
  connectionString: 'postgresql://postgres:1234@localhost:5432/tutorly'
});

async function fixMigrations() {
  const client = await pool.connect();
  try {
    // 1. Recreate the __drizzle_migrations table in case it was dropped
    await client.query(`
      CREATE SCHEMA IF NOT EXISTS drizzle;
      CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (
        id SERIAL PRIMARY KEY,
        hash text NOT NULL,
        created_at bigint
      );
    `);

    // 2. Clear it to start fresh
    await client.query(`TRUNCATE TABLE drizzle.__drizzle_migrations`);

    // 3. Get all migration files
    const files = fs.readdirSync('./drizzle')
      .filter(f => f.endsWith('.sql'))
      .sort();

    // 4. Hash and insert them
    for (const file of files) {
      const sql = fs.readFileSync(`./drizzle/${file}`, 'utf8');
      const hash = crypto.createHash('sha256').update(sql).digest('hex');
      
      await client.query(
        `INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES ($1, $2)`,
        [hash, Date.now()]
      );
      console.log(`Marked ${file} as applied (hash: ${hash})`);
    }

    console.log('\nMigration state fixed! You can now run `npm run db:migrate` without errors.');
  } catch (err) {
    console.error('Error fixing migrations:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

fixMigrations();
