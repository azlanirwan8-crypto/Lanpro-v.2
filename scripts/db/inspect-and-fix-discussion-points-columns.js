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

async function inspectAndFix() {
  try {
    await client.connect();
    console.log('Successfully connected to Neon Postgres!');

    // 1. Inspect existing columns in DiscussionPoints
    const res = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'DiscussionPoints' OR table_name = 'discussionpoints';
    `);

    console.log('\n=== EXISTING COLUMNS IN Neon Postgres DiscussionPoints ===');
    console.table(res.rows);

    // 2. Ensure all column variants exist (both lowercase and camelCase)
    const requiredCols = [
      { name: 'assignto', type: 'VARCHAR(255)' },
      { name: 'assignTo', type: 'VARCHAR(255)' },
      { name: 'assign_to', type: 'VARCHAR(255)' },
      { name: 'assignee_id', type: 'VARCHAR(255)' },
      { name: 'parentpointid', type: 'VARCHAR(255)' },
      { name: 'parent_point_id', type: 'VARCHAR(255)' },
      { name: 'parentPointId', type: 'VARCHAR(255)' },
      { name: 'concern', type: 'TEXT' },
      { name: 'comment', type: 'TEXT' },
      { name: 'keterangan', type: 'TEXT' },
      { name: 'next_action', type: 'TEXT' },
      { name: 'tindakanLanjut', type: 'TEXT' },
      { name: 'tindakan_lanjut', type: 'TEXT' },
      { name: 'fitur', type: 'VARCHAR(255)' },
      { name: 'feature_id', type: 'VARCHAR(255)' },
      { name: 'system', type: 'VARCHAR(255)' },
      { name: 'system_id', type: 'VARCHAR(255)' },
      { name: 'surrounding', type: 'VARCHAR(255)' },
      { name: 'surrounding_id', type: 'VARCHAR(255)' },
      { name: 'targetDate', type: 'VARCHAR(50)' },
      { name: 'target_date', type: 'VARCHAR(50)' },
      { name: 'tanggalUpdateStatus', type: 'VARCHAR(50)' },
      { name: 'status', type: 'VARCHAR(50) DEFAULT \'pending\'' }
    ];

    for (const col of requiredCols) {
      try {
        await client.query(`ALTER TABLE "DiscussionPoints" ADD COLUMN IF NOT EXISTS "${col.name}" ${col.type};`);
        await client.query(`ALTER TABLE "DiscussionPoints" ADD COLUMN IF NOT EXISTS ${col.name} ${col.type};`);
        console.log(`Column ensured: ${col.name}`);
      } catch (e) {
        console.log(`Column note (${col.name}):`, e.message);
      }
    }

    console.log('\n=== RE-INSPECTING COLUMNS AFTER FIX ===');
    const finalRes = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'DiscussionPoints' OR table_name = 'discussionpoints';
    `);
    console.table(finalRes.rows);

  } catch (err) {
    console.error('Inspection error:', err);
  } finally {
    await client.end();
  }
}

inspectAndFix();
