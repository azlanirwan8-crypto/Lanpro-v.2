import { Router } from "express";
import mysqlPool from "../../src/lib/db";
import { authenticateJWT } from "../middleware/auth";

const router = Router();

router.get("/api/audit-logs", authenticateJWT, async (req, res) => {
  let connection;
  try {
    const { projectId, entityName, entityId, limit } = req.query;
    connection = await mysqlPool.getConnection();
    
    let sql = "SELECT a.*, u.displayName as userName FROM AuditLogs a JOIN Users u ON a.userId = u.id";
    const params: any[] = [];
    const filters = [];

    if (projectId) { filters.push("a.projectId = ?"); params.push(projectId); }
    if (entityName) { filters.push("a.entityName = ?"); params.push(entityName); }
    if (entityId) { filters.push("a.entityId = ?"); params.push(entityId); }

    if (filters.length > 0) sql += " WHERE " + filters.join(" AND ");
    
    sql += " ORDER BY a.createdAt DESC LIMIT ?";
    params.push(parseInt(limit as string) || 50);

    const [rows] = await connection.query(sql, params);
    res.json({ status: "success", data: rows });
  } catch (error: any) {
    console.error("[AUDIT] Error:", error);
    res.status(500).json({ status: "error", message: "Terjadi kesalahan internal server: " + error.message });
  } finally {
    if (connection) connection.release();
  }
});

export default router;
