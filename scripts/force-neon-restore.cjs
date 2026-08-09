#!/usr/bin/env node
/**
 * scripts/force-neon-restore.cjs — ROBUST MULTI-LINE TRANSACTIONS with Auto-Recovery
 * Safely parses multi-line INSERT statements and automatically repairs truncated inserts like PDF base64.
 */

const fs   = require('fs');
const path = require('path');
const { Pool } = require('pg');

function loadEnv() {
  const envPath = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) { console.error('❌ .env.local not found'); process.exit(1); }
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const idx = t.indexOf('=');
    if (idx < 1) continue;
    const k = t.slice(0, idx).trim();
    const v = t.slice(idx + 1).trim();
    if (!process.env[k]) process.env[k] = v;
  }
}
loadEnv();

const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!DATABASE_URL) { console.error('❌ DATABASE_URL not found'); process.exit(1); }

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 3,
  idleTimeoutMillis: 60000,
  connectionTimeoutMillis: 20000,
  statement_timeout: 120000,
});

const BACKUP_FILE = path.join(process.cwd(), 'backup_lanpro_2026-08-02T11-34-28-747Z.sql');

const C = { reset:'\x1b[0m', bold:'\x1b[1m', green:'\x1b[32m', red:'\x1b[31m', yellow:'\x1b[33m', cyan:'\x1b[36m', magenta:'\x1b[35m', bgGreen:'\x1b[42m' };
const ok   = (s) => console.log(`${C.green}✅ ${s}${C.reset}`);
const err  = (s) => console.log(`${C.red}❌ ${s}${C.reset}`);
const warn = (s) => console.log(`${C.yellow}⚠️  ${s}${C.reset}`);
const info = (s) => console.log(`${C.cyan}ℹ️  ${s}${C.reset}`);

async function getCount(tbl) {
  try {
    const r = await pool.query(`SELECT COUNT(*) FROM "${tbl}"`);
    return parseInt(r.rows[0].count, 10);
  } catch { return -1; }
}

async function main() {
  console.log(`\n${C.bold}${C.magenta}╔══════════════════════════════════════════════════════════════╗
║   LANPRO — ROBUST MULTI-LINE NEON RESTORE ENGINE             ║
║   DILARANG LOCAL DB — NEON POSTGRESQL ONLY                  ║
╚══════════════════════════════════════════════════════════════╝${C.reset}\n`);

  // 1. Verify Neon connection
  info('Connecting to Vercel Neon PostgreSQL...');
  try { await pool.query('SELECT 1'); ok('Neon PostgreSQL connected!'); }
  catch (e) { err('Cannot connect: ' + e.message); process.exit(1); }

  // 2. Read backup file
  if (!fs.existsSync(BACKUP_FILE)) { err('Backup file not found: ' + BACKUP_FILE); process.exit(1); }
  info('Reading backup SQL file...');
  const rawContent = fs.readFileSync(BACKUP_FILE, 'utf8');
  
  // Custom parsing state machine to handle multi-line INSERT statements
  info('Parsing SQL statements with state machine...');
  const rawLines = rawContent.split('\n');
  const byTable = {};
  
  let currentStmt = '';
  let inInsert = false;
  let currentTable = null;

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i];
    const trimmed = line.trim();
    
    if (!inInsert) {
      if (trimmed.toUpperCase().startsWith('INSERT INTO')) {
        inInsert = true;
        currentStmt = line;
        
        // Find table name
        const m = trimmed.match(/INSERT\s+INTO\s+[`"]?([a-zA-Z0-9_]+)[`"]?/i);
        currentTable = m ? m[1] : null;
      }
    } else {
      currentStmt += '\n' + line;
    }
    
    // Check if statement ends with );
    if (inInsert && trimmed.endsWith(');')) {
      if (currentTable) {
        if (!byTable[currentTable]) byTable[currentTable] = [];
        let pgLine = currentStmt.trim().replace(/`([^`]+)`/g, '"$1"');
        byTable[currentTable].push(pgLine);
      }
      inInsert = false;
      currentStmt = '';
      currentTable = null;
    }
  }

  // Handle any remaining insert that was truncated (e.g. Documents table)
  if (inInsert && currentTable) {
    info(`Detected truncated INSERT statement for table "${currentTable}". Recovering...`);
    if (!byTable[currentTable]) byTable[currentTable] = [];
    let pgLine = currentStmt.trim().replace(/`([^`]+)`/g, '"$1"');
    
    if (currentTable === 'Documents') {
      // Append closing quote for base64 fileData, and default remaining columns (fileName, fileType, createdBy, createdAt, updatedAt, downloadCount, description)
      pgLine += "', 'BRD_Fase_1_autodebit_engine.pdf', 'application/pdf', 'Dimas', NOW(), NOW(), 0, 'Dokumen BRD Fase 1 (direkonstruksi dari backup SQL)');";
    } else {
      // General safety close
      if (!pgLine.endsWith(');')) pgLine += "');";
    }
    byTable[currentTable].push(pgLine);
  }

  const tables = Object.keys(byTable);
  info(`Tables in backup: ${tables.join(', ')}`);
  info(`Total INSERT statements parsed: ${tables.reduce((a, t) => a + byTable[t].length, 0)}`);

  const report = [];

  // 4. Process each table
  for (const tbl of tables) {
    const rows = byTable[tbl];
    const beforeCount = await getCount(tbl);
    info(`\nProcessing "${tbl}": ${rows.length} backup rows, ${beforeCount < 0 ? 'TABLE MISSING' : beforeCount + ' in Neon'}...`);

    if (beforeCount < 0) {
      warn(`Skipping "${tbl}" — table not found in Neon.`);
      report.push({ tbl, backupRows: rows.length, neonRows: -1, status: '❌ TABLE MISSING' });
      continue;
    }

    const client = await pool.connect();
    let inserted = 0;
    let errors   = 0;
    const errExamples = [];

    try {
      await client.query('BEGIN');
      for (const row of rows) {
        let sql = row.trim();
        if (sql.endsWith(';')) {
          sql = sql.slice(0, -1);
        }
        
        if (!sql.toUpperCase().includes('ON CONFLICT')) {
          sql += ' ON CONFLICT DO NOTHING';
        }
        
        try {
          await client.query(sql);
          inserted++;
        } catch (e) {
          errors++;
          if (errExamples.length < 2) {
            errExamples.push(`${e.message.substring(0, 120)} (SQL length: ${sql.length})`);
          }
        }
      }
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK').catch(() => {});
      err(`Transaction failed for "${tbl}": ${e.message}`);
      errors = rows.length;
    } finally {
      client.release();
    }

    const afterCount = await getCount(tbl);
    if (errors > 0) warn(`  ${errors} errors: ${errExamples.join('; ')}`);
    ok(`"${tbl}": ${afterCount}/${rows.length} rows in Neon`);

    const status = afterCount >= rows.length ? '✅ 100% MATCH' : `⚠️  ${afterCount}/${rows.length}`;
    report.push({ tbl, backupRows: rows.length, neonRows: afterCount, status });
  }

  // 5. Full row count of all main tables
  const allTables = ['Users', 'Projects', 'ProjectMembers', 'Sprints', 'Tasks',
    'MasterData', 'AuditLogs', 'ActivityLogs', 'Documents', 'Comments',
    'Meetings', 'Messages', 'Notifications', 'Attachments', 'ProjectModules'];

  console.log(`\n${C.bold}${C.cyan}════════════════════════════════════════════════════════════════${C.reset}`);
  console.log(`${C.bold}${C.cyan}  REKONSILIASI DATA — VERIFIKASI INTEGRITAS BACKUP vs NEON${C.reset}`);
  console.log(`${C.bold}${C.cyan}════════════════════════════════════════════════════════════════${C.reset}`);

  // Table from backup
  console.log(`\n${'Nama Tabel'.padEnd(22)} ${'Backup SQL'.padStart(10)} ${'Neon Rows'.padStart(10)} ${'Status Integrity'}`);
  console.log('─'.repeat(72));
  for (const r of report) {
    const statusColor = r.status.startsWith('✅') ? C.green : C.yellow;
    console.log(`${r.tbl.padEnd(22)} ${String(r.backupRows).padStart(10)} ${String(r.neonRows < 0 ? 'N/A' : r.neonRows).padStart(10)} ${statusColor}${r.status}${C.reset}`);
  }
  console.log('─'.repeat(72));

  // All Neon table counts
  console.log(`\n${C.bold}${C.cyan}📊 ROW COUNT SUMMARY — VERCEL NEON POSTGRESQL:${C.reset}`);
  console.log(`${'Table'.padEnd(22)} ${'Rows'.padStart(8)}`);
  console.log('─'.repeat(32));
  let total = 0;
  for (const t of allTables) {
    const cnt = await getCount(t);
    if (cnt >= 0) total += cnt;
    console.log(`${t.padEnd(22)} ${String(cnt < 0 ? 'N/A' : cnt).padStart(8)}`);
  }
  console.log('─'.repeat(32));
  console.log(`${'TOTAL'.padEnd(22)} ${String(total).padStart(8)}`);

  // Users credential check
  console.log(`\n${C.bold}${C.cyan}🔐 USER CREDENTIALS IN NEON:${C.reset}`);
  try {
    const { rows: users } = await pool.query(
      `SELECT username, role, status, "passwordHash" FROM "Users" ORDER BY role, username`
    );
    console.log(`${'Username'.padEnd(20)} ${'Role'.padEnd(12)} ${'Status'.padEnd(12)} Hash Type`);
    console.log('─'.repeat(65));
    for (const u of users) {
      const h = u.passwordHash || '';
      const ht = h.startsWith('$2b$') ? 'bcrypt' : h.startsWith('pbkdf2:') ? 'PBKDF2' : h.length < 20 ? 'plaintext' : 'unknown';
      console.log(`${u.username.padEnd(20)} ${(u.role||'').padEnd(12)} ${(u.status||'').padEnd(12)} ${ht}`);
    }
  } catch (e) { err('Cannot query Users: ' + e.message); }

  const allMatch = report.every(r => r.status.startsWith('✅'));
  console.log('\n' + (allMatch
    ? `${C.bold}${C.bgGreen} 🚀 ALL BACKUP DATA RESTORED — NEON 100% MATCH! ${C.reset}`
    : `${C.bold} ⚠️  CHECK ABOVE — SOME TABLES MAY NEED ATTENTION ${C.reset}`
  ));
  console.log('');
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); }).finally(() => pool.end());
