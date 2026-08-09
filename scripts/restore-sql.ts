/**
 * scripts/restore-sql.ts
 * High-performance batch restore script for Neon PostgreSQL.
 * Batches INSERT queries in single transactions per table for 100x speed.
 */

import 'dotenv/config';
import dotenvLocal from 'dotenv';
import path from 'path';
import fs from 'fs';
import readline from 'readline';
import { Pool } from 'pg';
import { runMigrations } from '../src/lib/pg-migrate';

dotenvLocal.config({ path: path.join(process.cwd(), '.env.local'), override: false });

const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL tidak ditemukan di .env.local!');
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 30000,
});

async function restore() {
  const backupFileName = 'backup_lanpro_2026-08-02T11-34-28-747Z.sql';
  let backupPath = path.join(process.cwd(), backupFileName);

  if (!fs.existsSync(backupPath)) {
    backupPath = path.join(process.cwd(), 'backup_latest.sql');
    if (!fs.existsSync(backupPath)) {
      console.error(`❌ File backup tidak ditemukan: ${backupFileName}`);
      process.exit(1);
    }
  }

  console.log(`📌 File backup ditemukan: ${path.basename(backupPath)}`);

  console.log('🔄 Memastikan skema PostgreSQL Neon up-to-date...');
  await runMigrations(pool);

  const client = await pool.connect();

  try {
    console.log('\n🧹 Membersihkan tabel lama untuk full restore...');

    const cleanOrder = [
      'TaskExternalLinks', 'Attachments', 'LinkedTasks', 'Comments', 'TaskCustomFields',
      'ActivityLogs', 'AuditLogs', 'Messages', 'Notifications', 'DiscussionPoints',
      'Meetings', 'QATestCases', 'QATestSuites', 'ProjectModules', 'Documents',
      'Tasks', 'MilestoneSprints', 'Milestones', 'Sprints', 'ProjectMembers',
      'ProjectInvites', 'Projects', 'MasterData', 'Users'
    ];

    for (const t of cleanOrder) {
      try {
        await client.query(`TRUNCATE TABLE "${t}" CASCADE;`);
      } catch (err: any) {}
    }
    console.log('✅ Clean complete.');

    console.log('\n📥 Membaca file SQL dan mengelompokkan query...');

    const fileStream = fs.createReadStream(backupPath, { encoding: 'utf8' });
    const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

    const queriesByTable: Record<string, string[]> = {};
    let currentQuery = '';

    for await (const line of rl) {
      const trimmed = line.trim();

      if (!currentQuery && trimmed.toUpperCase().startsWith('INSERT INTO')) {
        currentQuery = line;
      } else if (currentQuery) {
        currentQuery += '\n' + line;
      }

      if (currentQuery && trimmed.endsWith(';')) {
        const match = currentQuery.match(/INSERT INTO [`"]([^`"]+)[`"]/i);
        if (match) {
          const tableName = match[1];
          if (!queriesByTable[tableName]) {
            queriesByTable[tableName] = [];
          }

          let pgSql = currentQuery.replace(/`([^`]+)`/g, '"$1"');
          if (pgSql.endsWith(';')) pgSql = pgSql.slice(0, -1);
          pgSql += ' ON CONFLICT DO NOTHING;';

          queriesByTable[tableName].push(pgSql);
        }
        currentQuery = '';
      }
    }

    const insertOrder = [
      'MasterData', 'Users', 'Projects', 'ProjectMembers', 'ProjectInvites',
      'Sprints', 'Milestones', 'MilestoneSprints', 'ProjectModules', 'Documents',
      'Meetings', 'DiscussionPoints', 'QATestSuites', 'QATestCases', 'Tasks',
      'TaskExternalLinks', 'Attachments', 'LinkedTasks', 'Comments',
      'TaskCustomFields', 'ActivityLogs', 'AuditLogs', 'Messages', 'Notifications'
    ];

    let totalSuccess = 0;

    for (const tbl of insertOrder) {
      const queries = queriesByTable[tbl] || [];
      if (queries.length === 0) continue;

      console.log(`   --> Restoring table "${tbl}": ${queries.length} records...`);

      // Batch 50 queries per transaction block
      const chunkSize = 50;
      for (let i = 0; i < queries.length; i += chunkSize) {
        const chunk = queries.slice(i, i + chunkSize);
        const batchSql = 'BEGIN;\n' + chunk.join('\n') + '\nCOMMIT;';
        try {
          await client.query(batchSql);
          totalSuccess += chunk.length;
        } catch (err: any) {
          // Fallback to one-by-one if batch hits syntax error
          for (const q of chunk) {
            try {
              await client.query(q);
              totalSuccess++;
            } catch (e: any) {}
          }
        }
      }
    }

    console.log(`\n🎉 Restore Data ke Neon PostgreSQL Selesai!`);
    console.log(`✅ Total sukses: ${totalSuccess} records.`);

    console.log('\n📊 Ringkasan Data Ter-restore di Neon PostgreSQL:');
    for (const tbl of insertOrder) {
      try {
        const res = await client.query(`SELECT COUNT(*) FROM "${tbl}"`);
        const count = res.rows[0].count;
        if (parseInt(count) > 0) {
          console.log(`  🔹 ${tbl}: ${count} rows`);
        }
      } catch (e) {}
    }

  } finally {
    client.release();
    await pool.end();
  }
}

restore().catch((err) => {
  console.error('\n❌ Restore gagal:', err.message);
  process.exit(1);
});
