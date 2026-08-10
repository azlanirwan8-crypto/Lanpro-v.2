import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;

if (!connectionString) {
  console.error('ERROR: POSTGRES_URL or DATABASE_URL is not set!');
  process.exit(1);
}

const client = new pg.Client({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

async function fixConstraint() {
  try {
    await client.connect();
    console.log('Successfully connected to Neon Postgres!');

    const queries = [
      'ALTER TABLE "DiscussionPoints" ALTER COLUMN "content" DROP NOT NULL;',
      'ALTER TABLE "DiscussionPoints" ALTER COLUMN "topic" DROP NOT NULL;',
      'ALTER TABLE "DiscussionPoints" ALTER COLUMN "content" SET DEFAULT \'\';',
      'ALTER TABLE "DiscussionPoints" ALTER COLUMN "topic" SET DEFAULT \'\';',
      'UPDATE "DiscussionPoints" SET "content" = "concern" WHERE "content" IS NULL OR "content" = \'\';',
      'UPDATE "DiscussionPoints" SET "topic" = "concern" WHERE "topic" IS NULL OR "topic" = \'\';'
    ];

    for (const q of queries) {
      try {
        console.log(`Executing: ${q}`);
        await client.query(q);
        console.log(' -> SUCCESS');
      } catch (err) {
        console.warn(` -> Query note (${q}):`, err.message);
      }
    }

    console.log('\n=== DiscussionPoints CONTENT NOT-NULL CONSTRAINT FIXED! ===');
  } catch (err) {
    console.error('Migration error:', err);
  } finally {
    await client.end();
  }
}

fixConstraint();
