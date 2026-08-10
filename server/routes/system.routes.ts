import { Router } from "express";
import path from "path";
import fs from "fs";
import mysqlPool from "../../src/lib/db";
import { verifyGlobalAdmin } from "../middleware/auth";

const router = Router();

// DB Explorer Endpoint
router.post("/api/db-query", verifyGlobalAdmin, async (req, res) => {
  let connection;
  try {
    const { query: sqlString } = req.body;
    if (!sqlString) {
      return res.status(400).json({ status: "error", message: "Query SQL tidak boleh kosong." });
    }
    
    connection = await mysqlPool.getConnection();
    const [rows] = await connection.query(sqlString);
    
    res.json({ status: "success", data: rows });
  } catch (error: any) {
    console.error("LOG ANOMALI CRITICAL: Database query error:", error);
    res.status(500).json({ status: "error", message: "Terjadi kesalahan internal server: " + error.message });
  } finally {
    if (connection) connection.release();
  }
});

// Database Schema Stats
router.get("/api/db-schema", verifyGlobalAdmin, async (req, res) => {
  let connection;
  try {
    connection = await mysqlPool.getConnection();
    const [tablesRow] = await connection.query("SHOW TABLES");
    const tables = (tablesRow as any[]).map(row => Object.values(row)[0] as string);
    
    const schema: Record<string, any> = {};
    for (const table of tables) {
      const [columns] = await connection.query(`DESCRIBE \`${table}\``);
      schema[table] = columns;
    }

    let tableStats: any[] = [];
    try {
      const [stats] = await connection.query(`
        SELECT 
          table_name AS 'tableName', 
          table_rows AS 'rowCount',
          data_length + index_length AS 'sizeBytes'
        FROM information_schema.TABLES 
        WHERE table_schema = DATABASE();
      `);
      tableStats = stats as any[];
    } catch (e) {
       console.warn("Could not fetch table stats", e);
    }
    
    res.json({ status: "success", tables: schema, stats: tableStats });
  } catch (error: any) {
    console.error("LOG ANOMALI CRITICAL: Database query error:", error);
    res.status(500).json({ status: "error", message: "Terjadi kesalahan internal server: Gagal mengambil schema database. - " + error.message });
  } finally {
    if (connection) connection.release();
  }
});

// Database Migration Endpoint
router.post("/api/migrate-db", verifyGlobalAdmin, async (req, res) => {
  try {
    const schemaPath = path.join(process.cwd(), 'database', 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    let cleanSql = schemaSql
      .replace(/CREATE DATABASE IF NOT EXISTS.*?;/i, '')
      .replace(/USE .*?;/i, '');

    const connection = await mysqlPool.getConnection();
    await connection.query(cleanSql);
    connection.release();

    res.json({ status: "success", message: "Migrasi database berhasil dijalankan! Tabel sudah terbuat." });
  } catch (error: any) {
    console.error("LOG ANOMALI CRITICAL: Migration error:", error);
    res.status(500).json({ status: "error", message: "Terjadi kesalahan internal server: Gagal menjalankan migrasi database. - " + error.message });
  }
});

export default router;
