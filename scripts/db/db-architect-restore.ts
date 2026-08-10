import path from 'path';
import fs from 'fs';
import readline from 'readline';
import { Pool } from 'pg';
import crypto from 'crypto';

// Manual .env.local parsing
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

const hashPassword = (password: string): string => {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return `pbkdf2$1000$${salt}$${hash}`;
};

async function dbArchitectRestore() {
  console.log('🏛️  [DB ARCHITECT & SYSTEM ANALYST] Memulai Full Data Migration & Alignment...\n');

  const client = await pool.connect();

  try {
    // 1. Full Users Data Alignment (Real Roles & Credentials)
    console.log('1️⃣ Migrating & Aligning Users and Roles...');
    const usersList = [
      {
        id: '1',
        uid: 'admin-uid',
        username: 'admin',
        nama_lengkap: 'Administrator',
        displayName: 'Administrator',
        email: 'admin@example.com',
        role: 'admin',
        status: 'approved',
        department: 'Technology & IT',
        position: 'System Administrator',
        passwordHash: hashPassword('admin'),
      },
      {
        id: '2',
        uid: 'head-uid',
        username: 'head',
        nama_lengkap: 'Siti Rahma (IT Head)',
        displayName: 'Siti Rahma (IT Head)',
        email: 'head@example.com',
        role: 'head',
        status: 'approved',
        department: 'Technology & IT',
        position: 'Software Engineer',
        passwordHash: hashPassword('head'),
      },
      {
        id: '3',
        uid: 'manager-uid',
        username: 'manager',
        nama_lengkap: 'Rian Hidayat (PM)',
        displayName: 'Rian Hidayat (PM)',
        email: 'manager@example.com',
        role: 'manager',
        status: 'approved',
        department: 'Product Management',
        position: 'Project Manager',
        passwordHash: hashPassword('manager'),
      },
      {
        id: '4',
        uid: 'user-uid',
        username: 'user',
        nama_lengkap: 'Budi Santoso (Dev)',
        displayName: 'Budi Santoso (Dev)',
        email: 'user@example.com',
        role: 'user',
        status: 'approved',
        department: 'Technology & IT',
        position: 'Software Engineer',
        passwordHash: hashPassword('user'),
      },
      {
        id: '5',
        uid: 'viewer-uid',
        username: 'viewer',
        nama_lengkap: 'Dewi Lestari (Observer)',
        displayName: 'Dewi Lestari (Observer)',
        email: 'viewer@example.com',
        role: 'viewer',
        status: 'approved',
        department: 'UI & Design',
        position: 'UI/UX Designer',
        passwordHash: hashPassword('viewer'),
      },
      {
        id: 'admin-fixed-id',
        uid: 'admin-fixed-id',
        username: 'admin-manager',
        nama_lengkap: 'Admin Manager',
        displayName: 'Admin Manager',
        email: 'admin.manager@example.com',
        role: 'admin',
        status: 'approved',
        department: 'Technology & IT',
        position: 'Project Manager',
        passwordHash: hashPassword('admin'),
      },
      {
        id: 'rido',
        uid: 'rido',
        username: 'rido',
        nama_lengkap: 'Rido (Lead PM)',
        displayName: 'Rido (Lead PM)',
        email: 'rido@example.com',
        role: 'manager',
        status: 'approved',
        department: 'Product Management',
        position: 'Project Manager',
        passwordHash: hashPassword('rido'),
      },
      {
        id: 'Dimas',
        uid: 'Dimas',
        username: 'Dimas',
        nama_lengkap: 'Dimas (IT Head)',
        displayName: 'Dimas (IT Head)',
        email: 'dimas@example.com',
        role: 'head',
        status: 'approved',
        department: 'Technology & IT',
        position: 'Software Engineer',
        passwordHash: hashPassword('Dimas'),
      },
      {
        id: 'Ribka',
        uid: 'Ribka',
        username: 'Ribka',
        nama_lengkap: 'Ribka (QA Lead)',
        displayName: 'Ribka (QA Lead)',
        email: 'ribka@example.com',
        role: 'user',
        status: 'approved',
        department: 'QA & Systems',
        position: 'QA Engineer',
        passwordHash: hashPassword('Ribka'),
      },
      {
        id: 'eri',
        uid: 'eri',
        username: 'eri',
        nama_lengkap: 'Eri (Backend Dev)',
        displayName: 'Eri (Backend Dev)',
        email: 'eri@example.com',
        role: 'user',
        status: 'approved',
        department: 'Technology & IT',
        position: 'Software Engineer',
        passwordHash: hashPassword('eri'),
      },
      {
        id: 'reny',
        uid: 'reny',
        username: 'reny',
        nama_lengkap: 'Reny (Frontend Dev)',
        displayName: 'Reny (Frontend Dev)',
        email: 'reny@example.com',
        role: 'user',
        status: 'approved',
        department: 'UI & Design',
        position: 'UI/UX Designer',
        passwordHash: hashPassword('reny'),
      },
      {
        id: 'rifky',
        uid: 'rifky',
        username: 'rifky',
        nama_lengkap: 'Rifky (Fullstack Dev)',
        displayName: 'Rifky (Fullstack Dev)',
        email: 'rifky@example.com',
        role: 'user',
        status: 'approved',
        department: 'Technology & IT',
        position: 'Software Engineer',
        passwordHash: hashPassword('rifky'),
      },
      {
        id: 'dini',
        uid: 'dini',
        username: 'dini',
        nama_lengkap: 'Dini Oktavia (SRE)',
        displayName: 'Dini Oktavia (SRE)',
        email: 'dini@example.com',
        role: 'user',
        status: 'approved',
        department: 'Technology & IT',
        position: 'Software Engineer',
        passwordHash: hashPassword('dini'),
      },
      {
        id: 'hendra',
        uid: 'hendra',
        username: 'hendra',
        nama_lengkap: 'Hendra (QA)',
        displayName: 'Hendra (QA)',
        email: 'hendra@example.com',
        role: 'user',
        status: 'approved',
        department: 'QA & Systems',
        position: 'QA Engineer',
        passwordHash: hashPassword('hendra'),
      },
      {
        id: 'siti',
        uid: 'siti',
        username: 'siti',
        nama_lengkap: 'Siti (Frontend)',
        displayName: 'Siti (Frontend)',
        email: 'siti@example.com',
        role: 'user',
        status: 'approved',
        department: 'UI & Design',
        position: 'UI/UX Designer',
        passwordHash: hashPassword('siti'),
      },
    ];

    for (const u of usersList) {
      await client.query(`
        INSERT INTO "Users" (
          id, uid, username, nama_lengkap, email, "displayName", role, status,
          department, position, "passwordHash", "createdAt", "updatedAt"
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
        ON CONFLICT (username) DO UPDATE SET
          id = EXCLUDED.id,
          uid = EXCLUDED.uid,
          nama_lengkap = EXCLUDED.nama_lengkap,
          "displayName" = EXCLUDED."displayName",
          role = EXCLUDED.role,
          status = EXCLUDED.status,
          department = EXCLUDED.department,
          position = EXCLUDED.position,
          "passwordHash" = EXCLUDED."passwordHash";
      `, [u.id, u.uid, u.username, u.nama_lengkap, u.email, u.displayName, u.role, u.status, u.department, u.position, u.passwordHash]);
    }
    console.log(`   --> ${usersList.length} Users successfully updated with exact roles and credentials.`);

    // 2. Align Projects Table
    console.log('\n2️⃣ Migrating & Aligning Projects Table...');
    const projectsList = [
      {
        id: 'proj-1',
        name: 'Pengembangan Core Platform V2',
        projectKey: 'KAN',
        description: 'Project utama migrasi dan modernisasi layanan core platform.',
        ownerId: '3',
        status: 'Active',
        taskCounter: 2,
      },
      {
        id: '2SGXiPUTwHnF8D576hfO',
        name: 'wondr merchant & issue resolution',
        projectKey: 'WMIR',
        description: 'Wondr Merchant & Issue Resolution Project',
        ownerId: 'rido',
        status: 'Active',
        taskCounter: 100,
      },
      {
        id: 'zes0sOR02S9VzkjP4UYw',
        name: 'Personal Channel & Services',
        projectKey: 'PCS',
        description: 'Personal Channel & Services Project',
        ownerId: 'Dimas',
        status: 'Active',
        taskCounter: 100,
      },
    ];

    for (const p of projectsList) {
      await client.query(`
        INSERT INTO "Projects" (id, name, "projectKey", description, "ownerId", status, "taskCounter", "createdAt", "updatedAt")
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          "projectKey" = EXCLUDED."projectKey",
          description = EXCLUDED.description,
          "ownerId" = EXCLUDED."ownerId",
          status = EXCLUDED.status;
      `, [p.id, p.name, p.projectKey, p.description, p.ownerId, p.status, p.taskCounter]);
    }
    console.log(`   --> ${projectsList.length} Projects ensured in PostgreSQL.`);

    // 3. Align ProjectMembers with Proper Roles
    console.log('\n3️⃣ Aligning Project Members and Roles...');
    for (const u of usersList) {
      for (const p of projectsList) {
        let projRole = 'developer';
        if (u.role === 'admin') projRole = 'admin';
        else if (u.role === 'head') projRole = 'head';
        else if (u.role === 'manager') projRole = 'manager';
        else if (u.role === 'viewer') projRole = 'viewer';

        await client.query(`
          INSERT INTO "ProjectMembers" ("projectId", "userId", role)
          VALUES ($1, $2, $3)
          ON CONFLICT ("projectId", "userId") DO UPDATE SET role = EXCLUDED.role;
        `, [p.id, u.id, projRole]);
      }
    }
    console.log(`   --> Project Members mapping updated.`);

    // 4. Reconstruct Tasks & Sprints from AuditLogs
    console.log('\n4️⃣ Reconstructing Tasks and Sprints...');
    const filePath = path.join(process.cwd(), 'backup_lanpro_2026-08-02T11-34-28-747Z.sql');
    const fileStream = fs.createReadStream(filePath, { encoding: 'utf8' });
    const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

    const tasksMap = new Map<string, any>();
    const sprintsMap = new Map<string, any>();

    for await (const line of rl) {
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

    // Add local_db tasks if missing
    const localDbPath = path.join(process.cwd(), 'database', 'local_db.json');
    if (fs.existsSync(localDbPath)) {
      const localDb = JSON.parse(fs.readFileSync(localDbPath, 'utf8'));
      for (const t of localDb.Tasks || []) {
        if (!tasksMap.has(t.id)) tasksMap.set(t.id, t);
      }
      for (const s of localDb.Sprints || []) {
        if (!sprintsMap.has(s.id)) sprintsMap.set(s.id, s);
      }
    }

    // Insert Sprints
    for (const s of sprintsMap.values()) {
      const projId = s.projectId || '2SGXiPUTwHnF8D576hfO';
      await client.query(`
        INSERT INTO "Sprints" (id, "projectId", name, goal, "startDate", "endDate", status, "createdAt", "updatedAt")
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
        ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, status = EXCLUDED.status;
      `, [s.id, projId, s.name || 'Sprint', s.goal || null, s.startDate || null, s.endDate || null, s.status || 'planned']);
    }

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
          "assigneeId" = EXCLUDED."assigneeId",
          "reporterId" = EXCLUDED."reporterId";
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
        t.reporterId || 'rido',
        t.projectRisk || 'Low',
        t.storyPoints || 0,
        t.orderIndex || 0,
        t.isBlocked ? true : false,
        t.dueDate || null,
      ]);
      taskCount++;
    }
    console.log(`   --> ${tasksMap.size} Tasks and ${sprintsMap.size} Sprints updated.`);

    // 5. Senior DB Architect Audit Report
    console.log('\n===================================================================');
    console.log('🏛️  SENIOR DB ARCHITECT & SA VERIFICATION AUDIT (Neon PostgreSQL)');
    console.log('===================================================================');

    const resUsers = await client.query('SELECT username, "displayName", role, department, position FROM "Users" ORDER BY role ASC, username ASC');
    console.log('\n👥 USERS & ROLES AUDIT:');
    console.table(resUsers.rows);

    const resProj = await client.query('SELECT id, name, "projectKey", "ownerId", status FROM "Projects"');
    console.log('\n📁 PROJECTS AUDIT:');
    console.table(resProj.rows);

    const totalTasksRes = await client.query('SELECT COUNT(*) FROM "Tasks"');
    const totalAuditRes = await client.query('SELECT COUNT(*) FROM "AuditLogs"');
    const totalActivityRes = await client.query('SELECT COUNT(*) FROM "ActivityLogs"');

    console.log('-------------------------------------------------------------------');
    console.log(`🔥 TOTAL USERS IN NEON        : ${resUsers.rows.length}`);
    console.log(`🔥 TOTAL PROJECTS IN NEON     : ${resProj.rows.length}`);
    console.log(`🔥 TOTAL TASKS IN NEON        : ${totalTasksRes.rows[0].count}`);
    console.log(`🔥 TOTAL AUDIT LOGS IN NEON   : ${totalAuditRes.rows[0].count}`);
    console.log(`🔥 TOTAL ACTIVITY LOGS IN NEON: ${totalActivityRes.rows[0].count}`);
    console.log('===================================================================\n');

  } finally {
    client.release();
    await pool.end();
  }
}

dbArchitectRestore().catch((err) => {
  console.error('❌ DB Architect Restore failed:', err);
  process.exit(1);
});
