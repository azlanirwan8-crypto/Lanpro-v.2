import crypto from "crypto";
import mysqlPool from "../../src/lib/db";

export const createAutomatedNotification = async (io: any, recipientId: string, senderId: string | null, title: string, message: string, type: string, relatedId: string | null) => {
  let conn;
  try {
    conn = await mysqlPool.getConnection();
    
    let resolvedRecipientId = recipientId;
    const [uCheck]: any = await conn.query("SELECT id, uid FROM Users WHERE id = ? OR uid = ?", [recipientId, recipientId]);
    if (uCheck.length > 0) {
      resolvedRecipientId = uCheck[0].uid || uCheck[0].id;
    }
    
    const notificationId = crypto.randomUUID();
    await conn.query(
      "INSERT INTO Notifications (id, recipientId, senderId, title, message, type, relatedId, `read`) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [notificationId, resolvedRecipientId, senderId || null, title, message, type, relatedId || null, 0]
    );
    
    console.log(`[AUTOMATED NOTIFICATION] Sent notification of type ${type} to user ${resolvedRecipientId}`);
    
    if (io) {
      io.emit("data_changed", { path: `/api/users/${resolvedRecipientId}/notifications`, method: "POST" });
    }
  } catch (err) {
    console.error("Failed to create automated notification:", err);
  } finally {
    if (conn) conn.release();
  }
};

export const broadcastProjectNotification = async (io: any, projectId: string, senderId: string | null, title: string, message: string, type: string, relatedId: string | null) => {
  let conn;
  try {
    conn = await mysqlPool.getConnection();
    
    const [members]: any = await conn.query(
      "SELECT userId FROM ProjectMembers WHERE projectId = ?",
      [projectId]
    );
    
    console.log(`[BROADCAST NOTIFICATION] Broadcasting to ${members.length} members for project ${projectId}`);
    
    for (const member of members) {
      const recipientId = member.userId;
      
      let resolvedRecipientId = recipientId;
      const [uCheck]: any = await conn.query("SELECT id, uid FROM Users WHERE id = ? OR uid = ?", [recipientId, recipientId]);
      if (uCheck.length > 0) {
        resolvedRecipientId = uCheck[0].uid || uCheck[0].id;
      }
      
      if (senderId && (senderId === resolvedRecipientId || (uCheck.length > 0 && senderId === String(uCheck[0].id)))) {
        continue;
      }
      
      const notificationId = crypto.randomUUID();
      await conn.query(
        "INSERT INTO Notifications (id, recipientId, senderId, title, message, type, relatedId, `read`) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        [notificationId, resolvedRecipientId, senderId || null, title, message, type, relatedId || null, 0]
      );
      
      if (io) {
        io.emit("data_changed", { path: `/api/users/${resolvedRecipientId}/notifications`, method: "POST" });
      }
    }
  } catch (err) {
    console.error("[BROADCAST NOTIFICATION ERROR]", err);
  } finally {
    if (conn) conn.release();
  }
};

export const sendProjectActivityNotification = async (io: any, projectId: string, triggerUserId: string, actionType: 'create_task' | 'update_task' | 'comment_task', payload: any) => {
  let conn;
  try {
    conn = await mysqlPool.getConnection();
    
    const [actorRows]: any = await conn.query(
      "SELECT displayName, username FROM Users WHERE id = ? OR uid = ?",
      [triggerUserId, triggerUserId]
    );
    const actorName = actorRows.length > 0 ? (actorRows[0].displayName || actorRows[0].username) : "Seorang anggota tim";
    
    let title = "";
    let message = "";
    let type = "project_activity";
    let relatedId = payload.taskId || null;
    
    let taskInfo = "";
    if (payload.taskId) {
      const [taskRows]: any = await conn.query(
        "SELECT taskKey, title FROM Tasks WHERE id = ?",
        [payload.taskId]
      );
      if (taskRows.length > 0) {
        taskInfo = ` [${taskRows[0].taskKey}: ${taskRows[0].title}]`;
      }
    }
    
    const nowString = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', second: '2-digit' }) + " WIB";
    
    if (actionType === 'create_task') {
      title = "🆕 Tugas Baru Ditambahkan";
      message = `${actorName} membuat tugas baru${taskInfo} pada ${nowString}.`;
    } else if (actionType === 'update_task') {
      title = "🔄 Update Status Tugas";
      const { field, oldValue, newValue } = payload;
      if (field === 'status') {
        message = `${actorName} mengubah status${taskInfo} dari "${oldValue || 'None'}" menjadi "${newValue}" pada ${nowString}.`;
      } else if (field === 'assigneeId') {
        let assigneeName = "unassigned";
        if (newValue) {
          const [assRows]: any = await conn.query("SELECT displayName, username FROM Users WHERE id = ? OR uid = ?", [newValue, newValue]);
          if (assRows.length > 0) {
            assigneeName = assRows[0].displayName || assRows[0].username;
          }
        }
        message = `${actorName} menugaskan${taskInfo} ke "${assigneeName}" pada ${nowString}.`;
      } else {
        message = `${actorName} memperbarui field "${field}" pada${taskInfo} menjadi "${newValue}" pada ${nowString}.`;
      }
    } else if (actionType === 'comment_task') {
      title = "💬 Komentar Baru";
      message = `${actorName} mengomentari tugas${taskInfo}: "${payload.commentContent}" pada ${nowString}.`;
    }
    
    const [members]: any = await conn.query(
      "SELECT userId FROM ProjectMembers WHERE projectId = ?",
      [projectId]
    );
    
    console.log(`[BROADCAST ACTIVITY] ${title} - to ${members.length} project members`);
    
    for (const member of members) {
      const recipientId = member.userId;
      
      let resolvedRecipientId = recipientId;
      const [uCheck]: any = await conn.query("SELECT id, uid FROM Users WHERE id = ? OR uid = ?", [recipientId, recipientId]);
      if (uCheck.length > 0) {
        resolvedRecipientId = uCheck[0].uid || uCheck[0].id;
      }
      
      const isActor = (triggerUserId === resolvedRecipientId) || 
                      (uCheck.length > 0 && triggerUserId === String(uCheck[0].id)) ||
                      (uCheck.length > 0 && triggerUserId === String(uCheck[0].uid));
                      
      if (isActor) {
        continue;
      }
      
      const notificationId = crypto.randomUUID();
      await conn.query(
        "INSERT INTO Notifications (id, recipientId, senderId, title, message, type, relatedId, `read`) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        [notificationId, resolvedRecipientId, triggerUserId || null, title, message, type, relatedId, 0]
      );
      
      if (io) {
        io.emit("data_changed", { path: `/api/users/${resolvedRecipientId}/notifications`, method: "POST" });
      }
    }
  } catch (err) {
    console.error("[BROADCAST ACTIVITY ERROR]", err);
  } finally {
    if (conn) conn.release();
  }
};

export const checkUpcomingDueDates = async (io: any) => {
  let connection;
  try {
    connection = await mysqlPool.getConnection();
    
    const [tasks]: any = await connection.query(
      "SELECT * FROM Tasks WHERE dueDate IS NOT NULL AND status != 'Done' AND assigneeId IS NOT NULL"
    );
    
    const now = new Date();
    const twentyFourHoursLater = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    
    for (const task of tasks) {
      try {
        const taskDueDate = new Date(task.dueDate);
        if (isNaN(taskDueDate.getTime())) continue;
        
        if (taskDueDate >= oneHourAgo && taskDueDate <= twentyFourHoursLater) {
          const assigneeId = task.assigneeId;
          
          const [existingNotify]: any = await connection.query(
            "SELECT id FROM Notifications WHERE recipientId = ? AND relatedId = ? AND type = 'deadline'",
            [assigneeId, task.id]
          );
          
          if (existingNotify.length === 0) {
            const taskKey = task.taskKey || task.key || task.id;
            const taskTitle = task.title || "Tugas";
            
            const title = "⏰ Batas Waktu Tugas Mendekat (24 Jam)";
            const message = `Tugas "${taskTitle}" (${taskKey}) akan segera jatuh tempo dalam waktu kurang dari 24 jam (${taskDueDate.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}).`;
            
            await createAutomatedNotification(io, assigneeId, null, title, message, 'deadline', task.id);
          }
        }
      } catch (taskErr) {
        console.error(`Error processing due date check for task ${task.id}:`, taskErr);
      }
    }
  } catch (err) {
    console.error("LOG ANOMALI CRITICAL: checkUpcomingDueDates error:", err);
  } finally {
    if (connection) connection.release();
  }
};
