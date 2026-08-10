#!/usr/bin/env node
/**
 * scripts/fix-passwords.cjs
 * Set semua user password = bcrypt(username) agar 100% bisa login
 * Password login = username masing-masing user
 */
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

function loadEnv() {
  const p = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(p)) return;
  for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i < 1) continue;
    const k = t.slice(0, i).trim(), v = t.slice(i + 1).trim();
    if (!process.env[k]) process.env[k] = v;
  }
}
loadEnv();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
  ssl: { rejectUnauthorized: false },
});

const SPECIAL_PASSWORDS = {
  'admin':         'admin',
  'admin-manager': 'admin',
  'Dimas':         'dimas',
  'head':          'head',
  'manager':       'manager',
  'rido':          'rido',
  'reny':          'reny',
  'rifky':         'rifky',
  'siti':          'siti',
  'dini':          'dini',
  'Ribka':         'ribka',
  'eri':           'eri',
  'hendra':        'hendra',
  'user':          'user',
  'viewer':        'viewer',
};

async function main() {
  console.log('\n🔐 FIXING USER PASSWORDS — NEON POSTGRESQL\n');
  const { rows: users } = await pool.query(`SELECT id, username, "passwordHash" FROM "Users"`);

  for (const u of users) {
    const pw = SPECIAL_PASSWORDS[u.username] || u.username.toLowerCase();
    const hash = await bcrypt.hash(pw, 10);
    await pool.query(`UPDATE "Users" SET "passwordHash" = $1 WHERE id = $2`, [hash, u.id]);
    console.log(`✅ ${u.username.padEnd(20)} → password: "${pw}" (bcrypt)`);
  }

  console.log('\n✅ All passwords updated in Neon!\n');
  console.log('📋 LOGIN REFERENCE:');
  console.log('─'.repeat(40));
  for (const [user, pw] of Object.entries(SPECIAL_PASSWORDS)) {
    console.log(`  ${user.padEnd(20)} → ${pw}`);
  }
}

main().catch(e => { console.error('Error:', e.message); process.exit(1); }).finally(() => pool.end());
