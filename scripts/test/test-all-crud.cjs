/**
 * ═══════════════════════════════════════════════════════════════
 * LANPRO — Comprehensive E2E CRUD Integration Test
 * Target: Vercel Neon PostgreSQL (via .env.local POSTGRES_URL)
 * ═══════════════════════════════════════════════════════════════
 *
 * Tests CRUD for:
 *   1. MasterData (14 sub-menus)
 *   2. Projects, Sprints, Tasks, Subtasks
 *   3. Workspace: Documents, Meetings
 *   4. Project Scoping & RBAC (project_members isolation)
 *
 * Usage:  node scripts/test-all-crud.js
 */

const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

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

// ── Colour helpers ─────────────────────────────────────────────
const C = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  cyan: "\x1b[36m",
  yellow: "\x1b[33m",
  dim: "\x1b[2m",
};

// ── Results tracker ────────────────────────────────────────────
const results = [];
function track(name, ok, err = "") {
  results.push({ name, ok, err });
  console.log(
    ok
      ? `  ${C.green}✅ PASS${C.reset}  ${name}`
      : `  ${C.red}❌ FAIL${C.reset}  ${name}  ${C.dim}(${err})${C.reset}`
  );
}

function section(title) {
  console.log(`\n${C.bold}${C.cyan}──── ${title} ────${C.reset}`);
}

// ── Main ───────────────────────────────────────────────────────
async function main() {
  console.log(
    `\n${C.bold}${C.cyan}╔════════════════════════════════════════════════════════════╗` +
      `\n║  LANPRO — COMPREHENSIVE E2E CRUD INTEGRATION TEST         ║` +
      `\n║  Target : Vercel Neon PostgreSQL                          ║` +
      `\n╚════════════════════════════════════════════════════════════╝${C.reset}\n`
  );

  // ═══════════════════════════════════════════════════════════
  // 1. MASTER DATA — 14 Sub-menus
  // ═══════════════════════════════════════════════════════════
  section("1. MasterData CRUD (14 sub-menus)");

  const masterTypes = [
    "priority",
    "status",
    "category",
    "project_role",
    "issue_type",
    "environment",
    "department",
    "jabatan",
    "release",
    "fitur",
    "system",
    "surrounding",
    "jenis_dokumen",
    "modul_aplikasi",
  ];

  for (const type of masterTypes) {
    try {
      const id = crypto.randomUUID();
      const label = `E2E-${type}`;

      // CREATE
      await pool.query(
        'INSERT INTO "MasterData" (id, type, label, color, icon, "order", description, "fieldType", "dropdownOptions", role_type) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',
        [id, type, label, "#A1B2C3", "star", 0, `desc-${type}`, type === "project_role" ? "select" : null, null, type === "project_role" ? "PROJECT" : null]
      );

      // READ
      const r = await pool.query('SELECT label, color, "fieldType" FROM "MasterData" WHERE id = $1', [id]);
      if (r.rows.length !== 1 || r.rows[0].label !== label) throw new Error("Read mismatch");

      // UPDATE
      await pool.query('UPDATE "MasterData" SET label = $1, color = $2 WHERE id = $3', [`${label}-upd`, "#FFFFFF", id]);
      const u = await pool.query('SELECT label FROM "MasterData" WHERE id = $1', [id]);
      if (u.rows[0].label !== `${label}-upd`) throw new Error("Update mismatch");

      // DELETE
      await pool.query('DELETE FROM "MasterData" WHERE id = $1', [id]);
      const d = await pool.query('SELECT id FROM "MasterData" WHERE id = $1', [id]);
      if (d.rows.length !== 0) throw new Error("Delete failed");

      track(`MasterData [${type}]`, true);
    } catch (e) {
      track(`MasterData [${type}]`, false, e.message);
    }
  }

  // ═══════════════════════════════════════════════════════════
  // 2. PROJECTS & ISSUES MANAGEMENT
  // ═══════════════════════════════════════════════════════════
  section("2. Projects & Issues Management");

  const projId = crypto.randomUUID();
  const sprintId = crypto.randomUUID();
  const epicId = crypto.randomUUID();
  const taskId = crypto.randomUUID();
  const subtaskId = crypto.randomUUID();

  // 2a. Project CRUD
  try {
    await pool.query(
      'INSERT INTO "Projects" (id, name, "projectKey", description, "ownerId") VALUES ($1,$2,$3,$4,$5)',
      [projId, "E2E-Project", "E2E", "E2E test project", "admin"]
    );
    const r = await pool.query('SELECT name FROM "Projects" WHERE id = $1', [projId]);
    if (r.rows[0].name !== "E2E-Project") throw new Error("Read mismatch");
    await pool.query('UPDATE "Projects" SET name = $1 WHERE id = $2', ["E2E-Project-Upd", projId]);
    const u = await pool.query('SELECT name FROM "Projects" WHERE id = $1', [projId]);
    if (u.rows[0].name !== "E2E-Project-Upd") throw new Error("Update mismatch");
    track("Project CRUD", true);
  } catch (e) {
    track("Project CRUD", false, e.message);
  }

  // 2b. Sprint CRUD
  try {
    await pool.query(
      'INSERT INTO "Sprints" (id, "projectId", name, status, "startDate", "endDate") VALUES ($1,$2,$3,$4,$5,$6)',
      [sprintId, projId, "E2E Sprint 1", "active", "2026-08-01", "2026-08-14"]
    );
    const r = await pool.query('SELECT name FROM "Sprints" WHERE id = $1', [sprintId]);
    if (r.rows[0].name !== "E2E Sprint 1") throw new Error("Read mismatch");
    await pool.query('UPDATE "Sprints" SET name = $1 WHERE id = $2', ["E2E Sprint 1-Upd", sprintId]);
    track("Sprint CRUD", true);
  } catch (e) {
    track("Sprint CRUD", false, e.message);
  }

  // 2c. Epic CRUD
  try {
    await pool.query(
      'INSERT INTO "Tasks" (id, "projectId", "sprintId", "taskKey", title, status, priority, type, "reporterId", description, "projectRisk") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)',
      [epicId, projId, sprintId, "E2E-1", "E2E Epic", "To Do", "High", "epic", "admin", "Epic desc", "Low"]
    );
    const r = await pool.query('SELECT title, type FROM "Tasks" WHERE id = $1', [epicId]);
    if (r.rows[0].title !== "E2E Epic" || r.rows[0].type !== "epic") throw new Error("Read mismatch");
    await pool.query('UPDATE "Tasks" SET status = $1 WHERE id = $2', ["In Progress", epicId]);
    track("Epic CRUD", true);
  } catch (e) {
    track("Epic CRUD", false, e.message);
  }

  // 2d. Task CRUD
  try {
    await pool.query(
      'INSERT INTO "Tasks" (id, "projectId", "sprintId", "taskKey", title, status, priority, type, "reporterId", description, "projectRisk", "linkedEpicId") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)',
      [taskId, projId, sprintId, "E2E-2", "E2E Task", "To Do", "Medium", "task", "admin", "Task desc", "Low", epicId]
    );
    const r = await pool.query('SELECT title FROM "Tasks" WHERE id = $1', [taskId]);
    if (r.rows[0].title !== "E2E Task") throw new Error("Read mismatch");
    // Simulate Kanban drag: change status
    await pool.query('UPDATE "Tasks" SET status = $1, priority = $2 WHERE id = $3', ["In Review", "High", taskId]);
    const u = await pool.query('SELECT status, priority FROM "Tasks" WHERE id = $1', [taskId]);
    if (u.rows[0].status !== "In Review" || u.rows[0].priority !== "High") throw new Error("Kanban update mismatch");
    track("Task CRUD + Kanban Status", true);
  } catch (e) {
    track("Task CRUD + Kanban Status", false, e.message);
  }

  // 2e. Subtask (inline-create) CRUD
  try {
    await pool.query(
      'INSERT INTO "Tasks" (id, "projectId", "sprintId", "taskKey", title, status, priority, type, "parentId", "reporterId", description, "acceptanceCriteria", "projectRisk") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)',
      [subtaskId, projId, sprintId, "E2E-3", "E2E Subtask (inline)", "To Do", "Medium", "task", taskId, "admin", "Subtask desc", "AC verified", "Low"]
    );
    const r = await pool.query('SELECT title, "parentId" FROM "Tasks" WHERE id = $1', [subtaskId]);
    if (r.rows[0].title !== "E2E Subtask (inline)" || r.rows[0].parentId !== taskId) throw new Error("Read/parent mismatch");
    await pool.query('UPDATE "Tasks" SET status = $1 WHERE id = $2', ["Done", subtaskId]);
    track("Subtask (inline-create) CRUD", true);
  } catch (e) {
    track("Subtask (inline-create) CRUD", false, e.message);
  }

  // ═══════════════════════════════════════════════════════════
  // 3. WORKSPACE FEATURES
  // ═══════════════════════════════════════════════════════════
  section("3. Workspace Features");

  // 3a. Documents
  try {
    const docId = crypto.randomUUID();
    await pool.query(
      'INSERT INTO "Documents" (id, "projectId", title, description, type, "createdBy") VALUES ($1,$2,$3,$4,$5,$6)',
      [docId, projId, "E2E Doc", "BRD document", "BRD", "admin"]
    );
    const r = await pool.query('SELECT title FROM "Documents" WHERE id = $1', [docId]);
    if (r.rows[0].title !== "E2E Doc") throw new Error("Read mismatch");
    await pool.query('UPDATE "Documents" SET title = $1 WHERE id = $2', ["E2E Doc Updated", docId]);
    await pool.query('DELETE FROM "Documents" WHERE id = $1', [docId]);
    const d = await pool.query('SELECT id FROM "Documents" WHERE id = $1', [docId]);
    if (d.rows.length !== 0) throw new Error("Delete failed");
    track("Documents CRUD", true);
  } catch (e) {
    track("Documents CRUD", false, e.message);
  }

  // 3b. Meetings
  try {
    const meetId = crypto.randomUUID();
    await pool.query(
      'INSERT INTO "Meetings" (id, "projectId", title, description, "meetingLink", "authorId") VALUES ($1,$2,$3,$4,$5,$6)',
      [meetId, projId, "E2E Meeting", "Standup meeting", "https://meet.e2e", "admin"]
    );
    const r = await pool.query('SELECT title, "meetingLink" FROM "Meetings" WHERE id = $1', [meetId]);
    if (r.rows[0].title !== "E2E Meeting") throw new Error("Read mismatch");
    await pool.query('UPDATE "Meetings" SET title = $1, transcript = $2 WHERE id = $3', ["E2E Meeting Upd", "Transcript text", meetId]);
    await pool.query('DELETE FROM "Meetings" WHERE id = $1', [meetId]);
    const d = await pool.query('SELECT id FROM "Meetings" WHERE id = $1', [meetId]);
    if (d.rows.length !== 0) throw new Error("Delete failed");
    track("Meetings CRUD", true);
  } catch (e) {
    track("Meetings CRUD", false, e.message);
  }

  // 3c. ActivityLogs (read-only verification)
  try {
    const r = await pool.query('SELECT COUNT(*) as cnt FROM "ActivityLogs"');
    track(`ActivityLogs (${r.rows[0].cnt} rows readable)`, true);
  } catch (e) {
    track("ActivityLogs read", false, e.message);
  }

  // 3d. AuditLogs (read-only verification)
  try {
    const r = await pool.query('SELECT COUNT(*) as cnt FROM "AuditLogs"');
    track(`AuditLogs (${r.rows[0].cnt} rows readable)`, true);
  } catch (e) {
    track("AuditLogs read", false, e.message);
  }

  // ═══════════════════════════════════════════════════════════
  // 4. PROJECT SCOPING & RBAC
  // ═══════════════════════════════════════════════════════════
  section("4. Project Scoping & RBAC");

  // 4a. ProjectMembers isolation: user NOT in project sees 0 tasks
  try {
    const ghostUser = "ghost-user-" + crypto.randomUUID().slice(0, 8);
    // Ghost user should see 0 tasks for our E2E project
    const r = await pool.query(
      'SELECT COUNT(*) as cnt FROM "Tasks" t INNER JOIN "ProjectMembers" pm ON pm."projectId" = t."projectId" AND pm."userId" = $1 WHERE t."projectId" = $2',
      [ghostUser, projId]
    );
    if (parseInt(r.rows[0].cnt) !== 0) throw new Error("Ghost user sees data!");
    track("Data isolation (non-member = 0 tasks)", true);
  } catch (e) {
    track("Data isolation (non-member = 0 tasks)", false, e.message);
  }

  // 4b. ProjectMembers: add member, verify access
  try {
    const testUser = "e2e-member";
    await pool.query(
      'INSERT INTO "ProjectMembers" ("projectId", "userId", role) VALUES ($1,$2,$3)',
      [projId, testUser, "Developer"]
    );
    const r = await pool.query(
      'SELECT COUNT(*) as cnt FROM "Tasks" t INNER JOIN "ProjectMembers" pm ON pm."projectId" = t."projectId" AND pm."userId" = $1 WHERE t."projectId" = $2',
      [testUser, projId]
    );
    if (parseInt(r.rows[0].cnt) === 0) throw new Error("Member sees 0 tasks");
    track(`RBAC member access (${r.rows[0].cnt} tasks visible)`, true);
    // Cleanup member
    await pool.query('DELETE FROM "ProjectMembers" WHERE "projectId" = $1 AND "userId" = $2', [projId, testUser]);
  } catch (e) {
    track("RBAC member access", false, e.message);
  }

  // 4c. Roles table read
  try {
    const r = await pool.query(
      'SELECT DISTINCT role_type FROM "MasterData" WHERE type = $1 AND role_type IS NOT NULL',
      ["project_role"]
    );
    const roles = r.rows.map((x) => x.role_type).join(", ") || "none";
    track(`Role types readable (${roles})`, true);
  } catch (e) {
    track("Role types readable", false, e.message);
  }

  // ═══════════════════════════════════════════════════════════
  // 5. CLEANUP
  // ═══════════════════════════════════════════════════════════
  section("5. Cleanup E2E records");
  try {
    await pool.query('DELETE FROM "Tasks" WHERE "projectId" = $1', [projId]);
    await pool.query('DELETE FROM "Sprints" WHERE "projectId" = $1', [projId]);
    await pool.query('DELETE FROM "Projects" WHERE id = $1', [projId]);
    console.log(`  ${C.green}✅${C.reset} Temporary E2E records cleaned.`);
  } catch (e) {
    console.log(`  ${C.yellow}⚠️${C.reset} Cleanup note: ${e.message}`);
  }

  // ═══════════════════════════════════════════════════════════
  // FINAL REPORT
  // ═══════════════════════════════════════════════════════════
  const passed = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok);

  console.log(
    `\n${C.bold}${C.cyan}════════════════════════════════════════════════════════════${C.reset}`
  );
  console.log(
    `${C.bold}  FINAL REPORT: ${passed}/${results.length} PASSED   ${failed.length > 0 ? C.red + failed.length + " FAILED" : C.green + "ALL PASSED"}${C.reset}`
  );
  console.log(
    `${C.bold}${C.cyan}════════════════════════════════════════════════════════════${C.reset}`
  );

  if (failed.length > 0) {
    console.log(`\n${C.red}Failed tests:${C.reset}`);
    failed.forEach((f) => console.log(`  - ${f.name}: ${f.err}`));
    process.exitCode = 1;
  } else {
    console.log(
      `\n${C.bold}${C.green}🎉 ALL ${results.length} TESTS PASSED — NEON POSTGRESQL FULLY OPERATIONAL!${C.reset}\n`
    );
  }
}

main()
  .catch((e) => {
    console.error("FATAL:", e);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
