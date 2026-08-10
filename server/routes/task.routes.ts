import express from "express";
import crypto from "crypto";
import mysqlPool from "../../src/lib/db";
import { authenticateJWT } from "../middleware/auth";
import { verifyProjectAccess } from "../middleware/rbac";
import { createAuditLog } from "../services/audit.service";
import { broadcastProjectNotification, sendProjectActivityNotification, checkUpcomingDueDates } from "../services/notification.service";
import { GoogleGenAI, Type } from "@google/genai";

const router = express.Router();

  router.get("/api/projects/:projectId/tasks", verifyProjectAccess(['*']), async (req: any, res) => {
    let connection;
    try {
      const { projectId } = req.params;
      const userId = req.user?.id || req.user?.uid;
      let userIdentifiers = [
        userId,
        req.user?.uid,
        req.user?.id,
        req.user?.username,
        req.user?.email,
        req.user?.displayName
      ].filter(Boolean);

      connection = await mysqlPool.getConnection();

      if (userId) {
        const [uRows]: any = await connection.query(
          "SELECT id, uid, username, email, displayName, nama_lengkap FROM Users WHERE id = ? OR uid = ?",
          [userId, userId]
        );
        if (uRows.length > 0) {
          const u = uRows[0];
          userIdentifiers.push(u.id, u.uid, u.username, u.email, u.displayName, u.nama_lengkap);
        }
      }
      userIdentifiers = Array.from(new Set(userIdentifiers.filter(Boolean)));
      
      // Strict Multi-Tier Isolation: ONLY tasks where user is Assignee OR Reporter
      const placeholders = userIdentifiers.map(() => '?').join(', ');
      const queryParams = [projectId, ...userIdentifiers, ...userIdentifiers];
      const [tasksRows]: any = await connection.query(
        `SELECT * FROM Tasks WHERE projectId = ? AND ((assigneeId IN (${placeholders}) OR reporterId IN (${placeholders}))) ORDER BY orderIndex ASC, createdAt DESC LIMIT 2000`,
        queryParams
      );
      
      const [linksRows]: any = await connection.query(
        "SELECT * FROM LinkedTasks WHERE sourceTaskId IN (SELECT id FROM Tasks WHERE projectId = ?)", 
        [projectId]
      );

      // Use a Map for O(1) link lookup instead of nested loops O(N*M)
      const linksMap = new Map();
      (linksRows as any[]).forEach(link => {
        if (!linksMap.has(link.sourceTaskId)) {
          linksMap.set(link.sourceTaskId, []);
        }
        const targetArray = linksMap.get(link.sourceTaskId);
        if (targetArray) {
          targetArray.push(link);
        } else {
          console.warn(`[AuditLog] linksMap missing entry for sourceTaskId: ${link.sourceTaskId}`);
        }
      });

      // Create a map of subtasks for each parent
      const subtasksMap = new Map();
      (tasksRows as any[]).forEach(t => {
        if (t.parentId) {
          if (!subtasksMap.has(t.parentId)) {
            subtasksMap.set(t.parentId, []);
          }
          subtasksMap.get(t.parentId).push(t);
        }
      });

      // Fetch users map for reporter object resolution
      const [userRows]: any = await connection.query(
        "SELECT id, uid, displayName, nama_lengkap, username, email, photoURL FROM Users"
      );
      const usersMap = new Map();
      (userRows as any[]).forEach((u: any) => {
        const uObj = {
          id: u.id,
          uid: u.uid,
          name: u.displayName || u.nama_lengkap || u.username || u.email,
          displayName: u.displayName || u.nama_lengkap || u.username || u.email,
          avatar: u.photoURL || '',
          photoURL: u.photoURL || '',
          email: u.email || ''
        };
        if (u.id) usersMap.set(u.id, uObj);
        if (u.uid) usersMap.set(u.uid, uObj);
      });

      const tasks = tasksRows.map((t: any) => {
        const reporterUser = t.reporterId ? usersMap.get(t.reporterId) : null;
        return {
          ...t,
          key: t.taskKey,
          reporter: reporterUser || null,
          linkedTasks: linksMap.get(t.id) || [],
          subtasks: subtasksMap.get(t.id) || []
        };
      });
      
      res.json({ status: "success", data: tasks });
    } catch (error: any) {
      console.error("LOG ANOMALI CRITICAL: GET /api/projects/:projectId/tasks error:", error);
      res.status(500).json({ status: "error", message: "Terjadi kesalahan internal server: " + error.message });
    } finally {
      if (connection) connection.release();
    }
  });

  router.post("/api/projects/:projectId/tasks", authenticateJWT, verifyProjectAccess(['admin', 'manager', 'head', 'developer', 'member']), async (req, res) => {
    let connection;
    try {
      const { projectId } = req.params;
      const { title, description, status, type, priority, assigneeId, reporterId, sprintId, parentId, acceptanceCriteria, storyPoints, projectRisk, customFields, startDate, endDate, attachments } = req.body;
      connection = await mysqlPool.getConnection();
      
      const newId = crypto.randomUUID();
      
      // Get project and increment counter
      const [projRows] = await connection.query("SELECT projectKey, taskCounter FROM Projects WHERE id = ?", [projectId]);
      let taskKey = "TASK-1";
      if ((projRows as any[]).length > 0) {
        const proj = (projRows as any[])[0];
        let nextCounter = (proj.taskCounter || 0) + 1;
        taskKey = `${proj.projectKey}-${nextCounter}`;
        await connection.query("UPDATE Projects SET taskCounter = ? WHERE id = ?", [nextCounter, projectId]);
      }
      
      // Extract active authenticated user
      const authenticatedUserStr = (req as any).user?.uid || (req as any).user?.id || req.headers['x-user-id'];
      
      let resolvedReporterId = reporterId;
      if (!resolvedReporterId || resolvedReporterId === 'guest' || resolvedReporterId === 'Unknown') {
        if (authenticatedUserStr && authenticatedUserStr !== 'guest') {
          const [uCheck]: any = await connection.query(
            "SELECT id, uid FROM Users WHERE id = ? OR uid = ?",
            [authenticatedUserStr, authenticatedUserStr]
          );
          if (uCheck && uCheck.length > 0) {
            resolvedReporterId = uCheck[0].id || uCheck[0].uid;
          } else {
            resolvedReporterId = authenticatedUserStr;
          }
        }
      }

      // Fallback if still no reporterId
      if (!resolvedReporterId || resolvedReporterId === 'guest' || resolvedReporterId === 'Unknown') {
        const [projOwner]: any = await connection.query("SELECT ownerId FROM Projects WHERE id = ?", [projectId]);
        if (projOwner && projOwner.length > 0 && projOwner[0].ownerId) {
          resolvedReporterId = projOwner[0].ownerId;
        } else {
          const [firstUser]: any = await connection.query("SELECT id, uid FROM Users ORDER BY createdAt ASC LIMIT 1");
          if (firstUser && firstUser.length > 0) {
            resolvedReporterId = firstUser[0].id || firstUser[0].uid;
          }
        }
      }

       const validationError = await validateTimelineBoundaries(connection, projectId, sprintId, parentId, startDate, endDate);
       if (validationError) {
         return res.status(400).json({
           status: "error",
           code: validationError.code,
           message: validationError.message
         });
       }

      await connection.query(
        `INSERT INTO Tasks (id, projectId, sprintId, taskKey, title, description, status, priority, type, assigneeId, reporterId, parentId, acceptanceCriteria, storyPoints, projectRisk, startDate, endDate)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [newId, projectId, sprintId || null, taskKey, title, description || '', status || 'To Do', priority || 'Medium', type || 'task', assigneeId || null, resolvedReporterId || null, parentId || null, acceptanceCriteria || '', storyPoints || null, projectRisk || 'Low', startDate || null, endDate || null]
      );

      // Save attachments if provided
      if (attachments && Array.isArray(attachments) && attachments.length > 0) {
        for (const att of attachments) {
          await connection.query(
            `INSERT INTO TaskAttachments (id, taskId, name, url, fileType, uploadedByName, createdAt) VALUES (?, ?, ?, ?, ?, ?, NOW())`,
            [att.id || crypto.randomUUID(), newId, att.name || 'Attachment', att.url || '', att.type || 'file', att.uploadedByName || 'User']
          );
        }
      }

      // Populate reporter object
      let reporterObj: any = null;
      if (resolvedReporterId) {
        const [rRows]: any = await connection.query(
          "SELECT id, uid, displayName, nama_lengkap, username, email, photoURL FROM Users WHERE id = ? OR uid = ?",
          [resolvedReporterId, resolvedReporterId]
        );
        if (rRows && rRows.length > 0) {
          const r = rRows[0];
          reporterObj = {
            id: r.id,
            uid: r.uid,
            name: r.displayName || r.nama_lengkap || r.username || r.email,
            displayName: r.displayName || r.nama_lengkap || r.username || r.email,
            avatar: r.photoURL || '',
            photoURL: r.photoURL || '',
            email: r.email || ''
          };
        }
      }

      const userIdStr = authenticatedUserStr || resolvedReporterId || 'guest';
      await createAuditLog(userIdStr as string, projectId, 'CREATE', 'Tasks', newId, null, req.body);

      // Trigger automatic broadcast notifications to all team members of this project
      sendProjectActivityNotification(projectId, userIdStr, 'create_task', { taskId: newId })
        .catch(err => console.error("Create task notification broadcast failed:", err));

      res.json({
        status: "success",
        data: {
          id: newId,
          projectId,
          title,
          description,
          status: status || 'To Do',
          type: type || 'task',
          priority: priority || 'Medium',
          assigneeId: assigneeId || null,
          reporterId: resolvedReporterId,
          reporter: reporterObj,
          sprintId: sprintId || null,
          parentId: parentId || null,
          taskKey,
          key: taskKey,
          startDate: startDate || null,
          endDate: endDate || null
        }
      });
    } catch (error: any) {
      console.error("LOG ANOMALI CRITICAL: POST /api/projects/:projectId/tasks error:", error);
      res.status(500).json({ status: "error", message: "Terjadi kesalahan internal server: " + error.message });
    } finally {
      if (connection) connection.release();
    }
  });

  router.put("/api/projects/:projectId/tasks/reorder", authenticateJWT, verifyProjectAccess(['admin', 'manager', 'head']), async (req, res) => {
    let connection;
    try {
      const { projectId } = req.params;
      const { orderedIds } = req.body;
      if (!Array.isArray(orderedIds)) {
        return res.status(400).json({ status: "error", message: "orderedIds must be an array" });
      }
      
      connection = await mysqlPool.getConnection();
      await connection.beginTransaction();
      
      for (let i = 0; i < orderedIds.length; i++) {
         await connection.query("UPDATE Tasks SET orderIndex = ? WHERE id = ? AND projectId = ?", [i, orderedIds[i], projectId]);
      }
      
      await connection.commit();
      connection.release();
      
      io.to(projectId).emit("project_updated", { type: "tasks_reordered", projectId });
      res.json({ status: "success", message: "Tasks reordered successfully" });
    } catch (error: any) {
      if (connection) {
        await connection.rollback();
        connection.release();
      }
      console.error("Reorder tasks error:", error);
      res.status(500).json({ status: "error", message: error.message || "Failed to reorder tasks" });
    }
  });

async function validateTimelineBoundaries(connection: any, projectId: string, sprintId: string | null, parentId: string | null, startDate: string | null, endDate: string | null) {
  // 1. Validate against Sprint (Planning) if sprintId is present
  if (sprintId && (startDate || endDate)) {
    const [sprintRows]: any = await connection.query("SELECT startDate, endDate, name FROM Sprints WHERE id = ? AND projectId = ?", [sprintId, projectId]);
    if (sprintRows.length > 0) {
      const sprint = sprintRows[0];
      if (sprint.startDate || sprint.endDate) {
        const sprintStart = sprint.startDate ? new Date(sprint.startDate).getTime() : null;
        const sprintEnd = sprint.endDate ? new Date(sprint.endDate).getTime() : null;
        const itemStart = startDate ? new Date(startDate).getTime() : null;
        const itemEnd = endDate ? new Date(endDate).getTime() : null;

        if (sprintStart && itemStart && itemStart < sprintStart) {
          return {
            code: "PLANNING_BOUNDARY_EXCEEDED",
            message: `Gagal Menyimpan: Tanggal mulai melampaui rentang jadwal Planning induk (${sprint.name}).`
          };
        }
        if (sprintEnd && itemStart && itemStart > sprintEnd) {
          return {
            code: "PLANNING_BOUNDARY_EXCEEDED",
            message: `Gagal Menyimpan: Tanggal mulai melampaui rentang jadwal Planning induk (${sprint.name}).`
          };
        }
        if (sprintStart && itemEnd && itemEnd < sprintStart) {
          return {
            code: "PLANNING_BOUNDARY_EXCEEDED",
            message: `Gagal Menyimpan: Tanggal selesai melampaui rentang jadwal Planning induk (${sprint.name}).`
          };
        }
        if (sprintEnd && itemEnd && itemEnd > sprintEnd) {
          return {
            code: "PLANNING_BOUNDARY_EXCEEDED",
            message: `Gagal Menyimpan: Tanggal selesai melampaui rentang jadwal Planning induk (${sprint.name}).`
          };
        }
      }
    }
  }

  // 2. Validate against Parent Epic if parentId is present
  if (parentId && (startDate || endDate)) {
    const [parentRows]: any = await connection.query("SELECT startDate, endDate, title FROM Tasks WHERE id = ? AND projectId = ?", [parentId, projectId]);
    if (parentRows.length > 0) {
      const parentEpic = parentRows[0];
      if (parentEpic.startDate || parentEpic.endDate) {
        const epicStart = parentEpic.startDate ? new Date(parentEpic.startDate).getTime() : null;
        const epicEnd = parentEpic.endDate ? new Date(parentEpic.endDate).getTime() : null;
        const itemStart = startDate ? new Date(startDate).getTime() : null;
        const itemEnd = endDate ? new Date(endDate).getTime() : null;

        if (epicStart && itemStart && itemStart < epicStart) {
          return {
            code: "EPIC_TIMELINE_EXCEEDED",
            message: "Peringatan: Tanggal mulai task tidak boleh lebih awal dari rentang tanggal Epic induk."
          };
        }
        if (epicEnd && itemStart && itemStart > epicEnd) {
          return {
            code: "EPIC_TIMELINE_EXCEEDED",
            message: "Peringatan: Tanggal mulai task tidak boleh melebihi rentang tanggal Epic induk."
          };
        }
        if (epicStart && itemEnd && itemEnd < epicStart) {
          return {
            code: "EPIC_TIMELINE_EXCEEDED",
            message: "Peringatan: Tanggal selesai task tidak boleh lebih awal dari rentang tanggal Epic induk."
          };
        }
        if (epicEnd && itemEnd && itemEnd > epicEnd) {
          return {
            code: "EPIC_TIMELINE_EXCEEDED",
            message: "Peringatan: Tanggal selesai task tidak boleh melebihi rentang tanggal Epic induk."
          };
        }
      }
    }
  }

  return null;
}

const DEFAULT_PERMISSIONS = {
  admin: { list: { create: true, read: true, update: true, delete: true } },
  head: { list: { create: false, read: true, update: false, delete: false } },
  manager: { list: { create: true, read: true, update: true, delete: true } },
  user: { list: { create: true, read: true, update: true, delete: false } },
  viewer: { list: { create: false, read: true, update: false, delete: false } },
};

function checkUserPermissionBackend(role: string, customPermissions: any, action: 'update' | 'delete'): boolean {
  const userRole = (role || 'viewer').toLowerCase();
  const roleDefaults = (DEFAULT_PERMISSIONS as any)[userRole] || DEFAULT_PERMISSIONS.viewer;
  const defaultVal = roleDefaults.list[action];

  if (customPermissions) {
    const customList = customPermissions.list || customPermissions.issueList;
    if (customList && customList[action] !== undefined) {
      return !!customList[action];
    }
  }

  return defaultVal;
}

  router.put("/api/projects/:projectId/tasks/:id", authenticateJWT, verifyProjectAccess(['admin', 'manager', 'head', 'developer', 'member']), async (req, res) => {
    let connection;
    try {
      const { id, projectId } = req.params;
      const { status, type, priority, assigneeId, sprintId, parentId, dueDate, storyPoints, startDate, endDate, estimatedHours, loggedHours, acceptanceCriteria, version, isBlocked } = req.body;
      const title = req.body.title !== undefined ? xss(req.body.title || "") : undefined;
      const description = req.body.description !== undefined ? xss(req.body.description || "") : undefined;
      const userId = (req as any).user?.id || req.headers['x-user-id'] || 'guest';
      
      connection = await mysqlPool.getConnection();
      
      // ============================================
      // 1. Fetch current state for Audit Log & Constraints
      // ============================================
      const [oldRows]: any = await connection.query("SELECT t.*, p.category as projectCategory FROM Tasks t JOIN Projects p ON t.projectId = p.id WHERE t.id = ? AND t.projectId = ?", [id, projectId]);
      if (oldRows.length === 0) return res.status(404).json({ status: "error", message: "Tugas tidak ditemukan." });
      const oldTask = oldRows[0];

      // Auto state transfer for Bug tasks when marked Done -> "Ready for Retest"
      let effectiveStatus = status;
      if (effectiveStatus && (effectiveStatus.toLowerCase() === 'done' || effectiveStatus.toLowerCase() === 'selesai')) {
        const isBugTask = (oldTask.type && oldTask.type.toLowerCase() === 'bug') || 
                          (oldTask.taskKey && oldTask.taskKey.toUpperCase().startsWith('BUG')) || 
                          (type && type.toLowerCase() === 'bug') ||
                          (oldTask.title && oldTask.title.toLowerCase().includes('bug'));
        if (isBugTask) {
          effectiveStatus = "Ready for Retest";
        }
      }

      // Strict Authorization Cascade Check
      const [userRows]: any = await connection.query("SELECT permissions, role FROM Users WHERE id = ? OR uid = ?", [userId, userId]);
      let userRole = 'viewer';
      let userPerms: any = null;
      if (userRows.length > 0) {
        userRole = userRows[0].role || 'viewer';
        const userPermsRaw = userRows[0].permissions;
        if (userPermsRaw) {
          try {
            userPerms = typeof userPermsRaw === 'string' ? JSON.parse(userPermsRaw) : userPermsRaw;
          } catch (e) {
            console.error("Error parsing user permissions in update task route:", e);
          }
        }
      }

      const dbUserId = userRows[0]?.id;
      const dbUserUid = userRows[0]?.uid;
      const dbUsername = userRows[0]?.username;

      const isReporter = 
        oldTask.reporterId === userId || 
        oldTask.reporterId === (req as any).user?.uid || 
        oldTask.reporterId === (req as any).user?.username ||
        (dbUserId && oldTask.reporterId === dbUserId) ||
        (dbUserUid && oldTask.reporterId === dbUserUid) ||
        (dbUsername && oldTask.reporterId === dbUsername);

      // TIER 1 - RBAC PERMISSION CHECK
      const hasRolePermission = checkUserPermissionBackend(userRole, userPerms, 'update');
      if (!hasRolePermission) {
        return res.status(403).json({ status: "error", message: "Role Anda tidak memiliki akses untuk tindakan ini" });
      }

      // TIER 2 - REPORTER OWNERSHIP CHECK
      if (!isReporter) {
        return res.status(403).json({ status: "error", message: "Hanya Reporter pembuat task ini yang diizinkan melakukan perubahan/penghapusan" });
      }

             // ============================================
       // MULTI-LEVEL PLANNING & EPIC TIMELINE BOUNDARY VALIDATION
       // ============================================
       const isDateOrRelUpdated = parentId !== undefined || sprintId !== undefined || startDate !== undefined || endDate !== undefined || dueDate !== undefined;
       const effectiveParentId = parentId !== undefined ? parentId : oldTask?.parentId;
       const effectiveSprintId = sprintId !== undefined ? sprintId : oldTask?.sprintId;
       const effectiveStartDate = startDate !== undefined ? startDate : oldTask?.startDate;
       const effectiveEndDate = endDate !== undefined ? endDate : (dueDate !== undefined ? dueDate : oldTask?.endDate);

       if (isDateOrRelUpdated) {
         const validationError = await validateTimelineBoundaries(connection, projectId, effectiveSprintId, effectiveParentId, effectiveStartDate, effectiveEndDate);
         if (validationError) {
           return res.status(400).json({
             status: "error",
             code: validationError.code,
             message: validationError.message
           });
         }
       }

      const isAgile = oldTask.projectCategory === 'AGILE';
      const isWaterfall = oldTask.projectCategory === 'WATERFALL';

      // ============================================
      // 2. AGILE CONSTRAINT: Optimistic Locking & Subtask Blocker
      // ============================================
      if (version !== undefined && oldTask.version !== version) {
        optimisticLockingConflicts.inc();
        
        // Catat sebagai log operasional karena lumrah terjadi di Agile Scrum
        await createAuditLog(userId as string, projectId, 'UPDATE', 'Tasks', id, { version: oldTask.version }, { version: version, status: "409 CONFLICT" });

        // Alert jika konflik terjadi (v1.5)
        // sendAlert(`Konflik Optimistic Locking terdeteksi pada Task ID ${id} oleh user ${userId}. (Server Ver: ${oldTask.version}, User Ver: ${version})`, 'warn');

        return res.status(409).json({ status: "error", message: "Konflik versi tugas. Silakan refresh." });
      }

      /*
      // SUBTASK BLOCKER GUARD
      if (status && TERMINAL_STATUSES.includes(status.toLowerCase().trim())) {
        const [subtasks]: any = await connection.query("SELECT status FROM Subtasks WHERE taskId = ?", [id]);
        const unfinished = subtasks.filter((st: any) => !TERMINAL_STATUSES.includes(st.status.toLowerCase().trim()));
        if (unfinished.length > 0) {
           return res.status(422).json({ status: "error", message: "Gagal memindahkan task: Masih ada subtask yang belum selesai." });
        }
      }
      */

      // ============================================
      // 3. WATERFALL CONSTRAINT: Phase Gate Validation
      // ============================================
      if (isWaterfall && status === 'Done' && oldTask.status !== 'Done') {
         // Validasi apakah tugas ini memiliki dependensi (LinkedTasks) bertipe 'blocking'
         const [deps]: any = await connection.query(`
           SELECT tl.sourceId, t_dep.status 
           FROM LinkedTasks tl 
           JOIN Tasks t_dep ON tl.sourceId = t_dep.id 
           WHERE tl.targetId = ? AND tl.type = 'blocks'
         `, [id]);
         
         const unfinishedDeps = deps.filter((d: any) => d.status !== 'Done');
         
         if (unfinishedDeps.length > 0) {
            // Pelanggaran Batasan Linimasa (Governance Audit)
            await createAuditLog(
              userId as string, projectId, 'UPDATE', 'Tasks', id, 
              { status: oldTask.status }, 
              { status: 'Done', constraintFailure: 'WATERFALL_PHASE_GATE_VIOLATION' }
            );

            return res.status(403).json({ 
              status: "error", 
              message: "Phase Gate Constraint: Anda tidak dapat menyelesaikan tugas Tahap ini. Terdapat dependensi prasyarat yang belum mencapai 100% ('Done')." 
            });
         }
      }

      // ============================================
      // 4. HIERARCHICAL INTEGRITY: Sub-task Integrity Gate
      // ============================================
      if (status === 'Done' && oldTask.status !== 'Done') {
         // Check if this task has sub-tasks that are not finished (status != 'Done')
         const [subtasks]: any = await connection.query(`
            SELECT id, taskKey, title, status 
            FROM Tasks 
            WHERE parentId = ? AND status != 'Done'
         `, [id]);
         
         if (subtasks.length > 0) {
            const unfinishedKeys = subtasks.map((s: any) => s.taskKey || s.title || s.id).join(', ');
            
            // Log this hierarchical constraint violation in the audit logs
            await createAuditLog(
              userId as string, projectId, 'UPDATE', 'Tasks', id, 
              { status: oldTask.status }, 
              { status: 'Done', constraintFailure: 'SUBTASK_INTEGRITY_VIOLATION' }
            );

            return res.status(400).json({ 
              status: "error", 
              message: `Integritas Hirarki: Tidak dapat menyelesaikan tugas utama ini karena masih memiliki sub-task yang belum selesai (${unfinishedKeys}). Silakan selesaikan semua sub-task terlebih dahulu.`
            });
         }
      }

      // Build dynamic update
      const updates = [];
      const values = [];
      const changedFields: any = {};
      const newValues: any = {};

      const checkUpdate = (field: string, val: any) => {
        if (val !== undefined && val !== oldTask[field]) {
          updates.push(`${field} = ?`);
          values.push(val);
          changedFields[field] = val;
          newValues[field] = val;
        }
      };

      checkUpdate('title', title);
      checkUpdate('description', description);
      checkUpdate('status', effectiveStatus);
      checkUpdate('type', type);
      checkUpdate('priority', priority);
      checkUpdate('assigneeId', assigneeId);
      checkUpdate('sprintId', sprintId);
      checkUpdate('parentId', parentId);
      checkUpdate('dueDate', dueDate);
      checkUpdate('storyPoints', storyPoints);
      checkUpdate('startDate', startDate);
      checkUpdate('endDate', endDate);
      checkUpdate('estimatedHours', estimatedHours);
      checkUpdate('loggedHours', loggedHours);
      checkUpdate('acceptanceCriteria', acceptanceCriteria);
      
      if (isBlocked !== undefined) {
        const oldBlockedVal = oldTask.isBlocked === true || oldTask.isBlocked === 1 ? 1 : 0;
        const newBlockedVal = isBlocked ? 1 : 0;
        if (newBlockedVal !== oldBlockedVal) {
          updates.push("isBlocked = ?");
          values.push(newBlockedVal);
          changedFields.isBlocked = newBlockedVal;
          newValues.isBlocked = newBlockedVal;
        }
      }
      
      if (updates.length > 0) {
        // Increment version on update
        updates.push("version = version + 1");
        
        values.push(id);
        
        let sql = `UPDATE Tasks SET ${updates.join(', ')} WHERE id = ?`;
        
        // Final guard for optimistic locking in SQL
        if (version !== undefined) {
          sql += " AND version = ?";
          values.push(version);
        }

        const [updateResult]: any = await connection.query(sql, values);
        
        if (updateResult.affectedRows === 0) {
           optimisticLockingConflicts.inc();
           return res.status(409).json({ status: "error", message: "Gagal memperbarui: Data mungkin sudah berubah. Silakan coba lagi." });
        }

        // 2. Log the activity (Enterprise Audit)
        await createAuditLog(userId as string, projectId, 'UPDATE', 'Tasks', id, oldTask, newValues);

        // 3. Broadcast real-time update (Socket.io Delta Update)
        io.to(projectId).emit("task_updated", {
          taskId: id,
          projectId,
          changes: changedFields,
          updatedBy: userId
        });

        // Special TASK_MOVE broadcast if status changed
        if (changedFields.status) {
          io.to(projectId).emit("TASK_MOVE", {
            taskId: id,
            oldStatus: oldTask.status,
            newStatus: changedFields.status,
            updatedBy: userId
          });
        }

        // 4. Automated notifications for Blocked task status or isBlocked flag changes
        const isNowBlockedStatus = (changedFields.status && changedFields.status.toLowerCase() === 'blocked' && (!oldTask.status || oldTask.status.toLowerCase() !== 'blocked'));
        const isNowBlockedFlag = (changedFields.isBlocked !== undefined && changedFields.isBlocked === 1 && (!oldTask.isBlocked || oldTask.isBlocked === 0));
        
        if (isNowBlockedStatus || isNowBlockedFlag) {
          const recipientId = changedFields.assigneeId !== undefined ? changedFields.assigneeId : oldTask.assigneeId;
          if (recipientId) {
            const [updaterRows]: any = await connection.query("SELECT displayName, username FROM Users WHERE id = ? OR uid = ?", [userId, userId]);
            const updaterName = updaterRows.length > 0 ? (updaterRows[0].displayName || updaterRows[0].username) : "Seorang pengguna";
            const taskKey = oldTask.taskKey || oldTask.key || id;
            const taskTitle = oldTask.title || "Tugas";
            
            const title = "⚠️ Tugas Terblokir (Blocked)";
            const message = `Tugas "${taskTitle}" (${taskKey}) telah ditandai sebagai Terblokir (Blocked) oleh ${updaterName}.`;
            await createAutomatedNotification(recipientId, userId, title, message, 'blocked', id);
          }
        }

        // Requirement 2: Automated State Machine & Workflow Rules for Bug/Issue Resolution
        const isIssueResolvedOrDone = changedFields.status && [
          'done', 'resolved', 'ready for retest', 'retest', 'completed', 'selesai', 'done / closed'
        ].includes(changedFields.status.toLowerCase().trim());

        if (isIssueResolvedOrDone) {
          const taskKey = oldTask.taskKey || oldTask.key || id;
          const [updaterRows]: any = await connection.query("SELECT displayName, username FROM Users WHERE id = ? OR uid = ?", [userId, userId]);
          const updaterName = updaterRows.length > 0 ? (updaterRows[0].displayName || updaterRows[0].username) : "Developer";

          // Action 1: Detect all TEST_CASE_ID bound to this ISSUE_KEY
          const [linkedTCs]: any = await connection.query(
            "SELECT * FROM QATestCases WHERE (linkedBugKey = ? OR linkedBugKey = ?) AND projectId = ?",
            [taskKey, id, projectId]
          );

          if (linkedTCs && linkedTCs.length > 0) {
            for (const tc of linkedTCs) {
              // Action 2: Change execution status to [RETEST]
              await connection.query(
                "UPDATE QATestCases SET status = 'Retest' WHERE id = ? AND projectId = ?",
                [tc.id, projectId]
              );

              // Action 3: Non-Destructive Execution Run Log
              const notes = `Automated Workflow: Linked Issue #${taskKey} was marked as [${changedFields.status}] by ${updaterName}. Test case auto-transitioned to RETEST.`;
              await recordExecutionRunLog(
                connection,
                projectId,
                tc.id,
                "RETEST",
                taskKey,
                userId as string,
                updaterName,
                notes,
                []
              );

              // Action 4: Notification event to REPORTER_USER_ID
              const reporterUserId = oldTask.reporterId || tc.activeTesterId || userId;
              if (reporterUserId) {
                const notifTitle = "🔄 Test Case Ready for Retest";
                const notifMsg = `Issue #${taskKey} (${oldTask.title || 'Bug'}) telah [${changedFields.status}] oleh ${updaterName}. Test Case "${tc.judul || tc.title}" kini siap diuji ulang (Retest).`;
                await createAutomatedNotification(reporterUserId, userId as string, notifTitle, notifMsg, 'bug_retest', tc.id);
              }

              // Real-time Socket.io broadcast
              io.to(projectId).emit("QA_TESTCASE_UPDATED", {
                testCaseId: tc.id,
                projectId,
                status: "Retest",
                linkedBugKey: taskKey
              });
            }
          }
        }

        // Trigger activity notification for status or assignee changes or description or AC changes
        if (changedFields.status) {
          sendProjectActivityNotification(projectId, userId as string, 'update_task', {
            taskId: id,
            field: 'status',
            oldValue: oldTask.status,
            newValue: changedFields.status
          }).catch(err => console.error("Update status notification broadcast failed:", err));
        } else if (changedFields.assigneeId !== undefined) {
          sendProjectActivityNotification(projectId, userId as string, 'update_task', {
            taskId: id,
            field: 'assigneeId',
            oldValue: oldTask.assigneeId,
            newValue: changedFields.assigneeId
          }).catch(err => console.error("Update assignee notification broadcast failed:", err));
        } else if (changedFields.description !== undefined) {
          sendProjectActivityNotification(projectId, userId as string, 'update_task', {
            taskId: id,
            field: 'deskripsi',
            newValue: 'Deskripsi diperbarui'
          }).catch(err => console.error("Update description notification broadcast failed:", err));
        } else if (changedFields.acceptanceCriteria !== undefined) {
          sendProjectActivityNotification(projectId, userId as string, 'update_task', {
            taskId: id,
            field: 'acceptanceCriteria',
            newValue: 'Acceptance Criteria diperbarui'
          }).catch(err => console.error("Update AC notification broadcast failed:", err));
        }

        // Trigger immediate check if dueDate is updated to be within 24 hours
        if (changedFields.dueDate) {
          setImmediate(() => checkUpcomingDueDates());
        }
      }
      
      res.json({ status: "success", data: { id, ...changedFields } });
    } catch (error: any) {
      console.error("LOG ANOMALI CRITICAL: PUT /api/projects/:projectId/tasks/:id error:", error);
      res.status(500).json({ status: "error", message: "Terjadi kesalahan internal server: " + error.message });
    } finally {
      if (connection) connection.release();
    }
  });

  router.delete("/api/projects/:projectId/tasks/:id", authenticateJWT, verifyProjectAccess(['admin', 'manager', 'head', 'developer', 'member']), async (req, res) => {
    let connection;
    try {
      const { id, projectId } = req.params;
      const userId = (req as any).user?.id || req.headers['x-user-id'] || 'guest';
      connection = await mysqlPool.getConnection();
      
      // Get task to check ownership
      const [taskRows]: any = await connection.query("SELECT assigneeId, reporterId FROM Tasks WHERE id = ? AND projectId = ?", [id, projectId]);
      if (taskRows.length === 0) {
         return res.status(404).json({ status: "error", message: "Task not found" });
      }
      
      // Strict Authorization Cascade Check for Deletion
      const [userRows]: any = await connection.query("SELECT id, uid, permissions, role FROM Users WHERE id = ? OR uid = ?", [userId, userId]);
      let userRole = 'viewer';
      let userPerms: any = null;
      if (userRows.length > 0) {
        userRole = userRows[0].role || 'viewer';
        const userPermsRaw = userRows[0].permissions;
        if (userPermsRaw) {
          try {
            userPerms = typeof userPermsRaw === 'string' ? JSON.parse(userPermsRaw) : userPermsRaw;
          } catch (e) {
            console.error("Error parsing user permissions in delete task route:", e);
          }
        }
      }

      const dbUserId = userRows[0]?.id;
      const dbUserUid = userRows[0]?.uid;
      const dbUsername = userRows[0]?.username;

      const isReporter = 
        taskRows[0].reporterId === userId || 
        taskRows[0].reporterId === (req as any).user?.uid || 
        taskRows[0].reporterId === (req as any).user?.username ||
        (dbUserId && taskRows[0].reporterId === dbUserId) ||
        (dbUserUid && taskRows[0].reporterId === dbUserUid) ||
        (dbUsername && taskRows[0].reporterId === dbUsername);

      // TIER 1 - RBAC PERMISSION CHECK
      const hasRolePermission = checkUserPermissionBackend(userRole, userPerms, 'delete');
      if (!hasRolePermission) {
        return res.status(403).json({ status: "error", message: "Role Anda tidak memiliki akses untuk tindakan ini" });
      }

      // TIER 2 - REPORTER OWNERSHIP CHECK
      if (!isReporter) {
        return res.status(403).json({ status: "error", message: "Hanya Reporter pembuat task ini yang diizinkan melakukan perubahan/penghapusan" });
      }
      
      await createAuditLog(userId as string, projectId, 'DELETE', 'Tasks', id, null, null);
      await connection.query("DELETE FROM Tasks WHERE id = ? AND projectId = ?", [id, projectId]);
      
      res.json({ status: "success", message: "Task deleted" });
    } catch (error: any) {
      console.error("LOG ANOMALI CRITICAL: DELETE /api/projects/:projectId/tasks/:id error:", error);
      res.status(500).json({ status: "error", message: "Terjadi kesalahan internal server: " + error.message });
    } finally {
      if (connection) connection.release();
    }
  });

  // Bulk Delete Tasks API
  router.post("/api/projects/:projectId/tasks/bulk-delete", authenticateJWT, verifyProjectAccess(['admin', 'manager', 'head', 'developer', 'member']), async (req, res) => {
    let connection;
    try {
      const { projectId } = req.params;
      let taskIds = req.body?.taskIds;
      if (typeof taskIds === 'string') {
        try { taskIds = JSON.parse(taskIds); } catch (e) {}
      }
      const userId = (req as any).user?.id || (req as any).user?.uid || req.headers['x-user-id'] || 'guest';

      if (!Array.isArray(taskIds) || taskIds.length === 0) {
        return res.status(400).json({ status: "error", message: "taskIds must be a non-empty array" });
      }

      connection = await mysqlPool.getConnection();

      // Get user role and permissions
      let userRole = 'viewer';
      let userPerms = null;
      const [userRows]: any = await connection.query("SELECT id, uid, role, permissions FROM Users WHERE id = ? OR uid = ?", [userId, userId]);
      if (userRows.length > 0) {
        userRole = userRows[0].role || 'viewer';
        const userPermsRaw = userRows[0].permissions;
        if (userPermsRaw) {
          try {
            userPerms = typeof userPermsRaw === 'string' ? JSON.parse(userPermsRaw) : userPermsRaw;
          } catch (e) {
            console.error("Error parsing user permissions in bulk delete task route:", e);
          }
        }
      } else {
        if (userId === 'admin-uid' || userId === 'admin-fixed-id' || (req as any).user?.role === 'admin') {
          userRole = 'admin';
        }
      }

      const dbUserId = userRows[0]?.id;
      const dbUserUid = userRows[0]?.uid;

      // Find tasks belonging to project
      const safeTaskIds = taskIds.map((id: string) => mysqlPool.escape(id)).join(',');
      const safeProjectId = mysqlPool.escape(projectId);

      const [taskRows]: any = await connection.query(
        `SELECT id, projectId, reporterId, assigneeId FROM Tasks WHERE id IN (${safeTaskIds}) AND projectId = ${safeProjectId}`
      );

      const deletableTaskIds: string[] = [];
      for (const t of taskRows) {
        const isReporter = 
          t.reporterId === userId || 
          t.reporterId === (req as any).user?.uid || 
          t.reporterId === (req as any).user?.username ||
          (dbUserId && t.reporterId === dbUserId) ||
          (dbUserUid && t.reporterId === dbUserUid);

        if (isReporter) {
          deletableTaskIds.push(t.id);
        }
      }

      if (deletableTaskIds.length === 0) {
        return res.status(403).json({ 
          status: "error", 
          message: "You do not have permission to delete any of the selected tasks"
        });
      }

      const safeDeletableIds = deletableTaskIds.map((id: string) => mysqlPool.escape(id)).join(',');
      await connection.query(
        `DELETE FROM Tasks WHERE id IN (${safeDeletableIds}) AND projectId = ${safeProjectId}`
      );

      for (const deletedId of deletableTaskIds) {
        await createAuditLog(userId as string, projectId, 'DELETE', 'Tasks', deletedId, null, null);
      }

      res.json({ status: "success", message: `Successfully deleted ${deletableTaskIds.length} tasks`, deletedIds: deletableTaskIds });
    } catch (error: any) {
      console.error("LOG ANOMALI CRITICAL: POST /api/projects/:projectId/tasks/bulk-delete error:", error);
      res.status(500).json({ status: "error", message: "Terjadi kesalahan internal server: " + error.message });
    } finally {
      if (connection) connection.release();
    }
  });

  // Comments API
  router.get("/api/projects/:projectId/tasks/:taskId/comments", verifyProjectAccess(['*']), async (req, res) => {
    let connection;
    try {
      const { taskId } = req.params;
      connection = await mysqlPool.getConnection();
      const [rows] = await connection.query(
        "SELECT * FROM Comments WHERE taskId = ? ORDER BY createdAt ASC LIMIT 200",
        [taskId]
      );
      res.json({ status: "success", data: rows });
    } catch (error: any) {
      console.error("LOG ANOMALI CRITICAL: GET /api/projects/:projectId/tasks/:taskId/comments error:", error);
      res.status(500).json({ status: "error", message: "Terjadi kesalahan internal server: " + error.message });
    } finally {
      if (connection) connection.release();
    }
  });

  router.post("/api/projects/:projectId/tasks/:taskId/comments", verifyProjectAccess(['*']), async (req, res) => {
    let connection;
    try {
      const { projectId, taskId } = req.params;
      const { content, authorId } = req.body;
      const effectiveAuthorId = authorId || (req as any).user?.uid || (req as any).user?.id || req.headers["x-user-id"] || "guest";
      connection = await mysqlPool.getConnection();
      
      const newId = crypto.randomUUID();
      
      await connection.query(
        "INSERT INTO Comments (id, taskId, content, authorId) VALUES (?, ?, ?, ?)",
        [newId, taskId, content, effectiveAuthorId]
      );
      
      // Trigger notification for commenting on task
      sendProjectActivityNotification(projectId, effectiveAuthorId as string, 'comment_task', {
        taskId,
        commentContent: content
      }).catch(err => console.error("Comment notification broadcast failed:", err));

      res.json({ status: "success", data: { id: newId, taskId, content, authorId: effectiveAuthorId } });
    } catch (error: any) {
      console.error("LOG ANOMALI CRITICAL: POST /api/projects/:projectId/tasks/:taskId/comments error:", error);
      res.status(500).json({ status: "error", message: "Terjadi kesalahan internal server: " + error.message });
    } finally {
      if (connection) connection.release();
    }
  });

  // ActivityLogs API
  router.get("/api/projects/:projectId/activity", verifyProjectAccess(['*']), async (req, res) => {
    let connection;
    try {
      const { projectId } = req.params;
      connection = await mysqlPool.getConnection();
      const [rows] = await connection.query(
        "SELECT * FROM ActivityLogs WHERE projectId = ? ORDER BY createdAt DESC LIMIT 50",
        [projectId]
      );
      res.json({ status: "success", data: rows });
    } catch (error: any) {
      console.error("LOG ANOMALI CRITICAL: GET /api/projects/:projectId/activity error:", error);
      res.status(500).json({ status: "error", message: "Terjadi kesalahan internal server: " + error.message });
    } finally {
      if (connection) connection.release();
    }
  });

  router.post("/api/projects/:projectId/activity", verifyProjectAccess(['*']), async (req, res) => {
    let connection;
    try {
      const { projectId } = req.params;
      const { action, details, userId } = req.body;
      connection = await mysqlPool.getConnection();
      
      const newId = crypto.randomUUID();
      
      await connection.query(
        `INSERT INTO ActivityLogs (id, projectId, userId, action, details)
         VALUES (?, ?, ?, ?, ?)`,
        [newId, projectId, userId || null, action, details || '']
      );

      // Trigger automatic broadcast notifications to all team members of this project
      const notificationTitle = `Aktivitas Proyek: ${action}`;
      const notificationMessage = details || `Terdapat aktivitas "${action}" pada proyek ini.`;
      
      // Execute asynchronously so we don't block the client response
      broadcastProjectNotification(projectId, userId || null, notificationTitle, notificationMessage, "project_activity", newId)
        .catch(err => console.error("Async broadcast error:", err));
      
      res.json({ status: "success", data: { id: newId } });
    } catch (error: any) {
      console.error("LOG ANOMALI CRITICAL: POST /api/projects/:projectId/activity error:", error);
      res.status(500).json({ status: "error", message: "Terjadi kesalahan internal server: " + error.message });
    } finally {
      if (connection) connection.release();
    }
  });

  // Notifications API
  router.get("/api/users/:userId/notifications", async (req, res) => {
    let connection;
    try {
      // 1. EKSTRAKSI USER ID SECARA DINAMIS (Anti-IDOR / Data Leakage Protection)
      const activeUser = (req as any).user;
      if (!activeUser) {
        return res.status(401).json({ status: "error", message: "Akses tidak sah: Sesi tidak valid atau belum login." });
      }

      const activeUserId = activeUser.id || activeUser.uid;
      const requesterRole = activeUser.role || "user";
      
      // Enforce dynamic user query & isolate user data dynamically (No hardcoded names)
      let targetUserId = activeUserId;
      if (requesterRole === 'admin') {
        // Global administrators can query target users for debugging/troubleshooting
        targetUserId = req.params.userId || activeUserId;
      }
      
      connection = await mysqlPool.getConnection();
      
      // Support fetching notifications by both db standard id and firebase uid
      const [uCheck]: any = await connection.query(
        "SELECT id, uid, displayName, username, role FROM Users WHERE id = ? OR uid = ?", 
        [targetUserId, targetUserId]
      );
      
      let userIds = [targetUserId];
      let dbUserId = targetUserId;
      let firebaseUid = targetUserId;
      let userDisplayName = "";
      let userUsername = "";
      let globalRole = "user";
      
      if (uCheck.length > 0) {
        userIds = [uCheck[0].id, uCheck[0].uid].filter(Boolean);
        dbUserId = uCheck[0].id;
        firebaseUid = uCheck[0].uid;
        userDisplayName = uCheck[0].displayName || "";
        userUsername = uCheck[0].username || "";
        globalRole = uCheck[0].role || "user";
      }
      
      // Fetch user's project roles from ProjectMembers
      const [pmRows]: any = await connection.query(
        "SELECT projectId, role FROM ProjectMembers WHERE userId = ? OR userId = ?",
        [dbUserId, firebaseUid]
      );
      
      const projectRoles: Record<string, string> = {};
      const adminProjectIds: string[] = [];
      const qaProjectIds: string[] = [];
      
      for (const pm of pmRows) {
        if (pm.projectId) {
          const rawRole = (pm.role || "").toLowerCase().trim();
          let role = rawRole;
          if (rawRole === 'qa engineer' || rawRole === 'qa') {
            role = 'qa';
            qaProjectIds.push(pm.projectId);
          } else if (rawRole === 'ui/ux designer') {
            role = 'ui/ux';
          } else if (rawRole === 'database admin (dba)' || rawRole === 'database admin') {
            role = 'dba';
          } else if (rawRole === 'architecture') {
            role = 'arsitektur';
          } else if (rawRole === 'business analyst') {
            role = 'bisnis analyst';
          } else if (rawRole === 'project admin' || rawRole === 'admin') {
            role = 'admin';
            adminProjectIds.push(pm.projectId);
          }
          projectRoles[pm.projectId] = role;
        }
      }
      
      // Also fetch if user is owner of any project (treat as admin)
      const [ownerRows]: any = await connection.query(
        "SELECT id FROM Projects WHERE ownerId = ? OR ownerId = ?",
        [dbUserId, firebaseUid]
      );
      for (const p of ownerRows) {
        projectRoles[p.id] = 'admin';
        if (!adminProjectIds.includes(p.id)) {
          adminProjectIds.push(p.id);
        }
      }
      
      // Secure, high-performance, and unified candidate selection query (Anti-IDOR)
      const sqlQuery = `
        SELECT n.*, 
               t.projectId as taskProjectId, t.assigneeId, t.reporterId, t.status as taskStatus,
               m.projectId as meetingProjectId,
               a.projectId as activityProjectId
        FROM Notifications n
        LEFT JOIN Tasks t ON n.relatedId = t.id
        LEFT JOIN Meetings m ON n.relatedId = m.id
        LEFT JOIN ActivityLogs a ON n.relatedId = a.id
        WHERE n.recipientId IN (?)
        ORDER BY n.createdAt DESC
        LIMIT 150
      `;
      
      const [rows]: any = await connection.query(sqlQuery, [userIds]);
      
      // Dynamic multi-layered verification filter for role-based security & spam protection
      const filteredNotifications = rows.filter((row: any) => {
        const projId = row.taskProjectId || row.meetingProjectId || row.activityProjectId || null;
        
        // Resolve dynamic authorization context based on current database state (no hardcoding)
        const isAdminGlobally = globalRole === "admin";
        const roleInProject = projId ? projectRoles[projId] : null;
        const isProjectAdmin = roleInProject === "admin";
        const isUserAdmin = isAdminGlobally || isProjectAdmin;
        
        // Direct context variables (Assignee/Creator mapping)
        const isAssignee = (row.assigneeId === dbUserId || row.assigneeId === firebaseUid);
        const isCreator = (row.reporterId === dbUserId || row.reporterId === firebaseUid);
        
        // Target of action: user is mentioned or explicitly involved in the notification message
        const isTargetAksi = isAssignee || 
          (userDisplayName && row.message && row.message.includes(userDisplayName)) || 
          (userUsername && row.message && row.message.includes(userUsername));
          
        // Mentioned: explicit check for '@' prefix followed by username or display name
        const isMentioned = (userUsername && row.message && row.message.toLowerCase().includes("@" + userUsername.toLowerCase())) || 
          (userDisplayName && row.message && row.message.toLowerCase().includes("@" + userDisplayName.toLowerCase()));
          
        const hasDirectContext = isAssignee || isCreator || isTargetAksi || isMentioned;
        
        // System or general notification not tied to any project is visible to the recipient
        if (!projId) {
          // If the notification type is project_activity, task, or meeting, or has project/tugas keywords,
          // then it is NOT a general system notification.
          const isProjectOrTaskRelated = row.type === "project_activity" || 
            row.type === "task" || 
            row.type === "meeting" ||
            (row.title && (row.title.toLowerCase().includes("proyek") || row.title.toLowerCase().includes("project") || row.title.toLowerCase().includes("tugas") || row.title.toLowerCase().includes("task"))) ||
            (row.message && (row.message.toLowerCase().includes("proyek") || row.message.toLowerCase().includes("project") || row.message.toLowerCase().includes("tugas") || row.message.toLowerCase().includes("task")));

          if (isProjectOrTaskRelated) {
            // Project/Task related: Non-admins must have direct context (target of action or mentioned)
            if (isUserAdmin) {
              return true;
            }
            return hasDirectContext;
          }
          
          return true;
        }
        
        // --- 1. JALUR AKSES ADMIN (GLOBAL & PROJECT ADMIN) ---
        if (isUserAdmin) {
          // Administrators can view all project activity notifications
          return true;
        }
        
        // --- 2. JALUR AKSES USER BIASA (NON-ADMIN) ---
        // If they are not in the project, block immediately (Information Barrier)
        if (!roleInProject) {
          return false;
        }
        
        // Role-specific granular rules for non-admin:
        if (roleInProject === "viewer") {
          // Viewers only receive notifications if explicitly @mentioned
          return isMentioned;
        }
        
        if (roleInProject === "qa") {
          // QA Engineers can view tasks assigned to them, created by them, or status updates transitioning to testing states
          const isQAStatus = row.taskStatus && (
            row.taskStatus.toLowerCase() === "ready for qa" || 
            row.taskStatus.toLowerCase() === "testing" || 
            row.taskStatus.toLowerCase() === "uat"
          );
          return hasDirectContext || isQAStatus;
        }
        
        // Regular roles (Member, Developer, UI/UX Designer, DBA, Architecture, Analyst):
        // STRICT filter: only allow if user has direct involvement or direct mention (No cross-talk spam)
        return hasDirectContext;
      });
      
      // Limit to max 50 for performance and layout compact-ability
      res.json({ status: "success", data: filteredNotifications.slice(0, 50) });
    } catch (error: any) {
      console.error("LOG ANOMALI CRITICAL: GET /api/users/:userId/notifications error:", error);
      res.status(500).json({ status: "error", message: "Terjadi kesalahan internal server: " + error.message });
    } finally {
      if (connection) connection.release();
    }
  });

  router.post("/api/users/:userId/notifications", async (req, res) => {
    let connection;
    try {
      const { userId } = req.params;
      const { type, title, message, relatedId, senderId, read } = req.body;
      connection = await mysqlPool.getConnection();
      
      const newId = crypto.randomUUID();
      
      await connection.query(
        "INSERT INTO Notifications (id, recipientId, senderId, title, message, type, relatedId, `read`) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        [newId, userId, senderId || null, title || "New Notification", message || "", type || "system", relatedId || null, read ? 1 : 0]
      );
      
      res.json({ status: "success", data: { id: newId, type, title, message, relatedId, senderId, read } });
    } catch (error: any) {
      console.error("LOG ANOMALI CRITICAL: POST /api/users/:userId/notifications error:", error);
      res.status(500).json({ status: "error", message: "Terjadi kesalahan internal server: " + error.message });
    } finally {
      if (connection) connection.release();
    }
  });

  router.put("/api/users/:userId/notifications/:id", async (req, res) => {
    let connection;
    try {
      const { id } = req.params;
      const { read } = req.body;
      connection = await mysqlPool.getConnection();
      
      await connection.query(
        "UPDATE Notifications SET `read` = ? WHERE id = ?",
        [read ? 1 : 0, id]
      );
      
      res.json({ status: "success", message: "Notification updated" });
    } catch (error: any) {
      console.error("LOG ANOMALI CRITICAL: PUT /api/users/:userId/notifications/:id error:", error);
      res.status(500).json({ status: "error", message: "Terjadi kesalahan internal server: " + error.message });
    } finally {
      if (connection) connection.release();
    }
  });

  // ============================================
  // LIVE CHAT WIDGET ENDPOINTS (LanPro Chat System)
  // ============================================
  router.get("/api/chat/last-messages", async (req, res) => {
    let connection;
    try {
      const { userId } = req.query;
      if (!userId) {
        return res.status(400).json({ status: "error", message: "userId diperlukan." });
      }
      connection = await mysqlPool.getConnection();
      
       const [rows]: any = await connection.query(
        `SELECT m1.*, 
                CASE WHEN m1.senderId = ? THEN m1.receiverId ELSE m1.senderId END AS partnerId
         FROM Messages m1
         INNER JOIN (
             SELECT 
                 CASE WHEN senderId = ? THEN receiverId ELSE senderId END AS partnerId,
                 MAX(timestamp) as max_ts
             FROM Messages
             WHERE (senderId = ? OR receiverId = ?) AND receiverId != 'group'
             GROUP BY partnerId
         ) m2 ON (
             (m1.senderId = ? AND m1.receiverId = m2.partnerId) OR 
             (m1.receiverId = ? AND m1.senderId = m2.partnerId)
         ) AND m1.timestamp = m2.max_ts`,
        [userId, userId, userId, userId, userId, userId]
      );

      // Fetch last message for Group Chat
      const [groupRows]: any = await connection.query(
        "SELECT * FROM Messages WHERE receiverId = 'group' ORDER BY timestamp DESC LIMIT 1"
      );

      // Fetch last message for AI Assistant (lanpro-ai)
      const [aiRows]: any = await connection.query(
        "SELECT * FROM Messages WHERE (senderId = ? AND receiverId = 'lanpro-ai') OR (senderId = 'lanpro-ai' AND receiverId = ?) ORDER BY timestamp DESC LIMIT 1",
        [userId, userId]
      );

      let allRows = [...rows];
      if (groupRows && groupRows.length > 0) {
        allRows.push({
          ...groupRows[0],
          partnerId: "group"
        });
      }
      if (aiRows && aiRows.length > 0) {
        allRows.push({
          ...aiRows[0],
          partnerId: "lanpro-ai"
        });
      }
      
      res.json({ status: "success", data: allRows });
    } catch (error: any) {
      console.error("LOG ANOMALI CRITICAL: GET /api/chat/last-messages error:", error);
      res.status(500).json({ status: "error", message: "Terjadi kesalahan internal server: " + error.message });
    } finally {
      if (connection) connection.release();
    }
  });

  router.get("/api/chat/messages", async (req, res) => {
    let connection;
    try {
      const { senderId, receiverId } = req.query;
      if (!senderId || !receiverId) {
        return res.status(400).json({ status: "error", message: "senderId dan receiverId diperlukan." });
      }

      connection = await mysqlPool.getConnection();
      let rows;
      if (receiverId === "group") {
        [rows] = await connection.query(
          "SELECT * FROM Messages WHERE receiverId = 'group' ORDER BY timestamp ASC"
        );
      } else {
        [rows] = await connection.query(
          "SELECT * FROM Messages WHERE (senderId = ? AND receiverId = ?) OR (senderId = ? AND receiverId = ?) ORDER BY timestamp ASC",
          [senderId, receiverId, receiverId, senderId]
        );
      }
      res.json({ status: "success", data: rows });
    } catch (error: any) {
      console.error("LOG ANOMALI CRITICAL: GET /api/chat/messages error:", error);
      res.status(500).json({ status: "error", message: "Terjadi kesalahan internal server: " + error.message });
    } finally {
      if (connection) connection.release();
    }
  });

  router.post("/api/chat/messages", async (req, res) => {
    let connection;
    try {
      const { senderId, receiverId, message, timestamp } = req.body;
      if (!senderId || !receiverId || !message) {
        return res.status(400).json({ status: "error", message: "senderId, receiverId, dan message diperlukan." });
      }

      const id = crypto.randomUUID();
      connection = await mysqlPool.getConnection();
      await connection.query(
        "INSERT INTO Messages (id, senderId, receiverId, message, timestamp, `read`) VALUES (?, ?, ?, ?, ?, ?)",
        [id, senderId, receiverId, message, timestamp || new Date().toISOString(), 0]
      );

      res.json({ status: "success", data: { id, senderId, receiverId, message, timestamp, read: 0 } });
    } catch (error: any) {
      console.error("LOG ANOMALI CRITICAL: POST /api/chat/messages error:", error);
      res.status(500).json({ status: "error", message: "Terjadi kesalahan internal server: " + error.message });
    } finally {
      if (connection) connection.release();
    }
  });

  router.put("/api/chat/messages/read", async (req, res) => {
    let connection;
    try {
      const { senderId, receiverId } = req.body;
      if (!senderId || !receiverId) {
        return res.status(400).json({ status: "error", message: "senderId dan receiverId diperlukan." });
      }

      connection = await mysqlPool.getConnection();
      await connection.query(
        "UPDATE Messages SET `read` = ? WHERE senderId = ? AND receiverId = ?",
        [1, senderId, receiverId]
      );

      res.json({ status: "success", message: "Pesan berhasil ditandai sebagai dibaca." });
    } catch (error: any) {
      console.error("LOG ANOMALI CRITICAL: PUT /api/chat/messages/read error:", error);
      res.status(500).json({ status: "error", message: "Terjadi kesalahan internal server: " + error.message });
    } finally {
      if (connection) connection.release();
    }
  });

  router.get("/api/chat/unread-counts", async (req, res) => {
    let connection;
    try {
      const { userId } = req.query;
      if (!userId) {
        return res.status(400).json({ status: "error", message: "userId diperlukan." });
      }

      connection = await mysqlPool.getConnection();
      const [rows] = await connection.query(
        "SELECT senderId, COUNT(*) as count FROM Messages WHERE receiverId = ? AND `read` = 0 GROUP BY senderId",
        [userId]
      );
      res.json({ status: "success", data: rows });
    } catch (error: any) {
      console.error("LOG ANOMALI CRITICAL: GET /api/chat/unread-counts error:", error);
      res.status(500).json({ status: "error", message: "Terjadi kesalahan internal server: " + error.message });
    } finally {
      if (connection) connection.release();
    }
  });

  router.post("/api/chat/simulate-reply", async (req, res) => {
    try {
      const { senderId, receiverId, message, senderName, senderRole } = req.body;
      if (!senderId || !receiverId || !message) {
        return res.status(400).json({ status: "error", message: "senderId, receiverId, dan message diperlukan." });
      }

      // 1. Get sender info (who is replying)
      const replySenderName = senderName || "Rekan Tim";
      const replySenderRole = senderRole || "user";

      // 2. Try using Gemini API first
      let replyText = "";
      const apiKey = process.env.GEMINI_API_KEY;

      if (apiKey) {
        try {
          const ai = new GoogleGenAI({
            apiKey: apiKey,
            httpOptions: {
              headers: {
                'User-Agent': 'aistudio-build',
              }
            }
          });

          const isAiAssistant = (senderId === "lanpro-ai");
          const prompt = isAiAssistant
            ? `Anda adalah "LanPro AI Assistant", asisten kecerdasan buatan super pintar, ramah, dan solutif di platform manajemen proyek SDLC "LanPro".
Anda baru saja menerima pesan dari pengguna: "${message}"

Berikan jawaban yang membantu, profesional, dan mengesankan dalam Bahasa Indonesia yang santai, modern, dan sopan (gaya tech startup Jakarta).
Berikan saran praktis seputar manajemen tugas, debugging, figma, database, atau motivasi kerja.
Jaga agar jawaban tetap ringkas dan padat (maksimal 2-3 kalimat saja) seperti pesan chat instan di Slack/Teams. Jangan gunakan kata pengantar atau tanda kutip, langsung tulis balasannya.`
            : `Anda adalah rekan kerja tim profesional bernama "${replySenderName}" dengan peran "${replySenderRole}" di tim proyek "LanPro" (sebuah Platform manajemen SDLC kelas profesional).
Anda baru saja menerima pesan chat berikut dari rekan Anda:
"${message}"

Tolong berikan balasan chat yang sangat realistis, ramah, profesional, menggunakan Bahasa Indonesia yang santai tapi sopan (seperti bahasa profesional startup/tech Jakarta).
Tanggapi pesan tersebut secara langsung dan relevan sesuai dengan peran Anda (${replySenderRole}):
- Jika Anda adalah Siti Rahma (IT Head), fokuslah pada arsitektur, database, pipeline release, performa, atau code quality.
- Jika Anda adalah Rian Hidayat (PM), fokuslah pada deadlines, sprint backlog, manajemen resiko, koordinasi tim, atau Story Points.
- Jika Anda adalah Budi Santoso (Developer), bicarakan tentang debugging, penulisan kode, progress tugas teknis, pull request, atau tantangan implementasi.
- Jika Anda adalah Dewi Lestari (UI/UX Designer), bicarakan tentang estetika layout, kontras warna, figma, aset visual, responsive web, atau feedback user experience.

Balasan Anda harus singkat (1-3 kalimat saja) layaknya pesan instan di Slack atau WA, jangan terlalu formal atau kaku. Jangan ada kata pengantar atau tanda kutip, langsung tulis balasannya saja.`;

          const response = await generateContentWithFallback(ai, {
            model: "gemini-flash-latest",
            contents: prompt,
            config: {
              temperature: 0.8,
            }
          });

          if (response && response.text) {
            replyText = response.text.trim();
          }
        } catch (geminiError) {
          console.warn("[SIMULATION_API] Gagal menggunakan Gemini API, beralih ke fallback:", geminiError);
        }
      }

      // 3. Fallback smart responses if Gemini is not available or failed
      if (!replyText) {
        const role = String(replySenderRole).toLowerCase();
        let options = [
          "Halo! Terima kasih atas pesannya. Pesan Anda sudah saya terima dan akan segera saya pelajari kembali. Selamat bekerja!",
          "Siap, dipahami. Mari kita tuntaskan sprint ini dengan baik!",
          "Oke, nanti kita bahas detailnya saat sinkronisasi ya."
        ];

        if (role.includes("head") || role.includes("architect") || replySenderName.includes("Siti")) {
          options = [
            "Halo! Saya sedang mereview skema database terbaru dan integrasi gateway. Ada hal spesifik yang ingin dikoordinasikan terkait modul core platform?",
            "Terima kasih infonya. Terkait pipeline deployment, tolong pastikan port 3000 sudah terkonfigurasi dengan benar di nginx proxy ya.",
            "Bagus sekali. Rencana migrasi tabel sudah aman, kita akan eksekusi setelah testing di staging selesai. Kabari jika butuh bantuan debug.",
            "Saya sedang melihat laporan audit logs untuk aktivitas perubahan skema. Kita perlu memitigasi kemungkinan downtime pada release berikutnya."
          ];
        } else if (role.includes("manager") || role.includes("pm") || replySenderName.includes("Rian")) {
          options = [
            "Halo! Terkait sprint backlog kita minggu ini, apakah ada hambatan (blocker) yang perlu kita diskusikan bersama?",
            "Siap, terima kasih atas updatenya. Tolong pastikan Story Points di task diupdate ya agar velocity sprint kita terpantau presisi.",
            "Untuk milestone rilis hybrid berikutnya, saya sedang mengoordinasikan jadwal dengan stakeholders. Tetap semangat rekan-rekan!",
            "Bisa tolong siapkan ringkasan progres untuk bahan meeting besok pagi? Cukup 3 poin utama saja."
          ];
        } else if (role.includes("user") || role.includes("dev") || replySenderName.includes("Budi")) {
          options = [
            "Siap mas/mbak! Saya sedang fokus memperbaiki bug Navbar di Safari mobile dulu ya. Setelah ini selesai, saya langsung lanjut ke task dependensi berikutnya.",
            "Aman! Tadi saya sudah coba pull code terbaru, jalurnya lancar tanpa konflik. Ada bagian kode tertentu yang perlu saya bantu review?",
            "Untuk integrasi REST API, saya sedang mencocokkan payload JSON-nya. Sejauh ini aman, tinggal nunggu approval pull request dari tim lead.",
            "Waduh, tadi sempat ada error koneksi DB di lokal saya, tapi sekarang sudah teratasi setelah diswitch ke fallback JSON local. Thank you infonya!"
          ];
        } else if (role.includes("viewer") || role.includes("design") || replySenderName.includes("Dewi")) {
          options = [
            "Halo! Desain mockup figma untuk flow kolaborasi dan bagan timeline waterfall sudah saya finalisasi. Silakan dicek kontras warna dan responsive layout-nya.",
            "Terima kasih sarannya. Saya setuju, ukuran font di card details memang agak kekecilan di mobile screen. Akan segera saya sesuaikan ukuran padding-nya.",
            "Untuk layout visual dashboard baru, saya menggunakan pendekatan monokromatik abu-abu gelap dengan aksen oranye terang agar terkesan modern dan tangguh.",
            "Siap! Jika butuh aset SVG baru atau panduan layout bento grid, langsung colek saya saja ya."
          ];
        }

        const randomIndex = Math.floor(Math.random() * options.length);
        replyText = options[randomIndex];
      }

      // 4. Save simulated reply to Database
      const id = crypto.randomUUID();
      const timestamp = new Date().toISOString();
      const connection = await mysqlPool.getConnection();
      await connection.query(
        "INSERT INTO Messages (id, senderId, receiverId, message, timestamp, `read`) VALUES (?, ?, ?, ?, ?, ?)",
        [id, senderId, receiverId, replyText, timestamp, 0]
      );
      connection.release();

      res.json({
        status: "success",
        data: {
          id,
          senderId,
          receiverId,
          message: replyText,
          timestamp,
          read: 0
        }
      });
    } catch (error: any) {
      console.error("LOG ANOMALI CRITICAL: POST /api/chat/simulate-reply error:", error);
      res.status(500).json({ status: "error", message: "Gagal membuat simulasi balasan: " + error.message });
    }
  });

  // Helper for Cycle Detection in Task Dependencies
  async function hasCycle(connection: any, startNode: string, targetNode: string): Promise<boolean> {
    const visited = new Set<string>();
    const stack = [targetNode]; // We check if targetNode can eventually reach startNode

    while (stack.length > 0) {
      const current = stack.pop()!;
      if (current === startNode) return true;
      if (visited.has(current)) continue;
      
      visited.add(current);
      
      // Find all tasks that depend on 'current'
      const [edges]: any = await connection.query(
        "SELECT targetTaskId FROM LinkedTasks WHERE sourceTaskId = ?",
        [current]
      );
      
      for (const edge of edges) {
        stack.push(edge.targetTaskId);
      }
    }
    return false;
  }

  // Task Links API
  router.post("/api/projects/:projectId/tasks/:taskId/links", verifyProjectAccess(['admin', 'manager', 'head', 'developer', 'member']), async (req, res) => {
    let connection;
    try {
      const { taskId } = req.params;
      const { targetTaskId, relationType } = req.body;
      connection = await mysqlPool.getConnection();
      
      // Cycle Detection: If A depends on B, we must ensure B does not already depend on A
      // In Gantt, if we add A -> B (Finish-to-Start), B is the target.
      // We check if B can reach A through existing links.
      if (relationType === 'precedes' || relationType === 'blocks') {
        const cycleDetected = await hasCycle(connection, taskId, targetTaskId);
        if (cycleDetected) {
          return res.status(400).json({ 
            status: "error", 
            message: "Circular Dependency Terdeteksi! Tugas ini tidak bisa dihubungkan karena akan menyebabkan looping (saling menunggu)." 
          });
        }
      }

      const newId = crypto.randomUUID();
      
      await connection.query(
        "INSERT INTO LinkedTasks (id, sourceTaskId, targetTaskId, relationType) VALUES (?, ?, ?, ?)",
        [newId, taskId, targetTaskId, relationType]
      );
      
      res.json({ status: "success", data: { id: newId, sourceTaskId: taskId, targetTaskId, relationType } });
    } catch (error: any) {
      console.error("LOG ANOMALI CRITICAL: POST /api/projects/:projectId/tasks/:taskId/links error:", error);
      res.status(500).json({ status: "error", message: "Terjadi kesalahan internal server: " + error.message });
    } finally {
      if (connection) connection.release();
    }
  });

  router.delete("/api/projects/:projectId/tasks/:taskId/links/:linkId", async (req, res) => {
    let connection;
    try {
      const { taskId, linkId } = req.params;
      connection = await mysqlPool.getConnection();
      
      // Get targetTaskId first
      const [linkRows] = await connection.query("SELECT * FROM LinkedTasks WHERE id = ?", [linkId]);
      if ((linkRows as any[]).length > 0) {
        const link = (linkRows as any[])[0];
        // Delete original link
        await connection.query("DELETE FROM LinkedTasks WHERE id = ?", [linkId]);
        // Delete inverse link
        await connection.query("DELETE FROM LinkedTasks WHERE sourceTaskId = ? AND targetTaskId = ?", [link.targetTaskId, link.sourceTaskId]);
      }
      
      res.json({ status: "success", message: "Task link deleted" });
    } catch (error: any) {
      console.error("LOG ANOMALI CRITICAL: DELETE /api/projects/:projectId/tasks/:taskId/links/:linkId error:", error);
      res.status(500).json({ status: "error", message: "Terjadi kesalahan internal server: " + error.message });
    } finally {
      if (connection) connection.release();
    }
  });

  
  // Documents API


export default router;
