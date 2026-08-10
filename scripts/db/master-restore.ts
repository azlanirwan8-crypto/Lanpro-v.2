/**
 * scripts/master-restore.ts
 * Master Restoration Script for LanPro Neon PostgreSQL.
 * Combines both:
 *  1. local_db.json (Core data: Users, Projects, ProjectMembers, Tasks, Sprints, MasterData, etc.)
 *  2. backup_lanpro_2026-08-02T11-34-28-747Z.sql (AuditLogs, ActivityLogs, Attachments, Documents, etc.)
 *
 * Jalankan: npx tsx scripts/master-restore.ts
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

async function upsert(
  client: any,
  table: string,
  row: Record<string, any>,
  conflictCols: string[],
) {
  const keys = Object.keys(row);
  if (keys.length === 0) return;

  const quotedTable = `"${table}"`;
  const cols = keys.map((k) => `"${k}"`).join(', ');
  const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
  const conflictTarget = conflictCols.map((c) => `"${c}"`).join(', ');

  const sql = `
    INSERT INTO ${quotedTable} (${cols})
    VALUES (${placeholders})
    ON CONFLICT (${conflictTarget}) DO NOTHING
  `;

  const values = keys.map((k) => {
    const v = row[k];
    if (v !== null && typeof v === 'object' && !(v instanceof Date)) {
      return JSON.stringify(v);
    }
    return v;
  });

  try {
    await client.query(sql, values);
  } catch (err: any) {
    // Ignored
  }
}

async function masterRestore() {
  console.log('🚀 [SENIOR DBA] Memulai Master Restoration Data LanPro ke Neon PostgreSQL...\n');

  // Step 1: Migration
  console.log('1️⃣ Ensuring Database Schema...');
  await runMigrations(pool);

  const client = await pool.connect();

  try {
    // Step 2: Seed local_db.json
    const localDbPath = path.join(process.cwd(), 'database', 'local_db.json');
    if (fs.existsSync(localDbPath)) {
      console.log('\n2️⃣ Seeding Core Entities from local_db.json...');
      const localDb = JSON.parse(fs.readFileSync(localDbPath, 'utf8'));

      // Users
      const users: any[] = localDb.Users || [];
      console.log(`   --> Users: ${users.length} records`);
      for (const u of users) {
        await upsert(client, 'Users', {
          id: u.id,
          uid: u.uid || u.id,
          username: u.username,
          nama_lengkap: u.nama_lengkap || u.displayName || null,
          email: u.email,
          displayName: u.displayName || null,
          role: u.role || 'user',
          status: u.status || 'approved',
          passwordHash: u.passwordHash || null,
          department: u.department || null,
          position: u.position || null,
          phone: u.phone || null,
          lastSeen: u.lastSeen || null,
          avatarUrl: u.avatarUrl || null,
          photoUrl: u.photoUrl || u.photoURL || null,
          photoURL: u.photoURL || u.photoUrl || null,
          createdAt: u.createdAt || new Date().toISOString(),
          updatedAt: u.updatedAt || new Date().toISOString(),
        }, ['id']);
      }

      // MasterData
      const masterData: any[] = localDb.MasterData || [];
      console.log(`   --> MasterData: ${masterData.length} records`);
      for (const m of masterData) {
        await upsert(client, 'MasterData', {
          id: m.id,
          type: m.type,
          label: m.label,
          order: m.order ?? 0,
          createdAt: m.createdAt || new Date().toISOString(),
        }, ['id']);
      }

      // Projects
      const projects: any[] = localDb.Projects || [];
      console.log(`   --> Projects: ${projects.length} records`);
      for (const p of projects) {
        await upsert(client, 'Projects', {
          id: p.id,
          name: p.name,
          projectKey: p.projectKey || p.project_key || 'PROJ',
          description: p.description || null,
          ownerId: p.ownerId || null,
          status: p.status || 'Active',
          taskCounter: p.taskCounter || 0,
          dashboard_layout: p.dashboard_layout ? JSON.stringify(p.dashboard_layout) : null,
          createdAt: p.createdAt || new Date().toISOString(),
          updatedAt: p.updatedAt || new Date().toISOString(),
        }, ['id']);
      }

      // ProjectMembers
      const members: any[] = localDb.ProjectMembers || [];
      console.log(`   --> ProjectMembers: ${members.length} records`);
      for (const m of members) {
        await upsert(client, 'ProjectMembers', {
          projectId: m.projectId,
          userId: m.userId,
          role: m.role || 'developer',
          parentAdminId: m.parentAdminId || null,
        }, ['projectId', 'userId']);
      }

      // Sprints
      const sprints: any[] = localDb.Sprints || [];
      console.log(`   --> Sprints: ${sprints.length} records`);
      for (const s of sprints) {
        await upsert(client, 'Sprints', {
          id: s.id,
          projectId: s.projectId,
          name: s.name,
          goal: s.goal || null,
          startDate: s.startDate || null,
          endDate: s.endDate || null,
          status: s.status || 'planned',
          createdAt: s.createdAt || new Date().toISOString(),
          updatedAt: s.updatedAt || new Date().toISOString(),
        }, ['id']);
      }

      // Tasks
      const tasks: any[] = localDb.Tasks || [];
      console.log(`   --> Tasks: ${tasks.length} records`);
      for (const t of tasks) {
        await upsert(client, 'Tasks', {
          id: t.id,
          projectId: t.projectId,
          sprintId: t.sprintId || null,
          taskKey: t.taskKey || null,
          title: t.title,
          description: t.description || null,
          status: t.status || 'To Do',
          priority: t.priority || 'Medium',
          type: t.type || 'task',
          assigneeId: t.assigneeId || null,
          assigneeEmail: t.assigneeEmail || null,
          reporterId: t.reporterId || null,
          projectRisk: t.projectRisk || null,
          storyPoints: t.storyPoints || 0,
          orderIndex: t.orderIndex || 0,
          isBlocked: t.isBlocked || false,
          dueDate: t.dueDate || null,
          labels: t.labels ? JSON.stringify(t.labels) : null,
          assignees: t.assignees ? JSON.stringify(t.assignees) : null,
          permissions: t.permissions ? JSON.stringify(t.permissions) : null,
          milestoneId: t.milestoneId || null,
          moduleId: t.moduleId || null,
          linkedEpicId: t.linkedEpicId || null,
          parentTaskId: t.parentTaskId || null,
          version: t.version || 1,
          createdAt: t.createdAt || new Date().toISOString(),
          updatedAt: t.updatedAt || new Date().toISOString(),
        }, ['id']);
      }

      // Comments
      const comments: any[] = localDb.Comments || [];
      console.log(`   --> Comments: ${comments.length} records`);
      for (const c of comments) {
        await upsert(client, 'Comments', {
          id: c.id,
          taskId: c.taskId,
          authorId: c.authorId,
          text: c.text,
          createdAt: c.createdAt || new Date().toISOString(),
          updatedAt: c.updatedAt || new Date().toISOString(),
        }, ['id']);
      }

      // Notifications
      const notifications: any[] = localDb.Notifications || [];
      console.log(`   --> Notifications: ${notifications.length} records`);
      for (const n of notifications) {
        await upsert(client, 'Notifications', {
          id: n.id,
          recipientId: n.recipientId,
          senderId: n.senderId || null,
          title: n.title || null,
          message: n.message || null,
          type: n.type || null,
          relatedId: n.relatedId || null,
          read: n.read || false,
          createdAt: n.createdAt || new Date().toISOString(),
        }, ['id']);
      }

      // Documents
      const documents: any[] = localDb.Documents || [];
      console.log(`   --> Documents: ${documents.length} records`);
      for (const doc of documents) {
        await upsert(client, 'Documents', {
          id: doc.id,
          projectId: doc.projectId,
          title: doc.title,
          description: doc.description || null,
          type: doc.type || null,
          link: doc.link || null,
          createdBy: doc.createdBy || null,
          downloadCount: doc.downloadCount || 0,
          createdAt: doc.createdAt || new Date().toISOString(),
          updatedAt: doc.updatedAt || new Date().toISOString(),
        }, ['id']);
      }
    }

    // Step 3: Parse and restore SQL dump (ActivityLogs, AuditLogs, Attachments, etc.)
    const backupFileName = 'backup_lanpro_2026-08-02T11-34-28-747Z.sql';
    let backupPath = path.join(process.cwd(), backupFileName);
    if (!fs.existsSync(backupPath)) {
      backupPath = path.join(process.cwd(), 'backup_latest.sql');
    }

    if (fs.existsSync(backupPath)) {
      console.log(`\n3️⃣ Restoring SQL Logs & Dump from ${path.basename(backupPath)}...`);

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

      for (const [tbl, queries] of Object.entries(queriesByTable)) {
        console.log(`   --> Restoring table "${tbl}": ${queries.length} records...`);
        const chunkSize = 50;
        for (let i = 0; i < queries.length; i += chunkSize) {
          const chunk = queries.slice(i, i + chunkSize);
          const batchSql = 'BEGIN;\n' + chunk.join('\n') + '\nCOMMIT;';
          try {
            await client.query(batchSql);
          } catch (err: any) {
            for (const q of chunk) {
              try { await client.query(q); } catch (e: any) {}
            }
          }
        }
      }
    }

    // Step 4: Verification Report
    console.log('\n========================================================');
    console.log('📊 SENIOR DBA VERIFICATION REPORT (Neon PostgreSQL)');
    console.log('========================================================');

    const allTables = [
      'Users', 'MasterData', 'Projects', 'ProjectMembers', 'ProjectInvites',
      'Sprints', 'Milestones', 'MilestoneSprints', 'Tasks', 'Comments',
      'Notifications', 'Documents', 'ActivityLogs', 'AuditLogs', 'Attachments',
      'Meetings', 'DiscussionPoints', 'QATestSuites', 'QATestCases', 'ProjectModules'
    ];

    let totalDatabaseRows = 0;
    for (const tbl of allTables) {
      try {
        const res = await client.query(`SELECT COUNT(*) FROM "${tbl}"`);
        const count = parseInt(res.rows[0].count, 10);
        totalDatabaseRows += count;
        console.log(`  🟢 ${tbl.padEnd(20)}: ${count} rows`);
      } catch (err: any) {
        console.log(`  🔴 ${tbl.padEnd(20)}: Error reading table`);
      }
    }

    console.log('--------------------------------------------------------');
    console.log(`🔥 TOTAL DATABASE RECORDS IN NEON POSTGRES: ${totalDatabaseRows}`);
    console.log('========================================================\n');

  } finally {
    client.release();
    await pool.end();
  }
}

masterRestore().catch((err) => {
  console.error('\n❌ Master Restore gagal:', err.message);
  process.exit(1);
});
