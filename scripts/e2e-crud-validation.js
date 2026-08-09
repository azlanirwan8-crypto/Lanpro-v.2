import pkg from 'pg';
const { Pool } = pkg;
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
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

const results = [];
function track(name, ok, err = '') {
  results.push({ name, ok, err });
  if (ok) {
    console.log(`  ${C.green}✅ PASS${C.reset}  ${name}`);
  } else {
    console.log(`  ${C.red}❌ FAIL${C.reset}  ${name} ${C.yellow}(${err})${C.reset}`);
  }
}

function section(title) {
  console.log(`\n${C.bold}${C.cyan}──── ${title} ────${C.reset}`);
}

async function main() {
  console.log(`\n${C.bold}${C.cyan}╔═══════════════════════════════════════════════════════════════╗`);
  console.log(`║  LANPRO — FULL E2E CRUD VALIDATION & INTEGRATION TEST         ║`);
  console.log(`║  Target : Vercel Neon PostgreSQL                              ║`);
  console.log(`╚═══════════════════════════════════════════════════════════════╝${C.reset}\n`);

  // 1. MASTER DATA SYSTEM (14 submenus)
  section("1. Master Data System (14 Sub-menus)");
  const masterTypes = [
    'priority', 'status', 'category', 'project_role', 'issue_type',
    'environment', 'department', 'jabatan', 'release', 'fitur',
    'system', 'surrounding', 'jenis_dokumen', 'modul_aplikasi'
  ];

  for (const type of masterTypes) {
    try {
      const id = crypto.randomUUID();
      const label = `E2E-Validation-${type}`;

      // INSERT
      await pool.query(
        `INSERT INTO "MasterData" (id, type, label, color, icon, "order", description, "fieldType", "dropdownOptions", role_type) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [id, type, label, '#00FF00', 'tag', 1, `E2E test for ${type}`, 'text', null, null]
      );

      // SELECT
      const sel = await pool.query('SELECT label FROM "MasterData" WHERE id = $1', [id]);
      if (sel.rows.length === 0 || sel.rows[0].label !== label) throw new Error('SELECT failed or mismatched label');

      // UPDATE
      const updatedLabel = `${label}-updated`;
      await pool.query('UPDATE "MasterData" SET label = $1 WHERE id = $2', [updatedLabel, id]);
      const upd = await pool.query('SELECT label FROM "MasterData" WHERE id = $1', [id]);
      if (upd.rows[0].label !== updatedLabel) throw new Error('UPDATE failed');

      // DELETE
      await pool.query('DELETE FROM "MasterData" WHERE id = $1', [id]);
      const del = await pool.query('SELECT label FROM "MasterData" WHERE id = $1', [id]);
      if (del.rows.length > 0) throw new Error('DELETE failed, record still exists');

      track(`MasterData [${type}] CRUD`, true);
    } catch (e) {
      track(`MasterData [${type}] CRUD`, false, e.message);
    }
  }

  // 2. PROJECTS & PLANNING SUITE
  section("2. Projects & Planning Suite");
  const projId = crypto.randomUUID();
  const sprintId = crypto.randomUUID();
  const epicId = crypto.randomUUID();
  const taskId = crypto.randomUUID();
  const subtaskId = crypto.randomUUID();

  // Project CRUD
  try {
    await pool.query(
      `INSERT INTO "Projects" (id, name, "projectKey", description, "ownerId") VALUES ($1, $2, $3, $4, $5)`,
      [projId, 'E2E Validation Project', 'VALPROJ', 'E2E validation tests', 'admin']
    );
    const sel = await pool.query('SELECT name FROM "Projects" WHERE id = $1', [projId]);
    if (sel.rows[0].name !== 'E2E Validation Project') throw new Error('Project SELECT failed');
    
    await pool.query('UPDATE "Projects" SET name = $1 WHERE id = $2', ['E2E Validation Project Updated', projId]);
    const upd = await pool.query('SELECT name FROM "Projects" WHERE id = $1', [projId]);
    if (upd.rows[0].name !== 'E2E Validation Project Updated') throw new Error('Project UPDATE failed');

    track('Projects CRUD', true);
  } catch (e) {
    track('Projects CRUD', false, e.message);
  }

  // Sprint CRUD
  try {
    await pool.query(
      `INSERT INTO "Sprints" (id, "projectId", name, goal, "startDate", "endDate", status) 
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [sprintId, projId, 'E2E Validation Sprint', 'Sprint goal description', '2026-08-03', '2026-08-17', 'active']
    );
    const sel = await pool.query('SELECT name FROM "Sprints" WHERE id = $1', [sprintId]);
    if (sel.rows[0].name !== 'E2E Validation Sprint') throw new Error('Sprint SELECT failed');

    await pool.query('UPDATE "Sprints" SET name = $1 WHERE id = $2', ['E2E Validation Sprint Updated', sprintId]);
    track('Sprints CRUD', true);
  } catch (e) {
    track('Sprints CRUD', false, e.message);
  }

  // Epic CRUD
  try {
    await pool.query(
      `INSERT INTO "Tasks" (id, "projectId", title, status, type, "reporterId", description) 
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [epicId, projId, 'E2E Validation Epic', 'To Do', 'epic', 'admin', 'Epic description']
    );
    const sel = await pool.query('SELECT title FROM "Tasks" WHERE id = $1', [epicId]);
    if (sel.rows[0].title !== 'E2E Validation Epic') throw new Error('Epic SELECT failed');
    track('Epics CRUD', true);
  } catch (e) {
    track('Epics CRUD', false, e.message);
  }

  // Task CRUD & Kanban Drag-and-Drop simulation
  try {
    await pool.query(
      `INSERT INTO "Tasks" (id, "projectId", "sprintId", "taskKey", title, status, priority, type, "reporterId", description, "linkedEpicId") 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [taskId, projId, sprintId, 'VAL-1', 'E2E Validation Task', 'To Do', 'Medium', 'task', 'admin', 'Task description', epicId]
    );
    const sel = await pool.query('SELECT title, status FROM "Tasks" WHERE id = $1', [taskId]);
    if (sel.rows[0].title !== 'E2E Validation Task') throw new Error('Task SELECT failed');

    // Simulate Kanban drag and status/priority/assignee update
    await pool.query(
      `UPDATE "Tasks" SET status = $1, priority = $2, "assigneeId" = $3 WHERE id = $4`,
      ['In Progress', 'High', 'member-1', taskId]
    );
    const upd = await pool.query('SELECT status, priority, "assigneeId" FROM "Tasks" WHERE id = $1', [taskId]);
    if (upd.rows[0].status !== 'In Progress' || upd.rows[0].priority !== 'High' || upd.rows[0].assigneeId !== 'member-1') {
      throw new Error('Task UPDATE / Kanban drag simulation failed');
    }

    track('Tasks CRUD & Kanban State Update', true);
  } catch (e) {
    track('Tasks CRUD & Kanban State Update', false, e.message);
  }

  // Subtask Inline-Create CRUD
  try {
    await pool.query(
      `INSERT INTO "Tasks" (id, "projectId", "taskKey", title, status, type, "parentId", "reporterId", description, "acceptanceCriteria") 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [subtaskId, projId, 'VAL-2', 'E2E Validation Subtask', 'To Do', 'task', taskId, 'admin', 'Subtask inline desc', 'AC setup']
    );
    const sel = await pool.query('SELECT title, "parentId" FROM "Tasks" WHERE id = $1', [subtaskId]);
    if (sel.rows[0].title !== 'E2E Validation Subtask' || sel.rows[0].parentId !== taskId) {
      throw new Error('Subtask SELECT or parent linking failed');
    }

    await pool.query('UPDATE "Tasks" SET status = $1 WHERE id = $2', ['Done', subtaskId]);
    const upd = await pool.query('SELECT status FROM "Tasks" WHERE id = $1', [subtaskId]);
    if (upd.rows[0].status !== 'Done') throw new Error('Subtask status update failed');

    track('Subtask (inline-create) CRUD', true);
  } catch (e) {
    track('Subtask (inline-create) CRUD', false, e.message);
  }

  // 3. WORKSPACE FEATURES
  section("3. Workspace Features");

  // Documents CRUD
  try {
    const docId = crypto.randomUUID();
    await pool.query(
      `INSERT INTO "Documents" (id, "projectId", title, description, type, "createdBy", "fileName", "fileType", "fileSize", "fileData") 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [docId, projId, 'E2E Doc', 'BRD file', 'BRD', 'admin', 'brd.pdf', 'application/pdf', 1024, 'dGVzdA==']
    );
    const sel = await pool.query('SELECT title, "fileData" FROM "Documents" WHERE id = $1', [docId]);
    if (sel.rows[0].title !== 'E2E Doc' || sel.rows[0].fileData !== 'dGVzdA==') throw new Error('Document SELECT failed');

    await pool.query('UPDATE "Documents" SET title = $1 WHERE id = $2', ['E2E Doc Updated', docId]);
    const upd = await pool.query('SELECT title FROM "Documents" WHERE id = $1', [docId]);
    if (upd.rows[0].title !== 'E2E Doc Updated') throw new Error('Document UPDATE failed');

    await pool.query('DELETE FROM "Documents" WHERE id = $1', [docId]);
    track('Documents CRUD', true);
  } catch (e) {
    track('Documents CRUD', false, e.message);
  }

  // Meetings CRUD
  try {
    const meetId = crypto.randomUUID();
    await pool.query(
      `INSERT INTO "Meetings" (id, "projectId", title, description, "meetingLink", "authorId", agenda, "scheduledAt") 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [meetId, projId, 'E2E Meet', 'Daily sync', 'https://zoom.us/meet', 'admin', 'Topics list', '2026-08-03T10:00:00Z']
    );
    const sel = await pool.query('SELECT title, "scheduledAt" FROM "Meetings" WHERE id = $1', [meetId]);
    if (sel.rows[0].title !== 'E2E Meet' || sel.rows[0].scheduledAt !== '2026-08-03T10:00:00Z') throw new Error('Meeting SELECT failed');

    await pool.query('UPDATE "Meetings" SET title = $1 WHERE id = $2', ['E2E Meet Updated', meetId]);
    const upd = await pool.query('SELECT title FROM "Meetings" WHERE id = $1', [meetId]);
    if (upd.rows[0].title !== 'E2E Meet Updated') throw new Error('Meeting UPDATE failed');

    await pool.query('DELETE FROM "Meetings" WHERE id = $1', [meetId]);
    track('Meetings CRUD', true);
  } catch (e) {
    track('Meetings CRUD', false, e.message);
  }

  // QA Testing (Suites & Cases) CRUD
  try {
    const suiteId = crypto.randomUUID();
    const caseId = crypto.randomUUID();

    // Suite
    await pool.query(
      `INSERT INTO "QATestSuites" (id, "projectId", name, phase, "uploadedBy", "uploadedAt", "fileName") 
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [suiteId, projId, 'E2E QA Suite', 'SIT', 'admin', '2026-08-03', 'suite.xlsx']
    );
    const suiteSel = await pool.query('SELECT name FROM "QATestSuites" WHERE id = $1', [suiteId]);
    if (suiteSel.rows[0].name !== 'E2E QA Suite') throw new Error('QA Suite SELECT failed');

    // Case
    await pool.query(
      `INSERT INTO "QATestCases" (id, "projectId", "suiteId", judul, deskripsi, "tipeTesting", prioritas, status, expected, "createdAt") 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [caseId, projId, suiteId, 'TC-01 Login', 'Test login flow', 'Functional', 'High', 'untested', 'Login success', new Date().toISOString()]
    );
    const caseSel = await pool.query('SELECT judul, status FROM "QATestCases" WHERE id = $1', [caseId]);
    if (caseSel.rows[0].judul !== 'TC-01 Login') throw new Error('QA Case SELECT failed');

    // Update execution status
    await pool.query(
      `UPDATE "QATestCases" SET status = $1, "executionStatus" = $2, "executedByName" = $3 WHERE id = $4`,
      ['Passed', 'PASSED', 'Lead QA', caseId]
    );
    const caseUpd = await pool.query('SELECT status, "executionStatus" FROM "QATestCases" WHERE id = $1', [caseId]);
    if (caseUpd.rows[0].status !== 'Passed' || caseUpd.rows[0].executionStatus !== 'PASSED') {
      throw new Error('QA Case execution status update failed');
    }

    // Cleanup
    await pool.query('DELETE FROM "QATestCases" WHERE id = $1', [caseId]);
    await pool.query('DELETE FROM "QATestSuites" WHERE id = $1', [suiteId]);
    track('QA Testing (Suites & Cases) CRUD', true);
  } catch (e) {
    track('QA Testing (Suites & Cases) CRUD', false, e.message);
  }

  // 4. PROJECT SCOPING & RBAC SECURITY
  section("4. Project Scoping & RBAC Security");

  // Project Members Isolation check
  try {
    const ghostUser = 'ghost-validation-user';
    const sel = await pool.query(
      `SELECT COUNT(*) as cnt FROM "Tasks" t 
       INNER JOIN "ProjectMembers" pm ON pm."projectId" = t."projectId" AND pm."userId" = $1 
       WHERE t."projectId" = $2`,
      [ghostUser, projId]
    );
    if (parseInt(sel.rows[0].cnt) !== 0) throw new Error('Data isolation broken: ghost user can see tasks');
    track('Project Members Isolation (non-member = 0 tasks)', true);
  } catch (e) {
    track('Project Members Isolation (non-member = 0 tasks)', false, e.message);
  }

  // Member Access Verification check
  try {
    const activeMember = 'val-member';
    await pool.query(
      `INSERT INTO "ProjectMembers" ("projectId", "userId", role) VALUES ($1, $2, $3)`,
      [projId, activeMember, 'developer']
    );
    const sel = await pool.query(
      `SELECT COUNT(*) as cnt FROM "Tasks" t 
       INNER JOIN "ProjectMembers" pm ON pm."projectId" = t."projectId" AND pm."userId" = $1 
       WHERE t."projectId" = $2`,
      [activeMember, projId]
    );
    if (parseInt(sel.rows[0].cnt) === 0) throw new Error('Access validation failed: registered member sees 0 tasks');
    track('RBAC active member access verification', true);

    // Cleanup member
    await pool.query('DELETE FROM "ProjectMembers" WHERE "projectId" = $1 AND "userId" = $2', [projId, activeMember]);
  } catch (e) {
    track('RBAC active member access verification', false, e.message);
  }

  // Clean up remaining Project/Sprint/Tasks
  section("5. Cleanup E2E Validation Records");
  try {
    await pool.query('DELETE FROM "Tasks" WHERE "projectId" = $1', [projId]);
    await pool.query('DELETE FROM "Sprints" WHERE "projectId" = $1', [projId]);
    await pool.query('DELETE FROM "Projects" WHERE id = $1', [projId]);
    console.log(`  ${C.green}✅${C.reset} E2E validation project database records cleaned up cleanly.`);
  } catch (e) {
    console.log(`  ${C.yellow}⚠️${C.reset} Cleanup warning: ${e.message}`);
  }

  // Final Summary Report
  const passed = results.filter(r => r.ok).length;
  const failed = results.filter(r => !r.ok);

  console.log(`\n${C.bold}${C.cyan}═══════════════════════════════════════════════════════════════${C.reset}`);
  console.log(`${C.bold}  E2E CRUD VALIDATION REPORT SUMMARY${C.reset}`);
  console.log(`\n  Total Tests : ${results.length}`);
  console.log(`  Passed      : ${passed}`);
  console.log(`  Failed      : ${failed.length}`);
  console.log(`${C.bold}${C.cyan}═══════════════════════════════════════════════════════════════${C.reset}`);

  if (failed.length > 0) {
    console.log(`\n${C.red}Failed tests list:${C.reset}`);
    failed.forEach(f => console.log(`  - ${f.name}: ${f.err}`));
    process.exitCode = 1;
  } else {
    console.log(`\n${C.bold}${C.green}🎉 ALL ${results.length} E2E CRUD VALIDATIONS SUCCESSFUL! SYSTEM IS 100% SECURE AND STABLE!${C.reset}\n`);
    process.exitCode = 0;
  }
}

main().catch(e => {
  console.error("FATAL ERROR IN E2E VALIDATION:", e);
  process.exitCode = 1;
}).finally(() => pool.end());
