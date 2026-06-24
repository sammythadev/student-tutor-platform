const { Pool } = require('pg');

const pool = new Pool({ connectionString: 'postgresql://postgres:1234@localhost:5432/tutorly' });

const statements = [
  // Step 1: Add enum value (must be in its own transaction commit before use)
  null, // handled separately
  `CREATE TABLE IF NOT EXISTS messages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    sender_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    receiver_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content text NOT NULL,
    read_at timestamptz,
    created_at timestamptz DEFAULT now() NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS messages_sender_receiver_idx ON messages USING btree (sender_id, receiver_id)`,
  `CREATE INDEX IF NOT EXISTS messages_receiver_read_idx ON messages USING btree (receiver_id, read_at)`,
  `ALTER TABLE sessions ALTER COLUMN status SET DEFAULT 'pending'`,
  `ALTER TABLE sessions ADD COLUMN IF NOT EXISTS initiator_id uuid REFERENCES users(id) ON DELETE SET NULL`,
  `ALTER TABLE tutor_profiles ADD COLUMN IF NOT EXISTS is_verified integer DEFAULT 0 NOT NULL`,
];

async function run() {
  const client = await pool.connect();
  try {
    // Add enum value — must be outside explicit transactions
    try {
      await client.query(`ALTER TYPE session_status ADD VALUE IF NOT EXISTS 'pending' BEFORE 'upcoming'`);
      console.log('OK: enum pending added');
    } catch (e) {
      console.log('SKIP enum:', e.message.slice(0, 80));
    }

    for (const stmt of statements.filter(Boolean)) {
      try {
        await client.query(stmt);
        console.log('OK:', stmt.trim().slice(0, 60));
      } catch (e) {
        console.log('SKIP:', e.message.slice(0, 80));
      }
    }
  } finally {
    client.release();
    await pool.end();
    console.log('Migration complete.');
  }
}

run().catch(console.error);
