import express from "express";
import crypto from "crypto";
import { UAParser } from "ua-parser-js";
import mysqlPool from "../../src/lib/db";
import { authenticateJWT, activeUserSessions, generateToken } from "../middleware/auth";
import { hashPassword, verifyPassword } from "../helpers/hash";
import { createAuditLog } from "../services/audit.service";
import { GoogleGenAI, Type } from "@google/genai";
import { z } from "zod";
import admin from 'firebase-admin';

const router = express.Router();



  router.get("/api/auth/verify", authenticateJWT, async (req: any, res) => {
    let connection;
    try {
      connection = await mysqlPool.getConnection();
      const [rows]: any = await connection.query(
        "SELECT * FROM Users WHERE id = ? OR uid = ?",
        [req.user.id || req.user.uid, req.user.uid || req.user.id]
      );
      if (rows.length === 0) {
        return res.json({ status: "success", user: req.user });
      }
      res.json({ status: "success", user: rows[0] });
    } catch (error: any) {
      console.error("LOG ANOMALI CRITICAL: Verify token error:", error);
      res.json({ status: "success", user: req.user });
    } finally {
      if (connection) connection.release();
    }
  });

  router.post("/api/auth/refresh", authenticateJWT, async (req: any, res) => {
    let connection;
    try {
      connection = await mysqlPool.getConnection();
      const [rows]: any = await connection.query(
        "SELECT * FROM Users WHERE id = ? OR uid = ?",
        [req.user.id || req.user.uid, req.user.uid || req.user.id]
      );
      if (rows.length === 0) {
        return res.status(404).json({ status: "error", message: "Pengguna tidak ditemukan." });
      }
      const user = rows[0];
      if (user.status === 'rejected') {
        return res.status(403).json({ status: "error", message: "Akun Anda ditolak oleh admin." });
      }
      if (user.status === 'pending') {
        return res.status(403).json({ status: "error", message: "Akun Anda masih dalam status peninjauan." });
      }

      const newToken = generateToken(user);
      return res.json({
        status: "success",
        token: newToken,
        user: {
          id: user.id,
          uid: user.uid,
          username: user.username,
          displayName: user.displayName,
          nama_lengkap: user.nama_lengkap,
          email: user.email,
          role: user.role,
          status: user.status,
          permissions: user.permissions,
          department: user.department,
          position: user.position,
          phone: user.phone
        }
      });
    } catch (error: any) {
      console.error("LOG ANOMALI CRITICAL: Refresh token error:", error);
      return res.status(500).json({ status: "error", message: "Gagal memperpanjang sesi." });
    } finally {
      if (connection) connection.release();
    }
  });


  router.post("/api/auth/google-verify", async (req, res) => {
      if (!admin.apps.length) {
          admin.initializeApp({
              credential: admin.credential.applicationDefault()
          });
      }
      const { idToken } = req.body;
      try {
          const decodedToken = await admin.auth().verifyIdToken(idToken);
          const email = decodedToken.email;
          
          if (!email) {
              return res.status(400).json({ status: "error", message: "Email not provided by Google." });
          }

          const [users]: any = await mysqlPool.query("SELECT * FROM Users WHERE email = ?", [email]);
          
          if (users.length === 0) {
              return res.status(403).json({ status: "error", message: `Gagal Sign In: Email ${email} tidak terdaftar dalam sistem. Silakan gunakan email yang terdaftar atau hubungi Administrator.` });
          }
          
          const user = users[0];
          // Create JWT session
          const token = generateToken(user);
          res.json({ status: "success", token, user });
      } catch (error: any) {
          console.error("Google verify error:", error);
          res.status(500).json({ status: "error", message: "Internal server error" });
      }
  });

  // ============================================
  // LOGIN RATE LIMIT & LOCKOUT TRACKER LOGIC
  // ============================================
  interface LoginAttemptTracker {
    count: number;
    blockedUntil: number | null;
  }

  type AuthResultSuccess = { success: true; user: any };
  type AuthResultFailure = { success: false; status: number; message: string; remainingMs?: number };
  type AuthResult = AuthResultSuccess | AuthResultFailure;

  const loginAttemptsMap = new Map<string, LoginAttemptTracker>();

  function formatRemainingTime(remainingMs: number): string {
    const totalSeconds = Math.max(1, Math.ceil(remainingMs / 1000));
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;

    if (mins > 0 && secs > 0) {
      return `${mins} menit ${secs} detik`;
    } else if (mins > 0) {
      return `${mins} menit`;
    } else {
      return `${secs} detik`;
    }
  }

  async function handleUserAuthentication(usernameInput: string, passwordInput: string): Promise<AuthResult> {
    let connection;
    let rows: any[] = [];
    try {
      connection = await mysqlPool.getConnection();
      const [result]: any = await connection.query(
        "SELECT * FROM Users WHERE username = ? OR email = ?",
        [usernameInput, usernameInput]
      );
      rows = result;
    } catch (err) {
      console.error("Database query error in handleUserAuthentication:", err);
      return {
        success: false,
        status: 500,
        message: "Terjadi kesalahan koneksi database."
      };
    } finally {
      if (connection) connection.release();
    }

    // 1. Username is NOT found in database
    if (!rows || rows.length === 0) {
      return {
        success: false,
        status: 401,
        message: "Kata sandi atau nama pengguna yang Anda masukkan salah. Silakan periksa kembali kredensial Anda."
      };
    }

    const user = rows[0];
    const matchedUsername = user.username || usernameInput;
    const userKey = (user.username || usernameInput).trim().toLowerCase();

    let attempt = loginAttemptsMap.get(userKey);
    if (!attempt) {
      attempt = { count: 0, blockedUntil: null };
      loginAttemptsMap.set(userKey, attempt);
    }

    const now = Date.now();

    // Check if user is currently blocked
    if (attempt.blockedUntil && now < attempt.blockedUntil) {
      const remainingMs = attempt.blockedUntil - now;
      const timeStr = formatRemainingTime(remainingMs);
      return {
        success: false,
        status: 429,
        message: `halo ${matchedUsername} akun anda terblokir, Silahkan menunggu ${timeStr} lagi untuk coba kembali`,
        remainingMs
      };
    }

    // If block expired, reset attempt count
    if (attempt.blockedUntil && now >= attempt.blockedUntil) {
      attempt.count = 0;
      attempt.blockedUntil = null;
    }

    // Check if user account status is pending / inactive / not approved
    if (user.status === 'pending' || user.status === 'unapproved' || user.status === 'inactive' || (user.status && user.status !== 'approved' && user.status !== 'active' && user.status !== 'rejected')) {
      return {
        success: false,
        status: 403,
        message: `halo ${matchedUsername} akun anda belum di aktifkan, silahkan hubungi admin ya`
      };
    }

    if (user.status === 'rejected') {
      return {
        success: false,
        status: 403,
        message: "Akun Anda telah ditolak oleh Admin."
      };
    }

    // 2. Verify password
    const isValid = await verifyPassword(passwordInput, user.passwordHash, user.username);

    if (!isValid) {
      attempt.count += 1;

      // 3. Reached 5 failed attempts -> Block for 5 minutes (300,000 ms)
      if (attempt.count >= 5) {
        const blockDurationMs = 5 * 60 * 1000;
        attempt.blockedUntil = Date.now() + blockDurationMs;
        return {
          success: false,
          status: 429,
          message: `halo ${matchedUsername} akun anda terblokir, Silahkan menunggu 5 menit lagi untuk coba kembali`,
          remainingMs: blockDurationMs
        };
      }

      // 4. Failed password but attempt count < 5
      return {
        success: false,
        status: 401,
        message: `halo ${matchedUsername} password yang anda masukan salah, Silakan periksa kembali kredensial Anda.`
      };
    }

    // 5. Password is correct! Reset attempt tracker
    loginAttemptsMap.delete(userKey);

    return {
      success: true,
      user
    };
  }

  router.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password, force } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ status: "error", message: "Username/Email dan Password wajib diisi." });
      }

      const authResult = await handleUserAuthentication(username, password);
      if (authResult.success === false) {
        return res.status(authResult.status).json({
          status: "error",
          message: authResult.message,
          remainingMs: authResult.remainingMs
        });
      }

      const user = authResult.user;
      const userId = user.id || user.uid;

      if (user.status === 'rejected') { 
        return res.status(403).json({ status: "error", message: "Akun Anda telah ditolak oleh Admin." });
      }

      if (user.status === 'pending') { 
        return res.status(403).json({ status: "pending", message: "Akun Anda belum aktif. Silakan hubungi admin atau verifikasi email Anda." });
      }

      // --- SESSION COLLISION CHECK ---
      const activeSession = activeUserSessions.get(userId.toString());
      if (activeSession && !force) {
        // Cek jika sesi aktif belum expired (misal asumsi aktif jika lastActive < 24 jam)
        const ONE_DAY = 24 * 60 * 60 * 1000;
        if (Date.now() - activeSession.lastActiveAt < ONE_DAY) {
           return res.status(409).json({
             status: "conflict",
             message: "Akun Anda Masih Aktif di perangkat lain.",
             activeSession
           });
        }
      }

      const token = generateToken(user);
      
      // --- STORE SESSION METADATA ---
      const parser = new UAParser(req.headers['user-agent']);
      const browserInfo = parser.getBrowser();
      const osInfo = parser.getOS();
      const deviceInfo = parser.getDevice();
      
      const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'Unknown IP';
      const browser = `${browserInfo.name || 'Unknown Browser'} ${browserInfo.version || ''}`.trim();
      let device = `${osInfo.name || 'Unknown OS'} ${osInfo.version || ''}`.trim();
      if (deviceInfo.vendor || deviceInfo.model) {
        device += ` (${deviceInfo.vendor || ''} ${deviceInfo.model || ''})`.trim();
      }

      activeUserSessions.set(userId.toString(), {
        token,
        ip: String(ip),
        browser,
        device,
        lastActiveAt: Date.now(),
        browserSessionId: req.body.browserSessionId || ''
      });

      if (force) {
        // Broadcast force logout event to old sessions
        req.io.emit("FORCE_LOGOUT_EVENT", { 
          userId: userId.toString(), 
          newToken: token,
          browserSessionId: req.body.browserSessionId || ''
        });
      }
      return res.json({
        status: "success",
        user: {
          id: user.id,
          uid: user.uid,
          username: user.username,
          displayName: user.displayName,
          nama_lengkap: user.nama_lengkap,
          email: user.email,
          role: user.role,
          status: user.status,
          permissions: user.permissions,
          department: user.department,
          position: user.position,
          phone: user.phone
        },
        token
      });
    } catch (error: any) {
      console.error("LOG ANOMALI CRITICAL: Login error:", error);
      return res.status(500).json({ status: "error", message: "Terjadi kesalahan internal server." });
    }
  });

  
  router.post("/api/auth/force-logout", async (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) return res.status(400).json({ status: "error" });
      
      const authResult = await handleUserAuthentication(username, password);
      if (authResult.success === false) {
        return res.status(authResult.status).json({
          status: "error",
          message: authResult.message,
          remainingMs: authResult.remainingMs
        });
      }

      const user = authResult.user;
      const userId = user.id || user.uid;

      const token = generateToken(user);
      
      const parser = new UAParser(req.headers['user-agent']);
      const browserInfo = parser.getBrowser();
      const osInfo = parser.getOS();
      const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'Unknown IP';
      const browser = `${browserInfo.name || 'Unknown'} ${browserInfo.version || ''}`.trim();
      const device = `${osInfo.name || 'Unknown'} ${osInfo.version || ''}`.trim();

      activeUserSessions.set(userId.toString(), {
        token,
        ip: String(ip),
        browser,
        device,
        lastActiveAt: Date.now(),
        browserSessionId: req.body.browserSessionId || ''
      });

      req.io.emit("FORCE_LOGOUT_EVENT", { 
        userId: userId.toString(), 
        newToken: token,
        browserSessionId: req.body.browserSessionId || ''
      });

      return res.json({
        status: "success",
        user: {
          id: user.id,
          uid: user.uid,
          username: user.username,
          displayName: user.displayName,
          nama_lengkap: user.nama_lengkap,
          email: user.email,
          role: user.role,
          status: user.status,
          permissions: user.permissions,
          department: user.department,
          position: user.position,
          phone: user.phone
        },
        token
      });
    } catch (e) {
      return res.status(500).json({ status: "error" });
    }
  });

  router.post("/api/auth/logout", (req, res) => {
    try {
      const userId = req.body?.userId;
      if (userId) activeUserSessions.delete(userId.toString());
      return res.json({ status: "success" });
    } catch (e) {
      return res.json({ status: "success" });
    }
  });


  router.post("/api/auth/register", async (req, res) => {
    let connection;
    try {
      const { username, password, nama_lengkap, name, displayName, email, role, status, department, position, permissions, phone } = req.body;
      const fullName = nama_lengkap || name || displayName || "";

      // Server-side Zod Schema Validation
      const serverSchema = z.object({
        name: z.string().min(3, "Nama minimal 3 karakter").max(25, "Nama maksimal 25 karakter"),
        email: z.string().email("Format email tidak valid (contoh: user@gmail.com)"),
        username: z.string().regex(/^[a-zA-Z]+$/, "Username hanya boleh berupa huruf").max(10, "Username maksimal 10 karakter"),
        password: z.string().min(8, "Password minimal 8 karakter")
          .regex(/[A-Z]/, "Password harus mengandung minimal 1 huruf besar (A-Z)")
          .regex(/[a-z]/, "Password harus mengandung minimal 1 huruf kecil (a-z)")
          .regex(/[0-9]/, "Password harus mengandung minimal 1 angka (0-9)")
          .regex(/[@$!%*?&]/, "Password harus mengandung minimal 1 simbol khusus (@$!%*?&)")
      });

      const validationResult = serverSchema.safeParse({
        name: fullName,
        email,
        username,
        password
      });

      if (!validationResult.success) {
        const errorMsg = validationResult.error.issues[0]?.message || "Validasi pendaftaran gagal.";
        return res.status(400).json({ status: "error", message: errorMsg, errors: validationResult.error.flatten().fieldErrors });
      }

      connection = await mysqlPool.getConnection();
      
      // Check if username is already in use
      const [usernameCheck]: any = await connection.query(
        "SELECT id FROM Users WHERE username = ?",
        [username]
      );
      if (usernameCheck.length > 0) {
        return res.status(400).json({ status: "error", message: "Username sudah digunakan oleh akun lain." });
      }

      // Check if email is already in use
      const [emailCheck]: any = await connection.query(
        "SELECT id FROM Users WHERE email = ?",
        [email]
      );
      if (emailCheck.length > 0) {
        return res.status(400).json({ status: "error", message: "Email sudah digunakan oleh akun lain." });
      }

      const uid = req.body.uid || req.body.id || Date.now().toString(36) + Math.random().toString(36).substring(2);
      
      const insertDisplayName = displayName || nama_lengkap || name || username;
      const insertRole = role || 'user';
      const insertStatus = status || 'pending'; // Nilai default saat daftar adalah 'pending' / non-aktif
      const insertDepartment = department || null;
      const insertPosition = position || null;
      const insertPermissions = permissions ? JSON.stringify(permissions) : null;
      
      try {
          await connection.query(
            `INSERT INTO Users (id, uid, username, nama_lengkap, email, displayName, photoURL, role, status, passwordHash, department, position, permissions, phone) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [uid, uid, username, fullName, email, insertDisplayName, null, insertRole, insertStatus, hashPassword(password), insertDepartment, insertPosition, insertPermissions, phone || null]
          );
      } catch (insertError: any) {
          if (insertError.code === 'ER_DUP_ENTRY' || insertError.errno === 1062) {
              console.log("User already exists (code " + insertError.code + "), ignoring insert:", email);
          } else {
              throw insertError;
          }
      }
      
      return res.status(201).json({
        status: "success",
        message: "Akun Anda sudah berhasil dibuat. Silahkan hubungi Admin untuk diaktifkan sebelum Anda dapat melakukan login."
      });
    } catch (error: any) {
      console.error("LOG ANOMALI CRITICAL: Register error:", error);
      res.status(500).json({ status: "error", message: "Terjadi kesalahan internal server: " + error.message });
    } finally {
      if (connection) connection.release();
    }
  });

  
  // Users Heartbeat API (Fallback for Vercel Serverless)


export default router;
