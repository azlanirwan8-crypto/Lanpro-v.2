import crypto from "crypto";
import mysqlPool from "../../src/lib/db";

export const maskSensitiveData = (data: any): any => {
  if (!data) return data;
  if (typeof data !== 'object') return data;
  const masked = { ...data };
  const sensitiveKeys = ['password', 'token', 'secret', 'passwordHash', 'jwt'];
  for (const key in masked) {
    if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk))) {
      masked[key] = '***';
    } else if (typeof masked[key] === 'object') {
      masked[key] = maskSensitiveData(masked[key]);
    }
  }
  return masked;
};

export const createAuditLog = async (
  io: any, 
  userId: string, 
  projectId: string | null, 
  actionType: 'CREATE' | 'UPDATE' | 'DELETE', 
  entityName: string, 
  entityId: string, 
  oldValues: any, 
  newValues: any
) => {
  setImmediate(async () => {
    let logConn;
    try {
      logConn = await mysqlPool.getConnection();
      const logId = crypto.randomUUID();
      
      let cleanOld = null;
      let cleanNew = null;
      try {
         cleanOld = oldValues ? maskSensitiveData(JSON.parse(JSON.stringify(oldValues))) : null;
         cleanNew = newValues ? maskSensitiveData(JSON.parse(JSON.stringify(newValues))) : null;
      } catch (stringifyError) {
         console.warn("Circular Dependency terdeteksi pada objek AuditLogs:", stringifyError);
         cleanOld = { __error: "Data kompleks / Circular Reference tidak dapat direkam" };
         cleanNew = { __error: "Data kompleks / Circular Reference tidak dapat direkam" };
      }

      let resolvedUserId = userId;
      const [uCheck]: any = await logConn.query("SELECT id FROM Users WHERE id = ? OR uid = ?", [userId, userId]);
      if (uCheck.length > 0) {
        resolvedUserId = uCheck[0].id;
      } else {
        const [anyUser]: any = await logConn.query("SELECT id FROM Users LIMIT 1");
        resolvedUserId = anyUser.length > 0 ? anyUser[0].id : null;
      }

      if (!resolvedUserId) {
        console.warn("Audit log skipped: Could not resolve userId");
        return;
      }

      let resolvedProjectId = projectId;
      if (projectId) {
        const [pCheck]: any = await logConn.query("SELECT id FROM Projects WHERE id = ?", [projectId]);
        if (pCheck.length === 0) {
          resolvedProjectId = null;
        }
      }

      await logConn.query(
        `INSERT INTO AuditLogs (id, userId, projectId, actionType, entityName, entityId, oldValues, newValues) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [logId, resolvedUserId, resolvedProjectId, actionType, entityName, entityId, JSON.stringify(cleanOld), JSON.stringify(cleanNew)]
      );

      const [uRows]: any = await logConn.query("SELECT displayName FROM Users WHERE id = ?", [resolvedUserId]);
      const userName = uRows.length > 0 ? uRows[0].displayName : "Unknown User";

      const broadcastData = {
        id: logId,
        userId: resolvedUserId,
        userName,
        projectId: resolvedProjectId,
        actionType,
        entityName,
        entityId,
        oldValues: cleanOld,
        newValues: cleanNew,
        createdAt: new Date().toISOString()
      };

      if (io) {
        if (projectId) {
          io.to(projectId).emit("AUDIT_LOG_ADDED", broadcastData);
        } else {
          io.emit("AUDIT_LOG_ADDED", broadcastData);
        }
      }
    } catch (err) {
      console.error("Critical: Gagal mencatat Audit Log:", err);
    } finally {
      if (logConn) logConn.release();
    }
  });
};
