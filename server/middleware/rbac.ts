import jwt from "jsonwebtoken";
import mysqlPool from "../../src/lib/db";
import { getJwtSecret } from "./auth";

export const verifyProjectAccess = (allowedRoles: string[]) => {
  return async (req: any, res: any, next: any) => {
    let connection;
    try {
      const { projectId, id } = req.params;
      const targetProjectId = projectId || id; 
      
      if (!req.user) {
        const authHeader = req.headers?.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
          const token = authHeader.split(' ')[1];
          if (token) {
            try {
              const decoded = jwt.verify(token, getJwtSecret()) as any;
              req.user = decoded;
            } catch (e) {
              // Invalid or expired token
            }
          }
        }
      }

      let userId = req.user?.id || req.user?.uid || req.headers['x-user-id'] || req.query.userId || req.body.userId;

      if (!userId) {
        if (allowedRoles.includes('*')) {
          return next();
        }
        return res.status(403).json({ status: "error", message: "Akses ditolak" });
      }

      connection = await mysqlPool.getConnection();

      const [uRows]: any = await connection.query("SELECT id, role FROM Users WHERE id = ? OR uid = ?", [userId, userId]);
      if (uRows.length > 0) {
        userId = uRows[0].id;
        if (uRows[0].role === 'admin') {
          return next();
        }
      }

      if (req.user && allowedRoles.includes('*')) {
        return next();
      }
      
      if (!targetProjectId) return next(); 
      
      const [proj]: any = await connection.query("SELECT ownerId FROM Projects WHERE id = ?", [targetProjectId]);
      if (proj.length > 0 && proj[0].ownerId === userId) {
        return next(); 
      }

      const [member]: any = await connection.query(
        "SELECT role FROM ProjectMembers WHERE projectId = ? AND userId = ?",
        [targetProjectId, userId]
      );

      if (member.length > 0) {
        const userRole = (member[0].role || 'viewer').toLowerCase();
        if (allowedRoles.includes('*') || allowedRoles.map(r => r.toLowerCase()).includes(userRole)) {
          return next();
        }
      }

      return res.status(403).json({ status: "error", message: "Akses ditolak" });
    } catch (error: any) {
      console.error("LOG ANOMALI CRITICAL: RBAC Middleware error:", error);
      res.status(500).json({ status: "error", message: "Gagal memverifikasi hak akses." });
    } finally {
      if (connection) connection.release();
    }
  };
};
