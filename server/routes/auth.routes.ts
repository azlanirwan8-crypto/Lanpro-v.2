import { Router } from "express";
import { z } from "zod";
import { UAParser } from "ua-parser-js";
import mysqlPool from "../../src/lib/db";
import { authenticateJWT, activeUserSessions, generateToken } from "../middleware/auth";
import { hashPassword, verifyPassword } from "../helpers/hash";

const router = Router();

// Login Attempt & Lockout Tracker
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
  const cleanInput = usernameInput ? usernameInput.trim() : '';
  const userKey = cleanInput.toLowerCase();
  const now = Date.now();

  let attemptData = loginAttemptsMap.get(userKey);
  if (!attemptData) {
    attemptData = { count: 0, blockedUntil: null };
    loginAttemptsMap.set(userKey, attemptData);
  }

  if (attemptData.blockedUntil && now < attemptData.blockedUntil) {
    const remainingMs = attemptData.blockedUntil - now;
    const remainingStr = formatRemainingTime(remainingMs);
    return {
      success: false,
      status: 429,
      message: `Akun Anda terkunci sementara karena 3x salah password. Silakan tunggu ${remainingStr} lagi sebelum mencoba kembali.`,
      remainingMs
    };
  }

  if (attemptData.blockedUntil && now >= attemptData.blockedUntil) {
    attemptData.count = 0;
    attemptData.blockedUntil = null;
  }

  let connection;
  let user: any = null;
  let matchedUsername = cleanInput;

  try {
    connection = await mysqlPool.getConnection();
    const [rows]: any = await connection.query(
      "SELECT * FROM Users WHERE LOWER(username) = ? OR LOWER(email) = ?",
      [userKey, userKey]
    );

    if (rows && rows.length > 0) {
      user = rows[0];
      matchedUsername = user.username || user.displayName || cleanInput;
    }
  } catch (err) {
    console.error("Database query error during login:", err);
  } finally {
    if (connection) connection.release();
  }

  if (!user) {
    return {
      success: false,
      status: 404,
      message: "Username / Email tidak ditemukan dalam sistem. Silakan periksa kembali."
    };
  }

  const isValidPassword = await verifyPassword(passwordInput, user.passwordHash || user.password, matchedUsername);

  if (!isValidPassword) {
    attemptData.count += 1;

    if (attemptData.count >= 3) {
      const LOCKOUT_DURATION_MS = 5 * 60 * 1000; // 5 menit
      attemptData.blockedUntil = now + LOCKOUT_DURATION_MS;
      const remainingStr = formatRemainingTime(LOCKOUT_DURATION_MS);
      return {
        success: false,
        status: 429,
        message: `Terlalu banyak percakapan gagal. Akun Anda telah terkunci selama 5 menit (${remainingStr}).`,
        remainingMs: LOCKOUT_DURATION_MS
      };
    }

    const sisaPercobaan = 3 - attemptData.count;
    return {
      success: false,
      status: 401,
      message: `Password yang Anda masukkan salah. (Sisa percobaan: ${sisaPercobaan}x sebelum terkunci 5 menit).`
    };
  }

  loginAttemptsMap.delete(userKey);

  return {
    success: true,
    user
  };
}

// POST /api/auth/login
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

    const activeSession = activeUserSessions.get(userId.toString());
    if (activeSession && !force) {
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

    if (force && (req.app as any).get("io")) {
      (req.app as any).get("io").emit("FORCE_LOGOUT_EVENT", { 
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

// POST /api/auth/force-logout
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

    if ((req.app as any).get("io")) {
      (req.app as any).get("io").emit("FORCE_LOGOUT_EVENT", { 
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
  } catch (e) {
    return res.status(500).json({ status: "error" });
  }
});

// POST /api/auth/logout
router.post("/api/auth/logout", (req, res) => {
  try {
    const userId = req.body?.userId;
    if (userId) activeUserSessions.delete(userId.toString());
    return res.json({ status: "success" });
  } catch (e) {
    return res.json({ status: "success" });
  }
});

// GET /api/auth/verify
router.get("/api/auth/verify", authenticateJWT, async (req: any, res) => {
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
    console.error("LOG ANOMALI CRITICAL: Verify error:", error);
    return res.status(500).json({ status: "error", message: "Gagal memverifikasi sesi." });
  } finally {
    if (connection) connection.release();
  }
});

// POST /api/auth/refresh
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
    const newToken = generateToken(user);
    return res.json({
      status: "success",
      token: newToken,
      user
    });
  } catch (error: any) {
    console.error("Refresh token error:", error);
    return res.status(500).json({ status: "error", message: "Gagal memperpanjang sesi." });
  } finally {
    if (connection) connection.release();
  }
});

export default router;
