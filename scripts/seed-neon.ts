/**
 * scripts/seed-neon.ts
 * Seed script: membaca local_db.json dan mengisi semua data ke Neon PostgreSQL.
 * Jalankan: npx tsx scripts/seed-neon.ts
 *
 * Strategi: INSERT ... ON CONFLICT DO NOTHING  (idempotent — aman dijalankan berulang)
 */

import 'dotenv/config';
import dotenvLocal from 'dotenv';
import path from 'path';
import fs from 'fs';
import { Pool } from 'pg';

dotenvLocal.config({ path: path.join(process.cwd(), '.env.local'), override: false });

const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL tidak ditemukan di .env.local!');
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 15000,
});

// ─── Helper: insert a row idempotently ──────────────────────────────────────
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
    // Serialize objects/arrays to JSON strings for JSONB columns
    if (v !== null && typeof v === 'object' && !(v instanceof Date)) {
      return JSON.stringify(v);
    }
    return v;
  });

  try {
    await client.query(sql, values);
  } catch (err: any) {
    console.warn(`  ⚠️  ${table} insert skipped: ${err.message.split('\n')[0]}`);
  }
}

// ─── Main seed ───────────────────────────────────────────────────────────────
async function seed() {
  const dbPath = path.join(process.cwd(), 'database', 'local_db.json');
  if (!fs.existsSync(dbPath)) {
    console.error(`❌ File tidak ditemukan: ${dbPath}`);
    process.exit(1);
  }

  const localDb = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
  const client = await pool.connect();

  console.log('🌱 Memulai seed data ke Neon PostgreSQL...\n');

  try {
    // Ensure Users has photoUrl and photoURL columns
    await client.query('ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "photoUrl" TEXT;');
    await client.query('ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "photoURL" TEXT;');
    await client.query('ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "avatarUrl" TEXT;');

    // Clean existing tables for fresh seed
    console.log('🧹 Membersihkan tabel lama untuk fresh migration...');
    const tablesToClean = [
      'TaskExternalLinks', 'Attachments', 'LinkedTasks', 'Comments', 'TaskCustomFields',
      'ActivityLogs', 'AuditLogs', 'Messages', 'Notifications', 'DiscussionPoints',
      'Meetings', 'QATestCases', 'QATestSuites', 'ProjectModules', 'Documents',
      'Tasks', 'MilestoneSprints', 'Milestones', 'Sprints', 'ProjectMembers',
      'ProjectInvites', 'Projects', 'MasterData', 'Users'
    ];
    for (const t of tablesToClean) {
      try {
        await client.query(`TRUNCATE TABLE "${t}" CASCADE;`);
      } catch (err: any) {
        // Table might not exist yet
      }
    }
    console.log('✅ Clean finish.\n');
    const users: any[] = localDb.Users || [];
    console.log(`📋 Users: ${users.length} record`);
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

    // ── MasterData ─────────────────────────────────────────────────────────
    const masterData: any[] = localDb.MasterData || [];
    console.log(`📋 MasterData: ${masterData.length} record`);
    for (const m of masterData) {
      await upsert(client, 'MasterData', {
        id: m.id,
        type: m.type,
        label: m.label,
        order: m.order ?? 0,
        createdAt: m.createdAt || new Date().toISOString(),
      }, ['id']);
    }

    // ── Projects ───────────────────────────────────────────────────────────
    const projects: any[] = localDb.Projects || [];
    console.log(`📋 Projects: ${projects.length} record`);
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

    // ── ProjectMembers ─────────────────────────────────────────────────────
    const members: any[] = localDb.ProjectMembers || [];
    console.log(`📋 ProjectMembers: ${members.length} record`);
    for (const m of members) {
      await upsert(client, 'ProjectMembers', {
        projectId: m.projectId,
        userId: m.userId,
        role: m.role || 'developer',
        parentAdminId: m.parentAdminId || null,
      }, ['projectId', 'userId']);
    }

    // ── ProjectInvites ─────────────────────────────────────────────────────
    const invites: any[] = localDb.ProjectInvites || [];
    console.log(`📋 ProjectInvites: ${invites.length} record`);
    for (const inv of invites) {
      await upsert(client, 'ProjectInvites', {
        id: inv.id,
        projectId: inv.projectId,
        email: inv.email,
        role: inv.role || 'developer',
        status: inv.status || 'pending',
        invitedBy: inv.invitedBy || null,
        createdAt: inv.createdAt || new Date().toISOString(),
      }, ['id']);
    }

    // ── Sprints ────────────────────────────────────────────────────────────
    const sprints: any[] = localDb.Sprints || [];
    console.log(`📋 Sprints: ${sprints.length} record`);
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

    // ── Milestones ─────────────────────────────────────────────────────────
    const milestones: any[] = localDb.Milestones || [];
    console.log(`📋 Milestones: ${milestones.length} record`);
    for (const ms of milestones) {
      await upsert(client, 'Milestones', {
        id: ms.id,
        projectId: ms.projectId,
        name: ms.name,
        description: ms.description || null,
        dueDate: ms.dueDate || null,
        status: ms.status || 'pending',
        createdAt: ms.createdAt || new Date().toISOString(),
        updatedAt: ms.updatedAt || new Date().toISOString(),
      }, ['id']);
    }

    // ── MilestoneSprints ───────────────────────────────────────────────────
    const milestoneSprints: any[] = localDb.MilestoneSprints || [];
    console.log(`📋 MilestoneSprints: ${milestoneSprints.length} record`);
    for (const ms of milestoneSprints) {
      await upsert(client, 'MilestoneSprints', {
        milestoneId: ms.milestoneId,
        sprintId: ms.sprintId,
      }, ['milestoneId', 'sprintId']);
    }

    // ── Tasks ──────────────────────────────────────────────────────────────
    const tasks: any[] = localDb.Tasks || [];
    console.log(`📋 Tasks: ${tasks.length} record`);
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

    // ── TaskExternalLinks ──────────────────────────────────────────────────
    const taskLinks: any[] = localDb.TaskExternalLinks || [];
    console.log(`📋 TaskExternalLinks: ${taskLinks.length} record`);
    for (const tl of taskLinks) {
      await upsert(client, 'TaskExternalLinks', {
        id: tl.id,
        taskId: tl.taskId,
        url: tl.url,
        label: tl.label || null,
        addedBy: tl.addedBy || null,
        addedAt: tl.addedAt || new Date().toISOString(),
      }, ['id']);
    }

    // ── Attachments ────────────────────────────────────────────────────────
    const attachments: any[] = localDb.Attachments || [];
    console.log(`📋 Attachments: ${attachments.length} record`);
    for (const a of attachments) {
      await upsert(client, 'Attachments', {
        id: a.id,
        taskId: a.taskId,
        filename: a.filename,
        originalName: a.originalName || null,
        mimetype: a.mimetype || null,
        size: a.size || 0,
        url: a.url || null,
        uploadedBy: a.uploadedBy || null,
        uploadedAt: a.uploadedAt || new Date().toISOString(),
      }, ['id']);
    }

    // ── LinkedTasks ────────────────────────────────────────────────────────
    const linkedTasks: any[] = localDb.LinkedTasks || [];
    console.log(`📋 LinkedTasks: ${linkedTasks.length} record`);
    for (const lt of linkedTasks) {
      await upsert(client, 'LinkedTasks', {
        id: lt.id,
        sourceTaskId: lt.sourceTaskId,
        targetTaskId: lt.targetTaskId,
        linkType: lt.linkType || 'relates_to',
        createdAt: lt.createdAt || new Date().toISOString(),
      }, ['id']);
    }

    // ── Comments ───────────────────────────────────────────────────────────
    const comments: any[] = localDb.Comments || [];
    console.log(`📋 Comments: ${comments.length} record`);
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

    // ── TaskCustomFields ───────────────────────────────────────────────────
    const customFields: any[] = localDb.TaskCustomFields || [];
    console.log(`📋 TaskCustomFields: ${customFields.length} record`);
    for (const cf of customFields) {
      await upsert(client, 'TaskCustomFields', {
        id: cf.id,
        taskId: cf.taskId,
        name: cf.name,
        value: cf.value || null,
        type: cf.type || 'text',
      }, ['id']);
    }

    // ── ActivityLogs ───────────────────────────────────────────────────────
    const activityLogs: any[] = localDb.ActivityLogs || [];
    console.log(`📋 ActivityLogs: ${activityLogs.length} record`);
    for (const al of activityLogs) {
      await upsert(client, 'ActivityLogs', {
        id: al.id,
        taskId: al.taskId || null,
        projectId: al.projectId || null,
        userId: al.userId || null,
        action: al.action,
        details: al.details || null,
        createdAt: al.createdAt || new Date().toISOString(),
      }, ['id']);
    }

    // ── AuditLogs ──────────────────────────────────────────────────────────
    const auditLogs: any[] = localDb.AuditLogs || [];
    console.log(`📋 AuditLogs: ${auditLogs.length} record`);
    for (const al of auditLogs) {
      await upsert(client, 'AuditLogs', {
        id: al.id,
        userId: al.userId || null,
        projectId: al.projectId || null,
        entityName: al.entityName || null,
        entityId: al.entityId || null,
        actionType: al.actionType || null,
        changes: al.changes ? JSON.stringify(al.changes) : null,
        ipAddress: al.ipAddress || null,
        userAgent: al.userAgent || null,
        createdAt: al.createdAt || new Date().toISOString(),
      }, ['id']);
    }

    // ── Messages ───────────────────────────────────────────────────────────
    const messages: any[] = localDb.Messages || [];
    console.log(`📋 Messages: ${messages.length} record`);
    for (const m of messages) {
      await upsert(client, 'Messages', {
        id: m.id,
        senderId: m.senderId,
        receiverId: m.receiverId,
        message: m.message,
        timestamp: m.timestamp,
        read: m.read || false,
      }, ['id']);
    }

    // ── Notifications ──────────────────────────────────────────────────────
    const notifications: any[] = localDb.Notifications || [];
    console.log(`📋 Notifications: ${notifications.length} record`);
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

    // ── Meetings ───────────────────────────────────────────────────────────
    const meetings: any[] = localDb.Meetings || [];
    console.log(`📋 Meetings: ${meetings.length} record`);
    for (const m of meetings) {
      await upsert(client, 'Meetings', {
        id: m.id,
        projectId: m.projectId,
        title: m.title,
        agenda: m.agenda || null,
        scheduledAt: m.scheduledAt || null,
        status: m.status || 'scheduled',
        participants: m.participants ? JSON.stringify(m.participants) : null,
        transcript: m.transcript || null,
        aiSummary: m.aiSummary ? JSON.stringify(m.aiSummary) : null,
        recording_url: m.recording_url || null,
        file_size: m.file_size || null,
        upload_status: m.upload_status || null,
        analysis_result: m.analysis_result || null,
        createdBy: m.createdBy || null,
        createdAt: m.createdAt || new Date().toISOString(),
        updatedAt: m.updatedAt || new Date().toISOString(),
      }, ['id']);
    }

    // ── DiscussionPoints ───────────────────────────────────────────────────
    const discussionPoints: any[] = localDb.DiscussionPoints || [];
    console.log(`📋 DiscussionPoints: ${discussionPoints.length} record`);
    for (const dp of discussionPoints) {
      await upsert(client, 'DiscussionPoints', {
        id: dp.id,
        meetingId: dp.meetingId,
        content: dp.content,
        authorId: dp.authorId || null,
        createdAt: dp.createdAt || new Date().toISOString(),
      }, ['id']);
    }

    // ── QATestSuites ───────────────────────────────────────────────────────
    const qaSuites: any[] = localDb.QATestSuites || [];
    console.log(`📋 QATestSuites: ${qaSuites.length} record`);
    for (const qs of qaSuites) {
      await upsert(client, 'QATestSuites', {
        id: qs.id,
        projectId: qs.projectId,
        name: qs.name,
        phase: qs.phase,
        uploadedBy: qs.uploadedBy,
        uploadedAt: qs.uploadedAt,
        fileName: qs.fileName || null,
      }, ['id']);
    }

    // ── QATestCases ────────────────────────────────────────────────────────
    const qaTestCases: any[] = localDb.QATestCases || [];
    console.log(`📋 QATestCases: ${qaTestCases.length} record`);
    for (const tc of qaTestCases) {
      await upsert(client, 'QATestCases', {
        id: tc.id,
        projectId: tc.projectId,
        judul: tc.judul,
        deskripsi: tc.deskripsi || null,
        tipeTesting: tc.tipeTesting,
        prioritas: tc.prioritas,
        caseId: tc.caseId || null,
        expected: tc.expected || null,
        status: tc.status,
        steps: JSON.stringify(tc.steps || []),
        history: JSON.stringify(tc.history || []),
        createdAt: tc.createdAt,
        activeTesterId: tc.activeTesterId || null,
        activeTesterName: tc.activeTesterName || null,
        lockedAt: tc.lockedAt || null,
        suiteId: tc.suiteId || null,
        rowNum: tc.rowNum || null,
        comment: tc.comment || null,
        evidenceUrl: tc.evidenceUrl || null,
        evidenceType: tc.evidenceType || null,
        evidenceName: tc.evidenceName || null,
        linkedBugKey: tc.linkedBugKey || null,
        commentsList: tc.commentsList ? JSON.stringify(tc.commentsList) : null,
        evidences: tc.evidences ? JSON.stringify(tc.evidences) : null,
        modulId: tc.modulId || null,
      }, ['id']);
    }

    // ── ProjectModules ─────────────────────────────────────────────────────
    const projectModules: any[] = localDb.ProjectModules || [];
    console.log(`📋 ProjectModules: ${projectModules.length} record`);
    for (const pm of projectModules) {
      await upsert(client, 'ProjectModules', {
        id: pm.id,
        projectId: pm.projectId,
        namaModul: pm.namaModul,
        keterangan: pm.keterangan || null,
        createdAt: pm.createdAt,
      }, ['id']);
    }

    // ── Documents ──────────────────────────────────────────────────────────
    const documents: any[] = localDb.Documents || [];
    console.log(`📋 Documents: ${documents.length} record`);
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

    // ── Summary ────────────────────────────────────────────────────────────
    console.log('\n✅ Seed selesai! Ringkasan data yang di-seed ke Neon:');

    const tables = [
      'Users', 'MasterData', 'Projects', 'ProjectMembers', 'ProjectInvites',
      'Sprints', 'Milestones', 'Tasks', 'Comments', 'Notifications',
      'Documents', 'Meetings', 'QATestSuites', 'QATestCases', 'ProjectModules',
    ];

    for (const tbl of tables) {
      const res = await client.query(`SELECT COUNT(*) FROM "${tbl}"`);
      const count = res.rows[0].count;
      console.log(`  📊 ${tbl}: ${count} rows`);
    }

    console.log('\n🎉 Neon PostgreSQL sudah terisi dengan data LanPro lokal Anda!');
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch((err) => {
  console.error('❌ Seed gagal:', err.message);
  process.exit(1);
});
