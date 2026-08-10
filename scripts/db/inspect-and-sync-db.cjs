/**
 * ══════════════════════════════════════════════════════════════════
 * LANPRO — Database Schema Introspection & Auto-Sync
 * Target: Vercel Neon PostgreSQL
 * ══════════════════════════════════════════════════════════════════
 *
 * 1. Queries information_schema for ALL existing tables & columns
 * 2. Defines the EXPECTED schema based on server.ts API handlers
 * 3. Runs ALTER TABLE ADD COLUMN IF NOT EXISTS for any gaps
 * 4. Validates camelCase column quoting in db.ts
 *
 * Usage:  node scripts/inspect-and-sync-db.cjs
 */

const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");

// ── Load .env.local ────────────────────────────────────────────
(function loadEnv() {
  const envFile = path.resolve(__dirname, "..", ".env.local");
  if (!fs.existsSync(envFile)) return;
  for (const line of fs.readFileSync(envFile, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq < 1) continue;
    const k = t.slice(0, eq).trim();
    const v = t.slice(eq + 1).trim();
    if (!process.env[k]) process.env[k] = v;
  }
})();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
  ssl: { rejectUnauthorized: false },
});

const C = { reset:"\x1b[0m", bold:"\x1b[1m", green:"\x1b[32m", red:"\x1b[31m", cyan:"\x1b[36m", yellow:"\x1b[33m", dim:"\x1b[2m" };

// ══════════════════════════════════════════════════════════════════
// EXPECTED SCHEMA — derived from server.ts API handlers
// Format: { "TableName": { "columnName": "DATA_TYPE" } }
// ══════════════════════════════════════════════════════════════════
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
    name: "VARCHAR(255) NOT NULL", description: "TEXT",
    '"createdBy"': "VARCHAR(36)", '"createdAt"': "TIMESTAMP DEFAULT NOW()",
  },
  QATestCases: {
    id: "VARCHAR(36)", '"projectId"': "VARCHAR(36) NOT NULL",
    '"suiteId"': "VARCHAR(36)", '"caseId"': "VARCHAR(100)",
    '"namaModul"': "VARCHAR(255)", '"tipeTesting"': "VARCHAR(100)",
    description: "TEXT", '"expectedResult"': "TEXT",
    '"actualResult"': "TEXT", status: "VARCHAR(50) DEFAULT 'Untested'",
    '"executionStatus"': "VARCHAR(50)", '"executedByUserId"': "VARCHAR(36)",
    '"executedByName"': "VARCHAR(255)", '"evidenceUrl"': "TEXT",
    '"evidenceType"': "VARCHAR(50)", '"evidenceName"': "VARCHAR(255)",
    '"linkedBugKey"': "VARCHAR(100)", '"commentsList"': "JSONB",
    comment: "TEXT", evidences: "JSONB",
    '"modulId"': "VARCHAR(36)", '"rowNum"': "INT",
    '"createdAt"': "TIMESTAMP DEFAULT NOW()", '"updatedAt"': "TIMESTAMP DEFAULT NOW()",
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
  console.log(`║  LANPRO — DATABASE SCHEMA INTROSPECTION & AUTO-SYNC          ║`);
  console.log(`║  Target : Vercel Neon PostgreSQL                             ║`);
  console.log(`╚═══════════════════════════════════════════════════════════════╝${C.reset}\n`);

  // ── Phase 1: Query all existing tables & columns ──────────────
  console.log(`${C.bold}Phase 1: Introspecting existing schema...${C.reset}`);
  const schemaRes = await pool.query(
    "SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = 'public' ORDER BY table_name, ordinal_position"
  );
  const existingSchema = {};
  for (const row of schemaRes.rows) {
    if (!existingSchema[row.table_name]) existingSchema[row.table_name] = new Set();
    existingSchema[row.table_name].add(row.column_name);
  }
  const existingTables = Object.keys(existingSchema);
  console.log(`  Found ${existingTables.length} tables: ${existingTables.join(", ")}`);

  // ── Phase 2: Compare & Auto-Migrate ───────────────────────────
  console.log(`\n${C.bold}Phase 2: Comparing with expected schema & auto-migrating...${C.reset}`);
  let totalAdded = 0;
  let totalAlready = 0;
  const errors = [];

  for (const [table, columns] of Object.entries(EXPECTED_SCHEMA)) {
    const existingCols = existingSchema[table];
    if (!existingCols) {
      console.log(`  ${C.yellow}⚠ Table "${table}" not found in DB — skipping (will be created on startup)${C.reset}`);
      continue;
    }

    for (const [colDef, dataType] of Object.entries(columns)) {
      // Extract raw column name (strip quotes)
      const colName = colDef.replace(/"/g, "");
      const needsQuote = colDef.startsWith('"');
      const quotedCol = needsQuote ? colDef : `"${colName}"`;

      if (existingCols.has(colName)) {
        totalAlready++;
        continue;
      }

      // Column is MISSING — run ALTER TABLE
      const cleanType = dataType.replace(/NOT NULL/g, "").trim();
      const sql = `ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS ${quotedCol} ${cleanType}`;
      try {
        await pool.query(sql);
        totalAdded++;
        console.log(`  ${C.green}✅ Added${C.reset} "${table}".${colName} (${cleanType})`);
      } catch (e) {
        errors.push({ table, col: colName, err: e.message });
        console.log(`  ${C.red}❌ Failed${C.reset} "${table}".${colName}: ${e.message}`);
      }
    }
  }

  // ── Phase 3: Verify camelCase columns in db.ts ────────────────
  console.log(`\n${C.bold}Phase 3: Verifying camelCase column mapping in db.ts...${C.reset}`);
  const dbTsPath = path.resolve(__dirname, "..", "src", "lib", "db.ts");
  const dbTsContent = fs.readFileSync(dbTsPath, "utf8");

  const requiredCamelCols = [
    "fieldType", "dropdownOptions", "meetingLink", "parentId", "acceptanceCriteria",
    "startDate", "endDate", "projectId", "sprintId", "taskKey", "assigneeId",
    "reporterId", "storyPoints", "orderIndex", "parentTaskId", "createdAt",
    "updatedAt", "ownerId", "projectKey", "taskCounter", "fileType", "fileSize",
    "fileRef", "fileData", "authorId", "createdBy", "aiSummary", "scheduledAt",
    "meetingId", "userId", "entityId", "entityName", "actionType",
    "uploadedByUserId", "uploadedByName", "downloadCount",
  ];

  const missingFromMapping = [];
  for (const col of requiredCamelCols) {
    if (!dbTsContent.includes(`'${col}'`)) {
      missingFromMapping.push(col);
    }
  }

  if (missingFromMapping.length > 0) {
    console.log(`  ${C.yellow}⚠ Missing from camelCaseCols:${C.reset} ${missingFromMapping.join(", ")}`);
  } else {
    console.log(`  ${C.green}✅ All ${requiredCamelCols.length} critical camelCase columns are mapped.${C.reset}`);
  }

  // ── Phase 4: Final Re-introspection ───────────────────────────
  console.log(`\n${C.bold}Phase 4: Final schema validation...${C.reset}`);
  const finalRes = await pool.query(
    "SELECT table_name, COUNT(*) as col_count FROM information_schema.columns WHERE table_schema = 'public' GROUP BY table_name ORDER BY table_name"
  );
  console.log(`\n  ${"Table".padEnd(25)} Columns`);
  console.log(`  ${"─".repeat(25)} ${"─".repeat(8)}`);
  for (const row of finalRes.rows) {
    console.log(`  ${row.table_name.padEnd(25)} ${row.col_count}`);
  }

  // ── Summary ───────────────────────────────────────────────────
  console.log(`\n${C.bold}${C.cyan}═══════════════════════════════════════════════════════════════${C.reset}`);
  console.log(`${C.bold}  SCHEMA SYNC SUMMARY${C.reset}`);
  console.log(`${C.bold}${C.cyan}═══════════════════════════════════════════════════════════════${C.reset}`);
  console.log(`  Columns already present : ${totalAlready}`);
  console.log(`  Columns added           : ${totalAdded}`);
  console.log(`  Errors                  : ${errors.length}`);
  console.log(`  camelCase mapping gaps  : ${missingFromMapping.length}`);

  if (errors.length > 0) {
    console.log(`\n${C.red}  Errors:${C.reset}`);
    errors.forEach((e) => console.log(`    - ${e.table}.${e.col}: ${e.err}`));
    process.exitCode = 1;
  } else {
    console.log(`\n${C.bold}${C.green}  🎉 SCHEMA FULLY SYNCHRONIZED — ALL TABLES ALIGNED!${C.reset}\n`);
  }
}

main().catch((e) => { console.error("FATAL:", e); process.exitCode = 1; }).finally(() => pool.end());
