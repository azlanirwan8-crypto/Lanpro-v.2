import path from 'path';
import fs from 'fs';
import readline from 'readline';
import { Pool } from 'pg';
import { runMigrations } from '../src/lib/pg-migrate';

// Parse .env.local manually
const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const idx = trimmed.indexOf('=');
      if (idx > 0) {
        const key = trimmed.slice(0, idx).trim();
        const val = trimmed.slice(idx + 1).trim();
        if (!process.env[key]) process.env[key] = val;
      }
    }
  }
}

const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL missing in .env.local');
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function runFullRestore() {
  console.log('===================================================================');
  console.log('🚀 DEEP ANALYSIS & DATA RESTORATION SCRIPT (Neon PostgreSQL)');
  console.log('===================================================================\n');

  // Step 1: Ensure Schema
  console.log('1️⃣ Running PG Migrations & Schema Check...');
  await runMigrations(pool);

  try {
    const restoredCounts: Record<string, number> = {};

    // Helper for upserting rows safely
    const upsertRow = async (table: string, row: Record<string, any>, conflictCols: string[]) => {
      const keys = Object.keys(row).filter((k) => row[k] !== undefined);
      if (keys.length === 0) return;

      const cols = keys.map((k) => `"${k}"`).join(', ');
      const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
      const conflictTarget = conflictCols.map((c) => `"${c}"`).join(', ');

      const sql = `
        INSERT INTO "${table}" (${cols})
        VALUES (${placeholders})
        ON CONFLICT (${conflictTarget}) DO NOTHING;
      `;

      const values = keys.map((k) => {
        const v = row[k];
        if (v !== null && typeof v === 'object' && !(v instanceof Date)) {
          return JSON.stringify(v);
        }
        return v;
      });

      try {
        await pool.query(sql, values);
        restoredCounts[table] = (restoredCounts[table] || 0) + 1;
      } catch (err: any) {
        // Ignored
      }
    };

    // Step 2: Restore MasterData & Core Entities from local_db.json
    console.log('\n2️⃣ Restoring MasterData (Department, Position/Jabatan, Priority, Status) & Core Entities...');
    const localDbPath = path.join(process.cwd(), 'database', 'local_db.json');
    if (fs.existsSync(localDbPath)) {
      const localDb = JSON.parse(fs.readFileSync(localDbPath, 'utf8'));

      // MasterData (Departments & Jabatan)
      const masterItems: any[] = localDb.MasterData || [];
      for (const m of masterItems) {
        await upsertRow('MasterData', {
          id: m.id,
          type: m.type,
          label: m.label,
          order: m.order ?? 0,
          color: m.color || null,
          icon: m.icon || null,
          description: m.description || null,
          role_type: m.role_type || m.roleType || null,
          createdAt: m.createdAt || new Date().toISOString(),
        }, ['id']);
      }

      // Add Standard MasterData (Priority, Status, Category) if missing
      const standardMaster = [
        { id: 'prio-1', type: 'priority', label: 'Urgent', order: 1 },
        { id: 'prio-2', type: 'priority', label: 'High', order: 2 },
        { id: 'prio-3', type: 'priority', label: 'Medium', order: 3 },
        { id: 'prio-4', type: 'priority', label: 'Low', order: 4 },
        { id: 'stat-1', type: 'status', label: 'To Do', order: 1 },
        { id: 'stat-2', type: 'status', label: 'In Progress', order: 2 },
        { id: 'stat-3', type: 'status', label: 'Code Review', order: 3 },
        { id: 'stat-4', type: 'status', label: 'UAT', order: 4 },
        { id: 'stat-5', type: 'status', label: 'Done', order: 5 },
        { id: 'cat-1', type: 'category', label: 'Frontend', order: 1 },
        { id: 'cat-2', type: 'category', label: 'Backend', order: 2 },
        { id: 'cat-3', type: 'category', label: 'DevOps', order: 3 },
        { id: 'cat-4', type: 'category', label: 'QA', order: 4 },
      ];
      for (const sm of standardMaster) {
        await upsertRow('MasterData', {
          id: sm.id,
          type: sm.type,
          label: sm.label,
          order: sm.order,
          createdAt: new Date().toISOString(),
        }, ['id']);
      }

      // Users
      for (const u of localDb.Users || []) {
        await upsertRow('Users', {
          id: u.id,
          uid: u.uid || u.id,
          username: u.username,
          nama_lengkap: u.nama_lengkap || u.displayName || u.username,
          email: u.email,
          displayName: u.displayName || u.username,
          role: u.role || 'user',
          status: u.status || 'approved',
          passwordHash: 'firebase-auth-placeholder',
          department: u.department || null,
          position: u.position || null,
          phone: u.phone || null,
          createdAt: u.createdAt || new Date().toISOString(),
          updatedAt: u.updatedAt || new Date().toISOString(),
        }, ['id']);
      }

      // Projects
      for (const p of localDb.Projects || []) {
        await upsertRow('Projects', {
          id: p.id,
          name: p.name,
          projectKey: p.projectKey || p.project_key || 'PROJ',
          description: p.description || null,
          ownerId: p.ownerId || null,
          status: p.status || 'Active',
          taskCounter: p.taskCounter || 0,
          createdAt: p.createdAt || new Date().toISOString(),
          updatedAt: p.updatedAt || new Date().toISOString(),
        }, ['id']);
      }

      // ProjectMembers
      for (const m of localDb.ProjectMembers || []) {
        await upsertRow('ProjectMembers', {
          projectId: m.projectId,
          userId: m.userId,
          role: m.role || 'developer',
        }, ['projectId', 'userId']);
      }
    }

    // Ensure 2 Additional Projects from SQL Audit Logs
    const extraProjects = [
      { id: '2SGXiPUTwHnF8D576hfO', name: 'wondr merchant & issue resolution', projectKey: 'WMIR', ownerId: 'rido', status: 'Active' },
      { id: 'zes0sOR02S9VzkjP4UYw', name: 'Personal Channel & Services', projectKey: 'PCS', ownerId: 'Dimas', status: 'Active' },
    ];
    for (const ep of extraProjects) {
      await upsertRow('Projects', {
        id: ep.id,
        name: ep.name,
        projectKey: ep.projectKey,
        ownerId: ep.ownerId,
        status: ep.status,
        taskCounter: 100,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }, ['id']);
    }

    // Additional Users from AuditLogs
    const extraUsers = ['rido', 'Dimas', 'Ribka', 'eri', 'reny', 'rifky', 'dini', 'hendra', 'siti', 'admin-fixed-id'];
    for (const eu of extraUsers) {
      await upsertRow('Users', {
        id: eu,
        uid: eu,
        username: eu === 'admin-fixed-id' ? 'admin-manager' : eu,
        nama_lengkap: eu,
        email: `${eu}@example.com`,
        displayName: eu,
        role: eu === 'admin-fixed-id' ? 'admin' : (eu === 'Dimas' ? 'head' : (eu === 'rido' ? 'manager' : 'user')),
        status: 'approved',
        passwordHash: 'firebase-auth-placeholder',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }, ['id']);

      for (const ep of extraProjects) {
        await upsertRow('ProjectMembers', {
          projectId: ep.id,
          userId: eu,
          role: 'admin',
        }, ['projectId', 'userId']);
      }
    }

    // Step 3: Parse and Execute SQL Backup File (backup_lanpro_2026-08-02T11-34-28-747Z.sql)
    const backupPath = path.join(process.cwd(), 'backup_lanpro_2026-08-02T11-34-28-747Z.sql');
    console.log(`\n3️⃣ Reading & Executing SQL Dump from ${path.basename(backupPath)}...`);

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
      console.log(`   --> Restoring SQL Dump Table "${tbl}": ${queries.length} records...`);
      for (const q of queries) {
        try {
          await pool.query(q);
          restoredCounts[tbl] = (restoredCounts[tbl] || 0) + 1;
        } catch (e: any) {}
      }
    }

    // Step 4: Reconstruct Tasks & Sprints from AuditLogs JSON payloads
    console.log('\n4️⃣ Reconstructing Tasks & Sprints from AuditLogs JSON payloads...');
    const tasksMap = new Map<string, any>();
    const sprintsMap = new Map<string, any>();

    const auditFileStream = fs.createReadStream(backupPath, { encoding: 'utf8' });
    const auditRl = readline.createInterface({ input: auditFileStream, crlfDelay: Infinity });

    for await (const line of auditRl) {
      if (line.includes('INSERT INTO `AuditLogs`')) {
        const matches = line.match(/\{.*?\}/g);
        if (matches) {
          for (const m of matches) {
            try {
              const obj = JSON.parse(m);
              if (obj.id && obj.title && (obj.projectId || obj.taskKey || obj.status)) {
                tasksMap.set(obj.id, obj);
              }
              if (obj.id && obj.name && (obj.startDate || obj.endDate || obj.status)) {
                sprintsMap.set(obj.id, obj);
              }
            } catch (e) {}
          }
        }
      }
    }

    for (const s of sprintsMap.values()) {
      await upsertRow('Sprints', {
        id: s.id,
        projectId: s.projectId || '2SGXiPUTwHnF8D576hfO',
        name: s.name || 'Sprint',
        goal: s.goal || null,
        startDate: s.startDate || null,
        endDate: s.endDate || null,
        status: s.status || 'planned',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }, ['id']);
    }

    let taskIdx = 0;
    for (const t of tasksMap.values()) {
      await upsertRow('Tasks', {
        id: t.id,
        projectId: t.projectId || '2SGXiPUTwHnF8D576hfO',
        sprintId: t.sprintId || null,
        taskKey: t.taskKey || 'TASK-' + taskIdx,
        title: t.title || 'Untitled Task',
        description: t.description || null,
        status: t.status || 'To Do',
        priority: t.priority || 'Medium',
        type: t.type || 'task',
        assigneeId: t.assigneeId || null,
        reporterId: t.reporterId || 'rido',
        projectRisk: t.projectRisk || 'Low',
        storyPoints: t.storyPoints || 0,
        orderIndex: t.orderIndex || 0,
        isBlocked: t.isBlocked ? true : false,
        dueDate: t.dueDate || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }, ['id']);
      taskIdx++;
    }

    // Step 5: Final Report Logs
    console.log('\n===================================================================');
    console.log('📊 FINAL ROW COUNTS IN VERCEL NEON POSTGRESQL:');
    console.log('===================================================================');

    const allTables = [
      'MasterData', 'Users', 'Projects', 'ProjectMembers', 'Sprints', 'Tasks',
      'Comments', 'Notifications', 'Documents', 'ActivityLogs', 'AuditLogs'
    ];

    let totalRows = 0;
    for (const tbl of allTables) {
      try {
        const res = await pool.query(`SELECT COUNT(*) FROM "${tbl}"`);
        const count = parseInt(res.rows[0].count, 10);
        totalRows += count;
        console.log(`  🟢 ${tbl.padEnd(20)}: ${count} rows`);
      } catch (err: any) {
        console.log(`  🔴 ${tbl.padEnd(20)}: Error reading table`);
      }
    }

    console.log('-------------------------------------------------------------------');
    console.log(`🔥 TOTAL DATABASE RECORDS IN NEON POSTGRES: ${totalRows}`);
    console.log('===================================================================\n');

  } finally {
    await pool.end();
  }
}

runFullRestore().catch((err) => {
  console.error('❌ Restore script failed:', err);
  process.exit(1);
});
