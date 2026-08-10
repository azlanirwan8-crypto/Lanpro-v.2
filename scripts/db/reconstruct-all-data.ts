import path from 'path';
import fs from 'fs';
import readline from 'readline';
import { Pool } from 'pg';

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

async function runReconstruction() {
  console.log('🚀 Reconstructing missing Projects, Tasks & Sprints from AuditLogs...\n');

  const client = await pool.connect();

  try {
    // 1. Ensure the 2 Projects from AuditLogs exist in Projects table
    const projectsToInsert = [
      {
        id: '2SGXiPUTwHnF8D576hfO',
        name: 'wondr merchant & issue resolution',
        projectKey: 'WMIR',
        description: 'Wondr Merchant & Issue Resolution Project',
        ownerId: 'rido',
        status: 'Active',
        taskCounter: 100,
        createdAt: '2026-07-01T00:00:00.000Z',
        updatedAt: '2026-07-31T00:00:00.000Z',
      },
      {
        id: 'zes0sOR02S9VzkjP4UYw',
        name: 'Personal Channel & Services',
        projectKey: 'PCS',
        description: 'Personal Channel & Services Project',
        ownerId: 'Dimas',
        status: 'Active',
        taskCounter: 100,
        createdAt: '2026-07-01T00:00:00.000Z',
        updatedAt: '2026-07-31T00:00:00.000Z',
      },
    ];

    for (const p of projectsToInsert) {
      await client.query(`
        INSERT INTO "Projects" (id, name, "projectKey", description, "ownerId", status, "taskCounter", "createdAt", "updatedAt")
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          "projectKey" = EXCLUDED."projectKey",
          description = EXCLUDED.description;
      `, [p.id, p.name, p.projectKey, p.description, p.ownerId, p.status, p.taskCounter, p.createdAt, p.updatedAt]);
      console.log(`✅ Project "${p.name}" (${p.id}) ensured in Projects table.`);
    }

    // 2. Ensure Users from AuditLogs/ActivityLogs exist in Users & ProjectMembers
    const auditUsers = ['admin-fixed-id', 'rido', 'Ribka', 'Dimas', 'eri', 'reny', 'rifky', 'admin', 'head', 'manager', 'user', 'viewer'];
    for (const u of auditUsers) {
      try {
        await client.query(`
          INSERT INTO "Users" (id, uid, username, nama_lengkap, email, "displayName", role, status, "createdAt", "updatedAt")
          VALUES ($1, $2, $3, $4, $5, $6, 'admin', 'approved', NOW(), NOW())
          ON CONFLICT DO NOTHING;
        `, [u, u, u, u, `${u}@example.com`, u]);
      } catch (e) {}

      for (const p of projectsToInsert) {
        try {
          await client.query(`
            INSERT INTO "ProjectMembers" ("projectId", "userId", role)
            VALUES ($1, $2, 'admin')
            ON CONFLICT DO NOTHING;
          `, [p.id, u]);
        } catch (e) {}
      }

      try {
        await client.query(`
          INSERT INTO "ProjectMembers" ("projectId", "userId", role)
          VALUES ('proj-1', $1, 'admin')
          ON CONFLICT DO NOTHING;
        `, [u]);
      } catch (e) {}
    }
    console.log(`✅ Users & ProjectMembers mapped for all projects.`);

    // 3. Parse AuditLogs SQL to reconstruct all Tasks and Sprints embedded in JSON payloads
    const filePath = path.join(process.cwd(), 'backup_lanpro_2026-08-02T11-34-28-747Z.sql');
    const fileStream = fs.createReadStream(filePath, { encoding: 'utf8' });
    const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

    const tasksMap = new Map<string, any>();
    const sprintsMap = new Map<string, any>();

    for await (const line of rl) {
      if (line.includes('INSERT INTO `AuditLogs`')) {
        // Extract JSON payloads
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

    console.log(`\n🔍 Found ${sprintsMap.size} Sprints and ${tasksMap.size} Tasks embedded in AuditLogs!`);

    // Insert Sprints
    for (const s of sprintsMap.values()) {
      const projId = s.projectId || '2SGXiPUTwHnF8D576hfO';
      await client.query(`
        INSERT INTO "Sprints" (id, "projectId", name, goal, "startDate", "endDate", status, "createdAt", "updatedAt")
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          status = EXCLUDED.status;
      `, [s.id, projId, s.name || 'Sprint', s.goal || null, s.startDate || null, s.endDate || null, s.status || 'planned']);
    }
    console.log(`✅ Reconstructed ${sprintsMap.size} Sprints into Sprints table.`);

    // Insert Tasks
    let taskCount = 0;
    for (const t of tasksMap.values()) {
      const projId = t.projectId || '2SGXiPUTwHnF8D576hfO';
      await client.query(`
        INSERT INTO "Tasks" (
          id, "projectId", "sprintId", "taskKey", title, description, status, priority, type,
          "assigneeId", "reporterId", "projectRisk", "storyPoints", "orderIndex", "isBlocked",
          "dueDate", "createdAt", "updatedAt"
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, NOW(), NOW())
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          status = EXCLUDED.status,
          "assigneeId" = EXCLUDED."assigneeId";
      `, [
        t.id,
        projId,
        t.sprintId || null,
        t.taskKey || 'TASK-' + taskCount,
        t.title || 'Untitled Task',
        t.description || null,
        t.status || 'To Do',
        t.priority || 'Medium',
        t.type || 'task',
        t.assigneeId || null,
        t.reporterId || null,
        t.projectRisk || 'Low',
        t.storyPoints || 0,
        t.orderIndex || 0,
        t.isBlocked ? true : false,
        t.dueDate || null,
      ]);
      taskCount++;
    }
    console.log(`✅ Reconstructed ${taskCount} Tasks into Tasks table.`);

    // 4. Verify Final Project List in Neon
    const resProjects = await client.query('SELECT id, name, "projectKey" FROM "Projects"');
    console.log('\n========================================================');
    console.log('📊 FINAL PROJECTS LIST IN NEON POSTGRESQL:');
    console.log('========================================================');
    console.table(resProjects.rows);

    const resTasks = await client.query('SELECT COUNT(*) FROM "Tasks"');
    console.log(`🔥 TOTAL TASKS ACROSS ALL PROJECTS: ${resTasks.rows[0].count}`);
    console.log('========================================================\n');

  } finally {
    client.release();
    await pool.end();
  }
}

runReconstruction().catch((err) => {
  console.error('❌ Reconstruction error:', err);
  process.exit(1);
});
