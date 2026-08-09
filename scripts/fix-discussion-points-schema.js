import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;

if (!connectionString) {
  console.error('ERROR: POSTGRES_URL or DATABASE_URL is not set!');
  process.exit(1);
}

console.log('Connecting directly to Vercel Neon Postgres...');
const client = new pg.Client({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

const queries = [
  'ALTER TABLE "DiscussionPoints" ADD COLUMN IF NOT EXISTS "parentpointid" VARCHAR(255);',
  'ALTER TABLE "DiscussionPoints" ADD COLUMN IF NOT EXISTS "parent_point_id" VARCHAR(255);',
  'ALTER TABLE "DiscussionPoints" ADD COLUMN IF NOT EXISTS "concern" TEXT;',
  'ALTER TABLE "DiscussionPoints" ADD COLUMN IF NOT EXISTS "comment" TEXT;',
  'ALTER TABLE "DiscussionPoints" ADD COLUMN IF NOT EXISTS "next_action" TEXT;',
  'ALTER TABLE "DiscussionPoints" ADD COLUMN IF NOT EXISTS "assignee_id" VARCHAR(255);',
  'ALTER TABLE "DiscussionPoints" ADD COLUMN IF NOT EXISTS "feature_id" VARCHAR(255);',
  'ALTER TABLE "DiscussionPoints" ADD COLUMN IF NOT EXISTS "system_id" VARCHAR(255);',
  'ALTER TABLE "DiscussionPoints" ADD COLUMN IF NOT EXISTS "surrounding_id" VARCHAR(255);',
  'ALTER TABLE "DiscussionPoints" ADD COLUMN IF NOT EXISTS "target_date" DATE;',
  'ALTER TABLE "DiscussionPoints" ADD COLUMN IF NOT EXISTS "status" VARCHAR(50) DEFAULT \'PENDING\';'
];

async function runEmergencyMigration() {
  try {
    await client.connect();
    console.log('Successfully connected to Neon Postgres database!');

    for (const q of queries) {
      try {
        console.log(`Executing: ${q}`);
        await client.query(q);
        console.log(' -> SUCCESS');
      } catch (err) {
        console.error(` -> QUERY ERROR (${q}):`, err.message);
      }
    }

    console.log('\n=== EMERGENCY DB MIGRATION FINISHED SUCCESSFULLY ===');
  } catch (error) {
    console.error('Fatal Migration Connection Error:', error);
  } finally {
    await client.end();
  }
}

runEmergencyMigration();
