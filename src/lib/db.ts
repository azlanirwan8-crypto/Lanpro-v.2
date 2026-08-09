/**
 * src/lib/db.ts
 * PostgreSQL (Neon) Adapter — NEON POSTGRESQL ONLY. Local JSON DB DISABLED.
 *
 * Exports identical API surface:
 *   - default export: poolProxy (same as mysqlPool)
 *   - query<T>(sql, values?): Promise<T>
 *   - getDbMode(): 'pg' | 'local'
 *   - setDbMode(mode)
 *   - updatePoolConfig(config)
 *   - getCaseInsensitiveVal / setCaseInsensitiveVal
 *
 * Key adaptation: MySQL `?` placeholders are auto-converted to
 * PostgreSQL `$1, $2, ...` before execution.
 */

import 'dotenv/config';
import dotenvLocal from 'dotenv';
dotenvLocal.config({ path: '.env.local', override: false });

import { Pool } from 'pg';
import type { PoolClient } from 'pg';

// ─────────────────────────────────────────────
// Case-insensitive helpers (kept for compatibility)
// ─────────────────────────────────────────────
export function getCaseInsensitiveVal(obj: any, key: string): any {
  if (!obj || typeof obj !== 'object') return undefined;
  const lowerKey = key.toLowerCase();
  for (const actualKey of Object.keys(obj)) {
    if (actualKey.toLowerCase() === lowerKey) return obj[actualKey];
  }
  return undefined;
}

export function setCaseInsensitiveVal(obj: any, key: string, val: any) {
  if (!obj || typeof obj !== 'object') return;
  const lowerKey = key.toLowerCase();
  for (const actualKey of Object.keys(obj)) {
    if (actualKey.toLowerCase() === lowerKey) { obj[actualKey] = val; return; }
  }
  obj[key] = val;
}

// ─────────────────────────────────────────────
// MySQL → PostgreSQL SQL converter
// ─────────────────────────────────────────────
export function convertToPostgres(sql: string, params: any[] = []): { text: string; values: any[] } {
  // 1. Replace backtick-quoted identifiers with double-quote
  let text = sql.replace(/`([^`]+)`/g, '"$1"');

  // 2. Replace ? placeholders with $1, $2, ...
  let idx = 0;
  text = text.replace(/\?/g, () => `$${++idx}`);

  // 3. DDL adaptations
  text = text
    .replace(/TINYINT\(1\)/gi, 'BOOLEAN')
    .replace(/LONGTEXT/gi, 'TEXT')
    .replace(/\bJSON\b/g, 'JSONB')
    .replace(/ENGINE\s*=\s*InnoDB[^;]*/gi, '')
    .replace(/DEFAULT\s+CHARSET\s*=\s*\w+/gi, '')
    .replace(/COLLATE\s+\w+/gi, '')
    .replace(/AUTO_INCREMENT/gi, '')
    .replace(/COMMENT\s+'[^']*'/gi, '');

  // 4. information_schema TABLE_SCHEMA = DATABASE() → table_schema = 'public'
  text = text.replace(/TABLE_SCHEMA\s*=\s*DATABASE\(\)/gi, "table_schema = 'public'");

  // 5. Convert INSERT IGNORE → INSERT
  text = text.replace(/INSERT\s+IGNORE\s+/gi, 'INSERT ');

  // 5b. Boolean comparisons
  text = text
    .replace(/([\"'`]?\bread\b[\"'`]?)\s*=\s*0/gi, '$1 = FALSE')
    .replace(/([\"'`]?\bread\b[\"'`]?)\s*=\s*1/gi, '$1 = TRUE');

  // 6. Auto-quote PascalCase table names
  const pgTables = [
    'Users', 'Projects', 'ProjectMembers', 'ProjectInvites', 'MasterData', 'Sprints',
    'Tasks', 'TaskExternalLinks', 'Attachments', 'LinkedTasks', 'Comments', 'TaskCustomFields',
    'ActivityLogs', 'AuditLogs', 'Milestones', 'MilestoneSprints', 'Meetings', 'DiscussionPoints',
    'Notifications', 'Messages', 'QATestSuites', 'QATestCases', 'QATestCaseExecutionLogs',
    'ProjectModules', 'Documents', 'TokenBlacklist',
  ];
  for (const tbl of pgTables) {
    const re = new RegExp('(?<!"\\.)\\b' + tbl + '\\b(?!")', 'g');
    text = text.replace(re, '"' + tbl + '"');
  }

  // 7. Auto-quote camelCase column names
  const camelCaseCols = [
    'passwordHash', 'displayName', 'avatarUrl', 'photoUrl', 'createdAt', 'updatedAt',
    'ownerId', 'projectId', 'sprintId', 'taskKey', 'assigneeId', 'assigneeEmail',
    'reporterId', 'projectRisk', 'storyPoints', 'orderIndex', 'isBlocked', 'dueDate',
    'milestoneId', 'moduleId', 'linkedEpicId', 'parentTaskId', 'parentAdminId', 'parentId',
    'userId', 'taskId', 'senderId', 'receiverId', 'recipientId', 'relatedId',
    'entityId', 'entityName', 'actionType', 'ipAddress', 'userAgent',
    'meetingId', 'authorId', 'uploadedBy', 'uploadedAt', 'fileName',
    'createdBy', 'downloadCount', 'namaModul', 'tipeTesting', 'caseId',
    'activeTesterId', 'activeTesterName', 'lockedAt', 'evidenceUrl', 'evidenceType',
    'evidenceName', 'linkedBugKey', 'commentsList', 'suiteId', 'rowNum', 'modulId',
    'testCaseId', 'runVersion', 'runLabel', 'executionStatus', 'linkedIssueKey',
    'executedByUserId', 'executedByName', 'expiresAt', 'sourceTaskId', 'targetTaskId',
    'linkType', 'originalName', 'projectKey', 'taskCounter', 'dashboard_layout',
    'lastSeen', 'nama_lengkap', 'aiSummary', 'recording_url', 'file_size',
    'upload_status', 'analysis_result', 'addedBy', 'addedAt',
    'oldValues', 'newValues', 'fileRef', 'uploadedByUserId', 'uploadedByName',
    'photoURL', 'fileType', 'fileSize', 'startDate', 'endDate', 'acceptanceCriteria', 'meetingLink',
    'dropdownOptions', 'fieldType', 'fileData', 'scheduledAt',
  ];
  for (const col of camelCaseCols) {
    const re = new RegExp('(?<!"\\.)\\b' + col + '\\b(?!")', 'g');
    text = text.replace(re, '"' + col + '"');
  }

  // 4b. DB Explorer query translations for PostgreSQL compatibility (placed at end to prevent auto-quoting modifications)
  if (text.trim().toUpperCase() === "SHOW TABLES") {
    text = `SELECT table_name AS "Tables_in_defaultdb" FROM information_schema.tables WHERE table_schema = 'public'`;
  }
  const describeMatch = text.match(/^DESCRIBE\s+"([^"]+)"/i);
  if (describeMatch) {
    text = `SELECT column_name AS "Field", data_type AS "Type", is_nullable AS "Null", column_default AS "Default" FROM information_schema.columns WHERE table_name = '${describeMatch[1]}'`;
  }
  if (text.includes("information_schema.TABLES") || text.includes("information_schema.tables")) {
    text = `
      SELECT 
        c.relname AS "tableName", 
        c.reltuples::bigint AS "rowCount", 
        pg_total_relation_size(c.oid) AS "sizeBytes"
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relkind = 'r'
    `;
  }

  return { text, values: params };
}

// ─────────────────────────────────────────────
// Local JSON DB stub — DISABLED, always throws
// ─────────────────────────────────────────────
export const useLocalJSONDb = false; // LOCKED: always false

export function executeSqlInMemory(_sql: string, _params?: any[]): never {
  throw new Error('[DB] Local JSON DB is DISABLED. Application requires Neon PostgreSQL connection.');
}

// ─────────────────────────────────────────────
// PostgreSQL Connection Pool
// ─────────────────────────────────────────────
const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL || 'postgresql://neondb_owner:npg_GkyS5zMv7XmC@ep-dawn-shape-aulnhaw2.pooler.region.postgres.neon.tech/neondb?sslmode=require';

if (!connectionString) {
  throw new Error(
    '[DB] FATAL: No DATABASE_URL or POSTGRES_URL found in .env.local. ' +
    'Application cannot start without a valid Neon PostgreSQL connection string.'
  );
}

let pgPool: Pool = createPgPool();

function createPgPool(connStr?: string): Pool {
  const cs = connStr || connectionString || '';
  const sslConfig = cs ? { rejectUnauthorized: false } : undefined;
  const pool = new Pool({
    connectionString: cs,
    ssl: sslConfig,
    max: parseInt(process.env.DB_CONNECTION_LIMIT || '100', 10),
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 30000,
  });

  // Attach error listener to prevent unhandled background socket errors from crashing node
  pool.on('error', (err) => {
    console.error('❌ [PostgreSQL] Pool error (background reset):', err.message);
  });

  return pool;
}

// Verify connection on startup
pgPool.query('SELECT 1')
  .then(() => console.log('✅ [PostgreSQL] Neon connection verified!'))
  .catch((err) => {
    console.warn('⚠️ [PostgreSQL] Startup check: Cannot connect to Neon PostgreSQL:', err.message);
    console.warn('   → Will retry connection dynamically on request.');
  });


// ─────────────────────────────────────────────
// Pool Proxy — mimics mysql2 Pool API
// ─────────────────────────────────────────────
const poolProxy = new Proxy({} as any, {
  get(_target, prop) {
    if (prop === 'getConnection') {
      return async function () {
        let client: PoolClient;
        try {
          client = await pgPool.connect();
        } catch (err: any) {
          console.error(`[PostgreSQL] getConnection failed: ${err.message}`);
          throw new Error('[DB] Cannot acquire PostgreSQL connection. Check Neon status.');
        }

        // Attach error handler to prevent unhandled Socket errors from crashing node.
        // Check listener count to avoid MaxListenersExceededWarning when clients are reused from pool.
        if (client.listenerCount('error') === 0) {
          client.on('error', (err) => {
            console.error('[PostgreSQL] Acquired client socket error:', err.message);
          });
        }

        return {
          query: async (sqlStr: string, values?: any[]) => {
            try {
              const converted = convertToPostgres(sqlStr, values);
              const result = await client.query(converted);
              return [result.rows, result.fields];
            } catch (err: any) {
              console.error(`[PostgreSQL] query error: ${err.message}`);
              console.error(`  SQL: ${sqlStr.substring(0, 120)}`);
              throw err;
            }
          },
          execute: async (sqlStr: string, values?: any[]) => {
            try {
              const converted = convertToPostgres(sqlStr, values);
              const result = await client.query(converted);
              return [result.rows, result.fields];
            } catch (err: any) {
              console.error(`[PostgreSQL] execute error: ${err.message}`);
              console.error(`  SQL: ${sqlStr.substring(0, 120)}`);
              throw err;
            }
          },
          beginTransaction: async () => {
            try { await client.query('BEGIN'); } catch (e: any) { console.error('[PG] BEGIN error:', e.message); }
          },
          commit: async () => {
            try { await client.query('COMMIT'); } catch (e: any) { console.error('[PG] COMMIT error:', e.message); }
          },
          rollback: async () => {
            try { await client.query('ROLLBACK'); } catch (e: any) { console.error('[PG] ROLLBACK error:', e.message); }
          },
          release: () => {
            try { client.release(); } catch {}
          },
        };
      };
    }

    if (prop === 'query' || prop === 'execute') {
      return async (sqlStr: string, values?: any[]) => {
        try {
          const converted = convertToPostgres(sqlStr, values);
          const result = await pgPool.query(converted);
          return [result.rows, result.fields];
        } catch (err: any) {
          console.error(`[PostgreSQL] pool.${String(prop)} error: ${err.message}`);
          console.error(`  SQL: ${sqlStr.substring(0, 120)}`);
          throw err;
        }
      };
    }

    if (prop === 'escape') {
      return (val: any) => {
        if (val === null || val === undefined) return 'NULL';
        if (typeof val === 'number') return String(val);
        if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
        return "'" + String(val).replace(/'/g, "''") + "'";
      };
    }

    if (prop === 'end') {
      return async () => { try { await pgPool?.end(); } catch {} };
    }

    if (prop === 'on') {
      return (event: string, handler: any) => pgPool?.on(event as any, handler);
    }

    return undefined;
  },
});

// ─────────────────────────────────────────────
// Public API (identical to mysql.ts exports)
// ─────────────────────────────────────────────
export async function query<T>(sql: string, values?: any[]): Promise<T> {
  try {
    const converted = convertToPostgres(sql, values);
    const result = await pgPool.query(converted);
    return result.rows as T;
  } catch (err: any) {
    console.error(`[PostgreSQL] query() error: ${err.message}`);
    console.error(`  SQL: ${sql.substring(0, 120)}`);
    throw err;
  }
}

export function getDbMode(): 'pg' | 'local' {
  return 'pg'; // ALWAYS PostgreSQL
}

export function setDbMode(_mode: 'mysql' | 'pg' | 'local') {
  // Local mode is permanently disabled. This function is a no-op.
  console.log('[DB] setDbMode() ignored — application is locked to Neon PostgreSQL.');
}

export function updatePoolConfig(config: any) {
  console.log('🔄 [PostgreSQL] Hot-swapping connection pool...');
  const newConnStr = config.connectionString || connectionString;
  pgPool.end().catch(() => {});
  pgPool = createPgPool(newConnStr);
  console.log('✅ [PostgreSQL] Pool updated.');
}

export default poolProxy;
