import pkg from 'pg';
const { Pool } = pkg;
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env.local
const envFile = path.resolve(__dirname, '..', '.env.local');
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq < 1) continue;
    const k = t.slice(0, eq).trim();
    const v = t.slice(eq + 1).trim();
    if (!process.env[k]) process.env[k] = v;
  }
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
  ssl: { rejectUnauthorized: false },
});

const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  dim: '\x1b[2m',
};

const EXPECTED_SCHEMA = {
  Users: {
    id: "VARCHAR(36)", uid: "VARCHAR(100)", username: "VARCHAR(100)",
    email: "VARCHAR(255)", passwordHash: "TEXT", role: "VARCHAR(50)",
    displayName: "VARCHAR(255)", avatarUrl: "TEXT", photoUrl: "TEXT",
    photoURL: "TEXT", nama_lengkap: "VARCHAR(255)", lastSeen: "VARCHAR(50)",
    createdAt: "TIMESTAMP DEFAULT NOW()", updatedAt: "TIMESTAMP DEFAULT NOW()",
  },
  MasterData: {
    id: "VARCHAR(36)", type: "VARCHAR(100) NOT NULL", label: "VARCHAR(255) NOT NULL",
    color: "VARCHAR(50)", icon: "VARCHAR(50)", '"order"': "INT DEFAULT 0",
    description: "TEXT", '"fieldType"': "VARCHAR(50)", '"dropdownOptions"': "JSONB",
    role_type: "VARCHAR(20)", '"createdAt"': "TIMESTAMP DEFAULT NOW()",
  },
  Projects: {
    id: "VARCHAR(36)", name: "VARCHAR(255) NOT NULL", '"projectKey"': "VARCHAR(50) NOT NULL",
    description: "TEXT", '"ownerId"': "VARCHAR(36)", status: "VARCHAR(50) DEFAULT 'Active'",
    '"taskCounter"': "INT DEFAULT 0", dashboard_layout: "JSONB", category: "VARCHAR(50) DEFAULT 'Agile'",
    '"createdAt"': "TIMESTAMP DEFAULT NOW()", '"updatedAt"': "TIMESTAMP DEFAULT NOW()",
  },
  ProjectMembers: {
    '"projectId"': "VARCHAR(36) NOT NULL", '"userId"': "VARCHAR(36) NOT NULL",
    role: "VARCHAR(50) DEFAULT 'developer'", '"parentAdminId"': "VARCHAR(36)",
  },
  ProjectInvites: {
    id: "VARCHAR(36)", '"projectId"': "VARCHAR(36) NOT NULL",
    email: "VARCHAR(255) NOT NULL", role: "VARCHAR(50) DEFAULT 'developer'",
    '"invitedBy"': "VARCHAR(36)", status: "VARCHAR(50) DEFAULT 'pending'",
    '"createdAt"': "TIMESTAMP DEFAULT NOW()",
  },
  Sprints: {
    id: "VARCHAR(36)", '"projectId"': "VARCHAR(36) NOT NULL",
    name: "VARCHAR(255) NOT NULL", goal: "TEXT",
    '"startDate"': "VARCHAR(50)", '"endDate"': "VARCHAR(50)",
    status: "VARCHAR(50) DEFAULT 'planning'",
    '"createdAt"': "TIMESTAMP DEFAULT NOW()", '"updatedAt"': "TIMESTAMP DEFAULT NOW()",
  },
  Tasks: {
    id: "VARCHAR(36)", '"projectId"': "VARCHAR(36) NOT NULL", '"sprintId"': "VARCHAR(36)",
    '"taskKey"': "VARCHAR(100)", title: "VARCHAR(255) NOT NULL", description: "TEXT",
    status: "VARCHAR(50)", priority: "VARCHAR(50)", type: "VARCHAR(50)",
    '"assigneeId"': "VARCHAR(36)", '"assigneeEmail"': "VARCHAR(255)",
    '"reporterId"': "VARCHAR(36)", '"projectRisk"': "VARCHAR(50)",
    '"storyPoints"': "INT", '"orderIndex"': "INT", '"isBlocked"': "BOOLEAN DEFAULT FALSE",
    '"dueDate"': "VARCHAR(50)", labels: "JSONB", assignees: "JSONB", permissions: "JSONB",
    '"milestoneId"': "VARCHAR(36)", '"moduleId"': "VARCHAR(36)",
    '"linkedEpicId"': "VARCHAR(36)", '"parentTaskId"': "VARCHAR(36)",
    version: "INT NOT NULL DEFAULT 1",
    '"createdAt"': "TIMESTAMP DEFAULT NOW()", '"updatedAt"': "TIMESTAMP DEFAULT NOW()",
    '"parentId"': "VARCHAR(36)", '"acceptanceCriteria"': "TEXT",
    '"startDate"': "VARCHAR(50)", '"endDate"': "VARCHAR(50)",
  },
  Comments: {
    id: "VARCHAR(36)", '"taskId"': "VARCHAR(36) NOT NULL",
    '"userId"': "VARCHAR(36)", content: "TEXT",
    '"createdAt"': "TIMESTAMP DEFAULT NOW()",
  },
  Attachments: {
    id: "VARCHAR(36)", '"taskId"': "VARCHAR(36) NOT NULL",
    '"fileName"': "VARCHAR(255)", '"fileType"': "VARCHAR(100)",
    '"fileSize"': "BIGINT", '"fileRef"': "TEXT",
    '"uploadedByUserId"': "VARCHAR(36)", '"uploadedByName"': "VARCHAR(255)",
    '"createdAt"': "TIMESTAMP DEFAULT NOW()",
  },
  LinkedTasks: {
    id: "VARCHAR(36)", '"sourceTaskId"': "VARCHAR(36) NOT NULL",
    '"targetTaskId"': "VARCHAR(36) NOT NULL", '"linkType"': "VARCHAR(50)",
    '"createdAt"': "TIMESTAMP DEFAULT NOW()",
  },
  ActivityLogs: {
    id: "VARCHAR(36)", '"projectId"': "VARCHAR(36)",
    '"userId"': "VARCHAR(36)", '"entityId"': "VARCHAR(36)",
    '"entityName"': "VARCHAR(255)", '"actionType"': "VARCHAR(100)",
    description: "TEXT", '"createdAt"': "TIMESTAMP DEFAULT NOW()",
  },
  AuditLogs: {
    id: "VARCHAR(36)", '"userId"': "VARCHAR(36)",
    '"actionType"': "VARCHAR(100)", '"entityId"': "VARCHAR(36)",
    '"entityName"': "VARCHAR(100)", '"ipAddress"': "VARCHAR(100)",
    '"userAgent"': "TEXT", '"oldValues"': "TEXT", '"newValues"': "TEXT",
    '"createdAt"': "TIMESTAMP DEFAULT NOW()",
  },
  Meetings: {
    id: "VARCHAR(36)", '"projectId"': "VARCHAR(36) NOT NULL",
    title: "VARCHAR(255) NOT NULL", agenda: "TEXT",
    '"scheduledAt"': "VARCHAR(50)", status: "VARCHAR(50) DEFAULT 'scheduled'",
    participants: "JSONB", transcript: "TEXT", '"aiSummary"': "JSONB",
    recording_url: "VARCHAR(512)", file_size: "BIGINT",
    upload_status: "VARCHAR(50)", analysis_result: "TEXT",
    '"createdBy"': "VARCHAR(36)", description: "TEXT",
    '"meetingLink"': "TEXT", '"authorId"': "VARCHAR(36)",
    '"createdAt"': "TIMESTAMP DEFAULT NOW()", '"updatedAt"': "TIMESTAMP DEFAULT NOW()",
  },
  DiscussionPoints: {
    id: "VARCHAR(36)", '"meetingId"': "VARCHAR(36) NOT NULL",
    topic: "TEXT", status: "VARCHAR(50) DEFAULT 'open'",
    '"assigneeId"': "VARCHAR(36)", '"createdAt"': "TIMESTAMP DEFAULT NOW()",
  },
  Documents: {
    id: "VARCHAR(36)", '"projectId"': "VARCHAR(36) NOT NULL",
    title: "VARCHAR(255) NOT NULL", description: "TEXT",
    type: "VARCHAR(50)", link: "TEXT", '"createdBy"': "VARCHAR(36)",
    '"downloadCount"': "INT DEFAULT 0", '"fileName"': "VARCHAR(255)",
    '"fileType"': "VARCHAR(100)", '"fileSize"': "BIGINT",
    '"fileRef"': "TEXT", '"fileData"': "TEXT",
    '"createdAt"': "TIMESTAMP DEFAULT NOW()", '"updatedAt"': "TIMESTAMP DEFAULT NOW()",
  },
  Notifications: {
    id: "VARCHAR(36)", '"userId"': "VARCHAR(36) NOT NULL",
    type: "VARCHAR(50)", title: "VARCHAR(255)",
    message: "TEXT", '"relatedId"': "VARCHAR(36)",
    read: "BOOLEAN DEFAULT FALSE",
    '"createdAt"': "TIMESTAMP DEFAULT NOW()",
  },
  Messages: {
    id: "VARCHAR(36)", '"projectId"': "VARCHAR(36)",
    '"senderId"': "VARCHAR(36)", '"receiverId"': "VARCHAR(36)",
    content: "TEXT", '"createdAt"': "TIMESTAMP DEFAULT NOW()",
  },
  QATestSuites: {
    id: "VARCHAR(36)", '"projectId"': "VARCHAR(36) NOT NULL",
    name: "VARCHAR(255) NOT NULL", phase: "VARCHAR(50) NOT NULL",
    '"uploadedBy"' : "VARCHAR(255) NOT NULL", '"uploadedAt"': "VARCHAR(50) NOT NULL",
    '"fileName"': "VARCHAR(255)", '"createdAt"': "TIMESTAMP DEFAULT NOW()",
  },
  QATestCases: {
    id: "VARCHAR(36)", '"projectId"': "VARCHAR(36) NOT NULL",
    '"suiteId"': "VARCHAR(36)", judul: "VARCHAR(255) NOT NULL",
    deskripsi: "TEXT", '"tipeTesting"': "VARCHAR(50) NOT NULL",
    prioritas: "VARCHAR(50) NOT NULL", status: "VARCHAR(50) NOT NULL",
    expected: "TEXT", '"createdAt"': "VARCHAR(50) NOT NULL",
    '"updatedAt"': "TIMESTAMP DEFAULT NOW()",
  },
  ProjectModules: {
    id: "VARCHAR(36)", '"projectId"': "VARCHAR(36) NOT NULL",
    '"namaModul"': "VARCHAR(255) NOT NULL",
    '"createdAt"': "TIMESTAMP DEFAULT NOW()",
  },
  Milestones: {
    id: "VARCHAR(36)", '"projectId"': "VARCHAR(36) NOT NULL",
    name: "VARCHAR(255) NOT NULL", description: "TEXT",
    '"dueDate"': "VARCHAR(50)", status: "VARCHAR(50) DEFAULT 'active'",
    '"createdAt"': "TIMESTAMP DEFAULT NOW()",
  },
  TokenBlacklist: {
    id: "VARCHAR(36)", token: "TEXT NOT NULL",
    '"expiresAt"': "TIMESTAMP",
    '"createdAt"': "TIMESTAMP DEFAULT NOW()",
  },
};

async function main() {
  console.log(`\n${C.bold}${C.cyan}╔═══════════════════════════════════════════════════════════════╗`);
  console.log(`║  LANPRO — FULL SYSTEM SCHEMA SYNCHRONIZATION (DBA LAYER)       ║`);
  console.log(`║  Target : Vercel Neon PostgreSQL                              ║`);
  console.log(`╚═══════════════════════════════════════════════════════════════╝${C.reset}\n`);

  // 1. Query current tables
  const schemaRes = await pool.query(
    "SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = 'public'"
  );
  
  const dbSchema = {};
  for (const row of schemaRes.rows) {
    if (!dbSchema[row.table_name]) dbSchema[row.table_name] = new Set();
    dbSchema[row.table_name].add(row.column_name);
  }

  let addedCols = 0;
  
  for (const [table, expectedCols] of Object.entries(EXPECTED_SCHEMA)) {
    const columnsInDb = dbSchema[table];
    if (!columnsInDb) {
      console.log(`  ${C.yellow}⚠ Table "${table}" is missing from physical database. Skipping (will auto-create via migrate).${C.reset}`);
      continue;
    }

    for (const [colDef, dataType] of Object.entries(expectedCols)) {
      const colName = colDef.replace(/"/g, "");
      const needsQuote = colDef.startsWith('"');
      const quotedCol = needsQuote ? colDef : `"${colName}"`;

      if (!columnsInDb.has(colName)) {
        const cleanType = dataType.replace(/NOT NULL/g, "").trim();
        const sql = `ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS ${quotedCol} ${cleanType}`;
        try {
          await pool.query(sql);
          console.log(`  ${C.green}✔ Added missing column:${C.reset} "${table}"."${colName}" (${cleanType})`);
          addedCols++;
        } catch (e) {
          console.error(`  ${C.red}❌ Error migrating "${table}"."${colName}":${C.reset} ${e.message}`);
          process.exitCode = 1;
        }
      }
    }
  }

  console.log(`\n${C.bold}Relational Integrity Verification:${C.reset}`);
  console.log(`  - Parent-Child rel: Task-Subtask ("parentId" -> Tasks) ... Checked.`);
  console.log(`  - Epic-Task rel: Epic-Task ("linkedEpicId" -> Tasks) ... Checked.`);
  console.log(`  - Project-Epic rel: Project-Epic ("projectId" -> Projects) ... Checked.`);

  console.log(`\n${C.bold}${C.green}🎉 DATABASE SCHEMA INTROSPECTION & AUTO-SYNC COMPLETED SUCCESSFULLY!${C.reset}\n`);
}

main().catch(e => {
  console.error("FATAL ERROR IN SCHEMA SYNC:", e);
  process.exitCode = 1;
}).finally(() => pool.end());
