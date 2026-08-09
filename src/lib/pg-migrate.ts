/**
 * src/lib/pg-migrate.ts
 * Auto-migration script: Creates all LanPro tables in PostgreSQL (Neon).
 * Called once during server startup when DATABASE_URL is present.
 * Uses CREATE TABLE IF NOT EXISTS — safe to run multiple times (idempotent).
 */

import { Pool } from 'pg';

export async function runMigrations(pool: Pool): Promise<void> {
  const client = await pool.connect();
  console.log('🚀 [PG-MIGRATE] Memulai migrasi schema ke Neon PostgreSQL...');

  try {
    await client.query('BEGIN');

    // ── Users ───────────────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS "Users" (
        id                VARCHAR(36) PRIMARY KEY,
        uid               VARCHAR(255),
        username          VARCHAR(255) UNIQUE NOT NULL,
        nama_lengkap      VARCHAR(255),
        email             VARCHAR(255) UNIQUE NOT NULL,
        "displayName"     VARCHAR(255),
        role              VARCHAR(50) NOT NULL DEFAULT 'user',
        status            VARCHAR(50) NOT NULL DEFAULT 'pending',
        "passwordHash"    TEXT,
        department        VARCHAR(255),
        position          VARCHAR(255),
        phone             VARCHAR(50),
        "lastSeen"        VARCHAR(50),
        "avatarUrl"       TEXT,
        "photoUrl"        TEXT,
        "createdAt"       TIMESTAMP DEFAULT NOW(),
        "updatedAt"       TIMESTAMP DEFAULT NOW()
      );
      ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "photoUrl" TEXT;
      ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "photoURL" TEXT;
      ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "avatarUrl" TEXT;
      ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "permissions" TEXT;
    `);

    // ── MasterData ──────────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS "MasterData" (
        id                VARCHAR(36) PRIMARY KEY,
        type              VARCHAR(100) NOT NULL,
        label             VARCHAR(255) NOT NULL,
        color             VARCHAR(50),
        icon              VARCHAR(50),
        "order"           INT DEFAULT 0,
        description       TEXT,
        "fieldType"       VARCHAR(50),
        "dropdownOptions" JSONB,
        role_type         VARCHAR(20),
        "createdAt"       TIMESTAMP DEFAULT NOW()
      );
      ALTER TABLE "MasterData" ADD COLUMN IF NOT EXISTS color VARCHAR(50);
      ALTER TABLE "MasterData" ADD COLUMN IF NOT EXISTS icon VARCHAR(50);
      ALTER TABLE "MasterData" ADD COLUMN IF NOT EXISTS description TEXT;
      ALTER TABLE "MasterData" ADD COLUMN IF NOT EXISTS "fieldType" VARCHAR(50);
      ALTER TABLE "MasterData" ADD COLUMN IF NOT EXISTS "dropdownOptions" JSONB;
      ALTER TABLE "MasterData" ADD COLUMN IF NOT EXISTS role_type VARCHAR(20);
    `);

    // ── Projects ────────────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS "Projects" (
        id                VARCHAR(36) PRIMARY KEY,
        name              VARCHAR(255) NOT NULL,
        "projectKey"      VARCHAR(50) NOT NULL,
        description       TEXT,
        "ownerId"         VARCHAR(36),
        status            VARCHAR(50) DEFAULT 'Active',
        "taskCounter"     INT DEFAULT 0,
        "dashboard_layout" JSONB,
        category          VARCHAR(50) DEFAULT 'Agile',
        "createdAt"       TIMESTAMP DEFAULT NOW(),
        "updatedAt"       TIMESTAMP DEFAULT NOW()
      );
      ALTER TABLE "Projects" ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'Agile';
    `);

    // ── ProjectMembers ──────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS "ProjectMembers" (
        "projectId"     VARCHAR(36) NOT NULL,
        "userId"        VARCHAR(36) NOT NULL,
        role            VARCHAR(50) DEFAULT 'developer',
        "parentAdminId" VARCHAR(36),
        PRIMARY KEY ("projectId", "userId")
      );
    `);

    // ── ProjectInvites ──────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS "ProjectInvites" (
        id          VARCHAR(36) PRIMARY KEY,
        "projectId" VARCHAR(36) NOT NULL,
        email       VARCHAR(255) NOT NULL,
        role        VARCHAR(50) DEFAULT 'developer',
        status      VARCHAR(50) DEFAULT 'pending',
        "invitedBy" VARCHAR(36),
        "createdAt" TIMESTAMP DEFAULT NOW()
      );
    `);

    // ── Sprints ─────────────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS "Sprints" (
        id          VARCHAR(36) PRIMARY KEY,
        "projectId" VARCHAR(36) NOT NULL,
        name        VARCHAR(255) NOT NULL,
        goal        TEXT,
        "startDate" VARCHAR(50),
        "endDate"   VARCHAR(50),
        status      VARCHAR(50) DEFAULT 'planned',
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW()
      );
    `);

    // ── Milestones ──────────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS "Milestones" (
        id          VARCHAR(36) PRIMARY KEY,
        "projectId" VARCHAR(36) NOT NULL,
        name        VARCHAR(255) NOT NULL,
        description TEXT,
        "dueDate"   VARCHAR(50),
        status      VARCHAR(50) DEFAULT 'pending',
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW()
      );
    `);

    // ── MilestoneSprints ────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS "MilestoneSprints" (
        "milestoneId" VARCHAR(36) NOT NULL,
        "sprintId"    VARCHAR(36) NOT NULL,
        PRIMARY KEY ("milestoneId", "sprintId")
      );
    `);

    // ── Tasks ───────────────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS "Tasks" (
        id                  VARCHAR(36) PRIMARY KEY,
        "projectId"         VARCHAR(36) NOT NULL,
        "sprintId"          VARCHAR(36),
        "taskKey"           VARCHAR(50),
        title               VARCHAR(500) NOT NULL,
        description         TEXT,
        status              VARCHAR(100) DEFAULT 'To Do',
        priority            VARCHAR(50) DEFAULT 'Medium',
        type                VARCHAR(50) DEFAULT 'task',
        "assigneeId"        VARCHAR(36),
        "assigneeEmail"     VARCHAR(255),
        "reporterId"        VARCHAR(36),
        "projectRisk"       VARCHAR(50),
        "storyPoints"       INT DEFAULT 0,
        "orderIndex"        INT DEFAULT 0,
        "isBlocked"         BOOLEAN DEFAULT FALSE,
        "dueDate"           VARCHAR(50),
        labels              JSONB,
        assignees           JSONB,
        permissions         JSONB,
        "milestoneId"       VARCHAR(36),
        "moduleId"          VARCHAR(36),
        "linkedEpicId"      VARCHAR(36),
        "parentTaskId"      VARCHAR(36),
        "parentId"          VARCHAR(36),
        "acceptanceCriteria" TEXT,
        "startDate"         VARCHAR(50),
        "endDate"           VARCHAR(50),
        version             INT NOT NULL DEFAULT 1,
        "createdAt"         TIMESTAMP DEFAULT NOW(),
        "updatedAt"         TIMESTAMP DEFAULT NOW()
      );
      ALTER TABLE "Tasks" ADD COLUMN IF NOT EXISTS "parentId" VARCHAR(36);
      ALTER TABLE "Tasks" ADD COLUMN IF NOT EXISTS "acceptanceCriteria" TEXT;
      ALTER TABLE "Tasks" ADD COLUMN IF NOT EXISTS "startDate" VARCHAR(50);
      ALTER TABLE "Tasks" ADD COLUMN IF NOT EXISTS "endDate" VARCHAR(50);
    `);

    // ── TaskExternalLinks ───────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS "TaskExternalLinks" (
        id        VARCHAR(36) PRIMARY KEY,
        "taskId"  VARCHAR(36) NOT NULL,
        url       TEXT NOT NULL,
        label     VARCHAR(255),
        "addedBy" VARCHAR(36),
        "addedAt" TIMESTAMP DEFAULT NOW()
      );
    `);

    // ── Attachments ─────────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS "Attachments" (
        id           VARCHAR(36) PRIMARY KEY,
        "taskId"     VARCHAR(36) NOT NULL,
        filename     VARCHAR(255),
        name         VARCHAR(255),
        "originalName" VARCHAR(255),
        mimetype     VARCHAR(100),
        type         VARCHAR(100),
        size         BIGINT DEFAULT 0,
        url          TEXT,
        "fileRef"    TEXT,
        "uploadedByUserId" VARCHAR(36),
        "uploadedByName"   VARCHAR(255),
        "uploadedBy" VARCHAR(36),
        "uploadedAt" TIMESTAMP DEFAULT NOW()
      );
      ALTER TABLE "Attachments" ADD COLUMN IF NOT EXISTS name VARCHAR(255);
      ALTER TABLE "Attachments" ADD COLUMN IF NOT EXISTS type VARCHAR(100);
      ALTER TABLE "Attachments" ADD COLUMN IF NOT EXISTS "fileRef" TEXT;
      ALTER TABLE "Attachments" ADD COLUMN IF NOT EXISTS "uploadedByUserId" VARCHAR(36);
      ALTER TABLE "Attachments" ADD COLUMN IF NOT EXISTS "uploadedByName" VARCHAR(255);
    `);

    // ── LinkedTasks ─────────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS "LinkedTasks" (
        id              VARCHAR(36) PRIMARY KEY,
        "sourceTaskId"  VARCHAR(36) NOT NULL,
        "targetTaskId"  VARCHAR(36) NOT NULL,
        "linkType"      VARCHAR(50) DEFAULT 'relates_to',
        "createdAt"     TIMESTAMP DEFAULT NOW()
      );
    `);

    // ── Comments ────────────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS "Comments" (
        id          VARCHAR(36) PRIMARY KEY,
        "taskId"    VARCHAR(36) NOT NULL,
        "authorId"  VARCHAR(36) NOT NULL,
        text        TEXT NOT NULL,
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW()
      );
    `);

    // ── TaskCustomFields ─────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS "TaskCustomFields" (
        id        VARCHAR(36) PRIMARY KEY,
        "taskId"  VARCHAR(36) NOT NULL,
        name      VARCHAR(255) NOT NULL,
        value     TEXT,
        type      VARCHAR(50) DEFAULT 'text'
      );
    `);

    // ── ActivityLogs ─────────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS "ActivityLogs" (
        id          VARCHAR(36) PRIMARY KEY,
        "taskId"    VARCHAR(36),
        "projectId" VARCHAR(36),
        "userId"    VARCHAR(36),
        action      VARCHAR(255) NOT NULL,
        details     TEXT,
        "createdAt" TIMESTAMP DEFAULT NOW()
      );
    `);

    // ── AuditLogs ────────────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS "AuditLogs" (
        id           VARCHAR(36) PRIMARY KEY,
        "userId"     VARCHAR(36),
        "projectId"  VARCHAR(36),
        "entityName" VARCHAR(100),
        "entityId"   VARCHAR(36),
        "actionType" VARCHAR(50),
        changes      JSONB,
        "oldValues"  JSONB,
        "newValues"  JSONB,
        "ipAddress"  VARCHAR(50),
        "userAgent"  TEXT,
        "createdAt"  TIMESTAMP DEFAULT NOW()
      );
      ALTER TABLE "AuditLogs" ADD COLUMN IF NOT EXISTS "oldValues" JSONB;
      ALTER TABLE "AuditLogs" ADD COLUMN IF NOT EXISTS "newValues" JSONB;
    `);

    // ── Messages ─────────────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS "Messages" (
        id           VARCHAR(36) PRIMARY KEY,
        "senderId"   VARCHAR(36) NOT NULL,
        "receiverId" VARCHAR(36) NOT NULL,
        message      TEXT NOT NULL,
        timestamp    VARCHAR(50) NOT NULL,
        "read"       BOOLEAN DEFAULT FALSE
      );
    `);

    // ── Notifications ────────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS "Notifications" (
        id           VARCHAR(36) PRIMARY KEY,
        "recipientId" VARCHAR(36) NOT NULL,
        "senderId"   VARCHAR(36),
        title        VARCHAR(255),
        message      TEXT,
        type         VARCHAR(50),
        "relatedId"  VARCHAR(36),
        "read"       BOOLEAN DEFAULT FALSE,
        "createdAt"  TIMESTAMP DEFAULT NOW()
      );
    `);

    // ── Meetings ─────────────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS "Meetings" (
        id              VARCHAR(36) PRIMARY KEY,
        "projectId"     VARCHAR(36) NOT NULL,
        title           VARCHAR(255) NOT NULL,
        agenda          TEXT,
        "scheduledAt"   VARCHAR(50),
        status          VARCHAR(50) DEFAULT 'scheduled',
        participants    JSONB,
        transcript      TEXT,
        "aiSummary"     JSONB,
        "recording_url" VARCHAR(512),
        "file_size"     BIGINT,
        "upload_status" VARCHAR(50),
        "analysis_result" TEXT,
        "createdBy"     VARCHAR(36),
        "description"   TEXT,
        "meetingLink"   TEXT,
        "authorId"      VARCHAR(36),
        "createdAt"     TIMESTAMP DEFAULT NOW(),
        "updatedAt"     TIMESTAMP DEFAULT NOW()
      );
      ALTER TABLE "Meetings" ADD COLUMN IF NOT EXISTS "description" TEXT;
      ALTER TABLE "Meetings" ADD COLUMN IF NOT EXISTS "meetingLink" TEXT;
      ALTER TABLE "Meetings" ADD COLUMN IF NOT EXISTS "authorId" VARCHAR(36);
    `);

    // ── DiscussionPoints ─────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS "DiscussionPoints" (
        id                    VARCHAR(36) PRIMARY KEY,
        "meetingId"           VARCHAR(36) NOT NULL,
        content               TEXT DEFAULT '',
        "parentPointId"       VARCHAR(36),
        "authorId"            VARCHAR(36),
        "assignTo"            VARCHAR(36),
        concern               TEXT,
        fitur                 VARCHAR(255),
        "system"              VARCHAR(255),
        surrounding           VARCHAR(255),
        keterangan            TEXT,
        "tindakanLanjut"      TEXT,
        status                VARCHAR(50) DEFAULT 'pending',
        "targetDate"          VARCHAR(50),
        "tanggalUpdateStatus" VARCHAR(50),
        "createdAt"           TIMESTAMP DEFAULT NOW()
      );
      ALTER TABLE "DiscussionPoints" ADD COLUMN IF NOT EXISTS "parentPointId" VARCHAR(36);
      ALTER TABLE "DiscussionPoints" ADD COLUMN IF NOT EXISTS "assignTo" VARCHAR(36);
      ALTER TABLE "DiscussionPoints" ADD COLUMN IF NOT EXISTS "concern" TEXT;
      ALTER TABLE "DiscussionPoints" ADD COLUMN IF NOT EXISTS "fitur" VARCHAR(255);
      ALTER TABLE "DiscussionPoints" ADD COLUMN IF NOT EXISTS "system" VARCHAR(255);
      ALTER TABLE "DiscussionPoints" ADD COLUMN IF NOT EXISTS "surrounding" VARCHAR(255);
      ALTER TABLE "DiscussionPoints" ADD COLUMN IF NOT EXISTS "keterangan" TEXT;
      ALTER TABLE "DiscussionPoints" ADD COLUMN IF NOT EXISTS "tindakanLanjut" TEXT;
      ALTER TABLE "DiscussionPoints" ADD COLUMN IF NOT EXISTS "status" VARCHAR(50) DEFAULT 'pending';
      ALTER TABLE "DiscussionPoints" ADD COLUMN IF NOT EXISTS "targetDate" VARCHAR(50);
      ALTER TABLE "DiscussionPoints" ADD COLUMN IF NOT EXISTS "tanggalUpdateStatus" VARCHAR(50);
    `);

    // ── meeting_details ──────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS meeting_details (
        id                          VARCHAR(36) PRIMARY KEY,
        meeting_id                  VARCHAR(36) NOT NULL,
        ringkasan_eksekutif         TEXT,
        topik_utama                 VARCHAR(255),
        kronologi_dan_kesimpulan    JSONB,
        kesimpulan                  JSONB,
        saran_dan_ide               JSONB,
        tindak_lanjut               JSONB,
        next_plan                   JSONB,
        target_to_be_architecture   JSONB,
        metadata_rapat              JSONB,
        created_at                  TIMESTAMP DEFAULT NOW()
      );
    `);

    // ── QATestSuites ─────────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS "QATestSuites" (
        id           VARCHAR(36) PRIMARY KEY,
        "projectId"  VARCHAR(36) NOT NULL,
        name         VARCHAR(255) NOT NULL,
        phase        VARCHAR(50) NOT NULL,
        "uploadedBy" VARCHAR(255) NOT NULL,
        "uploadedAt" VARCHAR(50) NOT NULL,
        "fileName"   VARCHAR(255)
      );
    `);

    // ── QATestCases ──────────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS "QATestCases" (
        id                VARCHAR(36) PRIMARY KEY,
        "projectId"       VARCHAR(36) NOT NULL,
        judul             VARCHAR(255) NOT NULL,
        deskripsi         TEXT,
        "tipeTesting"     VARCHAR(50) NOT NULL,
        prioritas         VARCHAR(50) NOT NULL,
        "caseId"          VARCHAR(36),
        expected          TEXT,
        status            VARCHAR(50) NOT NULL,
        steps             JSONB NOT NULL DEFAULT '[]',
        history           JSONB NOT NULL DEFAULT '[]',
        "createdAt"       VARCHAR(50) NOT NULL,
        "activeTesterId"  VARCHAR(36),
        "activeTesterName" VARCHAR(255),
        "lockedAt"        VARCHAR(50),
        "suiteId"         VARCHAR(50),
        "rowNum"          INT,
        comment           TEXT,
        "evidenceUrl"     VARCHAR(512),
        "evidenceType"    VARCHAR(50),
        "evidenceName"    VARCHAR(255),
        "linkedBugKey"    VARCHAR(50),
        "commentsList"    JSONB,
        evidences         JSONB,
        "modulId"         VARCHAR(36)
      );
    `);

    // ── QATestCaseExecutionLogs ───────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS "QATestCaseExecutionLogs" (
        id                  VARCHAR(36) PRIMARY KEY,
        "testCaseId"        VARCHAR(36) NOT NULL,
        "projectId"         VARCHAR(36) NOT NULL,
        "runVersion"        INT NOT NULL DEFAULT 1,
        "runLabel"          VARCHAR(50) NOT NULL,
        "executionStatus"   VARCHAR(50) NOT NULL,
        "linkedIssueKey"    VARCHAR(50),
        "executedByUserId"  VARCHAR(36),
        "executedByName"    VARCHAR(255),
        timestamp           VARCHAR(50) NOT NULL,
        notes               TEXT,
        evidences           JSONB
      );
    `);

    // ── ProjectModules ────────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS "ProjectModules" (
        id           VARCHAR(36) PRIMARY KEY,
        "projectId"  VARCHAR(36) NOT NULL,
        "namaModul"  VARCHAR(255) NOT NULL,
        keterangan   TEXT,
        "createdAt"  VARCHAR(50) NOT NULL
      );
    `);

    // ── Documents ────────────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS "Documents" (
        id              VARCHAR(36) PRIMARY KEY,
        "projectId"     VARCHAR(36) NOT NULL,
        title           VARCHAR(255) NOT NULL,
        description     TEXT,
        type            VARCHAR(100),
        link            TEXT,
        "fileName"      VARCHAR(255),
        "fileType"      VARCHAR(100),
        "fileSize"      BIGINT DEFAULT 0,
        "fileRef"       TEXT,
        "fileData"      TEXT,
        "createdBy"     VARCHAR(36),
        "downloadCount" INT DEFAULT 0,
        "createdAt"     TIMESTAMP DEFAULT NOW(),
        "updatedAt"     TIMESTAMP DEFAULT NOW()
      );
      ALTER TABLE "Documents" ADD COLUMN IF NOT EXISTS "fileName" VARCHAR(255);
      ALTER TABLE "Documents" ADD COLUMN IF NOT EXISTS "fileType" VARCHAR(100);
      ALTER TABLE "Documents" ADD COLUMN IF NOT EXISTS "fileSize" BIGINT DEFAULT 0;
      ALTER TABLE "Documents" ADD COLUMN IF NOT EXISTS "fileRef" TEXT;
      ALTER TABLE "Documents" ADD COLUMN IF NOT EXISTS "fileData" TEXT;
    `);

    // ── ai_learning_logs ──────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS ai_learning_logs (
        id                 VARCHAR(36) PRIMARY KEY,
        project_id         VARCHAR(36) NOT NULL,
        evaluation_notes   TEXT NOT NULL,
        timestamp          VARCHAR(50) NOT NULL
      );
    `);

    // ── TokenBlacklist ────────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS "TokenBlacklist" (
        id          SERIAL PRIMARY KEY,
        token       VARCHAR(512) NOT NULL,
        "expiresAt" TIMESTAMP NOT NULL,
        "createdAt" TIMESTAMP DEFAULT NOW()
      );
    `);

    // ── Indexes ────────────────────────────────────────────────────────────────
    const indexes = [
      `CREATE INDEX IF NOT EXISTS idx_tasks_assignee_id ON "Tasks" ("assigneeId")`,
      `CREATE INDEX IF NOT EXISTS idx_tasks_reporter_id ON "Tasks" ("reporterId")`,
      `CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON "Tasks" ("projectId")`,
      `CREATE INDEX IF NOT EXISTS idx_tasks_sprint_id ON "Tasks" ("sprintId")`,
      `CREATE INDEX IF NOT EXISTS idx_audit_project ON "AuditLogs" ("projectId", "entityName", "entityId")`,
      `CREATE INDEX IF NOT EXISTS idx_audit_created ON "AuditLogs" ("createdAt")`,
      `CREATE INDEX IF NOT EXISTS idx_audit_user ON "AuditLogs" ("userId")`,
      `CREATE INDEX IF NOT EXISTS idx_milestone_project ON "Milestones" ("projectId")`,
      `CREATE INDEX IF NOT EXISTS idx_sprint_milestone ON "MilestoneSprints" ("milestoneId")`,
      `CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON "Notifications" ("recipientId")`,
      `CREATE INDEX IF NOT EXISTS idx_messages_sender ON "Messages" ("senderId")`,
      `CREATE INDEX IF NOT EXISTS idx_messages_receiver ON "Messages" ("receiverId")`,
      `CREATE INDEX IF NOT EXISTS idx_token_blacklist ON "TokenBlacklist" (token)`,
      `CREATE INDEX IF NOT EXISTS idx_token_expiry ON "TokenBlacklist" ("expiresAt")`,
    ];
    for (const idx of indexes) {
      try { await client.query(idx); } catch {}
    }

    await client.query('COMMIT');
    console.log('✅ [PG-MIGRATE] Semua tabel berhasil dibuat/diverifikasi di Neon PostgreSQL!');
  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error('❌ [PG-MIGRATE] Migrasi gagal:', err.message);
    throw err;
  } finally {
    client.release();
  }
}
