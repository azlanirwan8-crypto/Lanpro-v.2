import express from "express";
import crypto from "crypto";
import mysqlPool from "../../src/lib/db";
import { authenticateJWT, activeUserSessions } from "../middleware/auth";
import { verifyProjectAccess } from "../middleware/rbac";
import { hashPassword, verifyPassword } from "../helpers/hash";
import { createAuditLog } from "../services/audit.service";
import { broadcastProjectNotification, sendProjectActivityNotification, checkUpcomingDueDates } from "../services/notification.service";

const router = express.Router();

  router.post("/api/users/heartbeat", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) return res.status(401).json({ status: "error" });
      const token = authHeader.split(" ")[1];
      const decoded = jwt.verify(token, getJwtSecret()) as any;
      const userId = decoded.id;
      
      const connection = await mysqlPool.getConnection();
      await connection.query(
        "UPDATE Users SET lastSeen = ? WHERE id = ?",
        [new Date().toISOString(), userId]
      );
      connection.release();
      res.json({ status: "success" });
    } catch (e) {
      // Ignore errors for heartbeat
      res.json({ status: "error", message: "Silent error" });
    }
  });

  // Resilient Presence Ping API (Fallback for Vercel Serverless)
  router.post("/api/presence/ping", authenticateJWT, async (req: any, res) => {
    let connection;
    try {
      const userId = req.user.id || req.user.uid;
      const nowStr = new Date().toISOString();
      connection = await mysqlPool.getConnection();
      
      // Update lastSeen in database
      await connection.query(
        "UPDATE Users SET lastSeen = ? WHERE id = ? OR uid = ?",
        [nowStr, userId, userId]
      );
      
      // Query all users to get their latest lastSeen and presence status
      const [rows]: any = await connection.query(
        "SELECT id, uid, username, nama_lengkap, email, displayName, photoURL, role, status, lastSeen, department, position, permissions, phone FROM Users"
      );
      
      // Process database rows, parsing permissions if needed
      const processedUsers = rows.map((u: any) => {
        try { if (u.permissions && typeof u.permissions === 'string') u.permissions = JSON.parse(u.permissions); } catch (e) {}
        return u;
      });
      
      const currentUserProfile = processedUsers.find((u: any) => {
        const uId = u.uid || u.id;
        return uId && uId.toString() === userId.toString();
      });

      // Write to Redis if connected
      if (currentUserProfile && isRedisConnected) {
        try {
          await pubClient.set(`presence:user:${userId}`, JSON.stringify(currentUserProfile), { EX: 30 });
        } catch (redisErr) {
          console.warn("[REDIS] Failed to write user presence:", redisErr);
        }
      }

      // Reconcile active users: try Redis first, fallback to DB
      let activeUsers: any[] = [];
      if (isRedisConnected) {
        try {
          const keys = await pubClient.keys("presence:user:*");
          if (keys.length > 0) {
            const values = await pubClient.mGet(keys);
            values.forEach((val: any) => {
              if (val) {
                try {
                  activeUsers.push(JSON.parse(val));
                } catch (e) {}
              }
            });
          }
        } catch (redisErr) {
          console.warn("[REDIS] Failed to read presence from Redis:", redisErr);
        }
      }

      // If Redis has no active keys or is disconnected, fallback to database lastSeen within 30s
      if (activeUsers.length === 0) {
        activeUsers = processedUsers.filter((u: any) => {
          if (!u.lastSeen) return false;
          const lastSeenTime = new Date(u.lastSeen).getTime();
          return (Date.now() - lastSeenTime) < 30000; // 30 seconds TTL
        });
      }
      
      // Sync into globalPresence (for socket clients on this instance)
      activeUsers.forEach((u: any) => {
        const uid = u.uid || u.id;
        if (uid) {
          globalPresence.set(uid.toString(), u);
        }
      });
      
      res.json({
        status: "success",
        onlineUsers: activeUsers,
        allUsers: processedUsers
      });
    } catch (error: any) {
      console.error("Presence Ping Error:", error);
      res.status(500).json({ status: "error", message: error.message });
    } finally {
      if (connection) connection.release();
    }
  });

  // Resilient Presence Sync API (Redis cache for fast reconciliation across serverless instances)
  router.get("/api/presence/sync", authenticateJWT, async (req: any, res) => {
    try {
      let onlineUsers: any[] = [];
      if (isRedisConnected) {
        try {
          const keys = await pubClient.keys("presence:user:*");
          if (keys.length > 0) {
            const values = await pubClient.mGet(keys);
            values.forEach((val: any) => {
              if (val) {
                try {
                  onlineUsers.push(JSON.parse(val));
                } catch (e) {}
              }
            });
          }
        } catch (redisErr) {
          console.warn("[REDIS] Failed to sync presence from Redis, falling back to database", redisErr);
        }
      }

      // If Redis has no keys or is not connected, fallback to database lastSeen within 30s
      if (onlineUsers.length === 0) {
        const connection = await mysqlPool.getConnection();
        try {
          const [rows]: any = await connection.query(
            "SELECT id, uid, username, nama_lengkap, email, displayName, photoURL, role, status, lastSeen, department, position, permissions, phone FROM Users"
          );
          const processedUsers = rows.map((u: any) => {
            try { if (u.permissions && typeof u.permissions === 'string') u.permissions = JSON.parse(u.permissions); } catch (e) {}
            return u;
          });
          onlineUsers = processedUsers.filter((u: any) => {
            if (!u.lastSeen) return false;
            const lastSeenTime = new Date(u.lastSeen).getTime();
            return (Date.now() - lastSeenTime) < 30000;
          });
        } finally {
          connection.release();
        }
      }

      res.json({
        status: "success",
        onlineUsers
      });
    } catch (error: any) {
      console.error("Presence Sync Error:", error);
      res.status(500).json({ status: "error", message: error.message });
    }
  });

  // Users API

  router.get("/api/users", async (req, res) => {
    try {
      const rows = await query("SELECT * FROM Users");
      res.json({ status: "success", data: rows });
    } catch (error: any) {
      console.error("LOG ANOMALI CRITICAL: GET /api/users error:", error);
      res.status(500).json({ status: "error", message: "Terjadi kesalahan internal server: " + error.message });
    }
  });

  router.get("/api/users/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const connection = await mysqlPool.getConnection();
      const [rows] = await connection.query("SELECT * FROM Users WHERE id = ?", [id]);
      connection.release();
      if ((rows as any[]).length > 0) {
        let user = (rows as any[])[0];
        try { if (user.permissions) user.permissions = JSON.parse(user.permissions); } catch (e) {}
        res.json({ status: "success", data: user });
      } else {
        res.status(404).json({ status: "error", message: "User not found" });
      }
    } catch (error: any) {
      console.error("LOG ANOMALI CRITICAL: GET /api/users/:id error:", error);
      res.status(500).json({ status: "error", message: "Terjadi kesalahan internal server: " + error.message });
    }
  });

  router.put("/api/users/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { role, status, permissions, department, position, displayName, username, email, phone, passwordHash } = req.body;
      
      const connection = await mysqlPool.getConnection();
      
      const updates = [];
      const values = [];
      
      if (role !== undefined) { updates.push('role = ?'); values.push(role); }
      if (status !== undefined) { updates.push('status = ?'); values.push(status); }
      if (permissions !== undefined) { updates.push('permissions = ?'); values.push(permissions ? JSON.stringify(permissions) : null); }
      if (department !== undefined) { updates.push('department = ?'); values.push(department || null); }
      if (position !== undefined) { updates.push('position = ?'); values.push(position || null); }
      if (displayName !== undefined) { updates.push('displayName = ?'); values.push(displayName); }
      if (username !== undefined) { updates.push('username = ?'); values.push(username); }
      if (email !== undefined) { 
        updates.push('email = ?'); 
        values.push(email && email.trim() !== "" ? email.trim() : null); 
      }
      if (phone !== undefined) { 
        updates.push('phone = ?'); 
        values.push(phone && phone.trim() !== "" ? phone.trim() : null); 
      }
      if (passwordHash !== undefined) { 
        updates.push('passwordHash = ?'); 
        values.push(passwordHash.startsWith('pbkdf2$') ? passwordHash : hashPassword(passwordHash)); 
      }
      
      if (updates.length > 0) {
        values.push(id);
        await connection.query(
          `UPDATE Users SET ${updates.join(', ')} WHERE id = ?`,
          values
        );
      }
      
      connection.release();
      res.json({ status: "success", message: "User updated" });
    } catch (error: any) {
      console.error("LOG ANOMALI CRITICAL: PUT /api/users error:", error);
      res.status(500).json({ status: "error", message: "Terjadi kesalahan internal server: " + error.message });
    }
  });

  router.delete("/api/users/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const connection = await mysqlPool.getConnection();
      await connection.query("DELETE FROM Users WHERE id = ?", [id]);
      connection.release();
      res.json({ status: "success", message: "User deleted" });
    } catch (error: any) {
      console.error("LOG ANOMALI CRITICAL: DELETE /api/users error:", error);
      res.status(500).json({ status: "error", message: "Terjadi kesalahan internal server: " + error.message });
    }
  });

  router.put("/api/profile/update", authenticateJWT, async (req: any, res: any) => {
    try {
      const { id } = req.user;
      const { displayName, username, email, phone, currentPassword, newPassword } = req.body;
      const connection = await mysqlPool.getConnection();

      const [users]: any = await connection.query("SELECT * FROM Users WHERE id = ?", [id]);
      if (users.length === 0) {
        connection.release();
        return res.status(404).json({ status: "error", message: "User not found" });
      }
      const user = users[0];

      if (currentPassword && newPassword) {
        const isValid = await verifyPassword(currentPassword, user.passwordHash, user.username);
        if (!isValid) {
          connection.release();
          return res.status(400).json({ status: "error", message: "Password lama yang Anda masukkan salah!" });
        }
        await connection.query("UPDATE Users SET passwordHash = ? WHERE id = ?", [hashPassword(newPassword), id]);
      }

      await connection.query("UPDATE Users SET displayName = ?, username = ?, email = ?, phone = ? WHERE id = ?", [displayName, username, email, phone, id]);

      connection.release();
      res.json({ status: "success", message: "Profile updated" });
    } catch (error: any) {
      console.error("LOG ANOMALI CRITICAL: PUT /api/profile/update error:", error);
      res.status(500).json({ status: "error", message: "Terjadi kesalahan internal server: " + error.message });
    }
  });



export default router;
