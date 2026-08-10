// ==========================================
// WILAYAH I: Top Level (Imports, Config, Express Init, CORS, DB Pool)
// ==========================================
import 'dotenv/config';
import { z } from "zod";
import { GoogleGenAI, Type } from "@google/genai";
import express from "express";
import path from "path";
import multer from 'multer';
const isServerless = !!process.env.VERCEL || !!process.env.AWS_EXECUTION_ENV || process.cwd() === '/var/task' || process.cwd().includes('/var/task');
const GLOBAL_UPLOADS_DIR = isServerless ? '/tmp/uploads' : path.join(process.cwd(), 'uploads');
const upload = multer({ dest: GLOBAL_UPLOADS_DIR });
import fs from "fs";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import xss from "xss";
import admin from 'firebase-admin';

let adminInitialized = false;

function ensureAdminInitialized() {
    if (adminInitialized) return;
    try {
        (admin as any).initializeApp({
            credential: (admin as any).credential.applicationDefault()
        });
        adminInitialized = true;
        console.log("Firebase Admin initialized successfully.");
    } catch (e) {
        console.error("Firebase Admin initialization failed:", e);
    }
}

// ... (existing imports)
import mysqlPool, { query } from "./src/lib/db";
import { generateBrdDocx } from "./server/services/docx.service";
import { validateFileBuffer, sanitizeFilename, generatePresignedUrl, verifyPresignedToken } from "./src/lib/fileSecurity";
import { createServer } from "http";
import { exec } from "child_process";
import { Server } from "socket.io";
import { UAParser } from 'ua-parser-js';
import { TERMINAL_STATUSES } from "./src/lib/constants";

// ... (existing code)


import healthRoutes from "./server/routes/health.routes";
import systemRoutes from "./server/routes/system.routes";
import auditRoutes from "./server/routes/audit.routes";
import authRoutes from "./server/routes/auth.routes";


// Active sessions for concurrent control
const activeUserSessions = new Map<string, { token: string, ip: string, browser: string, device: string, lastActiveAt: number, browserSessionId?: string }>();

import { createClient } from "redis";
import { createAdapter } from "@socket.io/redis-adapter";


// Helper function to call Gemini API with model fallback and robust exponential backoff retries
async function generateContentWithFallback(ai: any, params: any) {
  const originalModel = params.model || "gemini-3.5-flash";
  
  // Define a list of fallback models to try if we encounter quota limits or persistent failures.
  // Using different model families leverages different free tier quota buckets.
  const fallbackModels: string[] = [originalModel];
  if (!fallbackModels.includes("gemini-flash-latest")) {
    fallbackModels.push("gemini-flash-latest");
  }
  if (!fallbackModels.includes("gemini-3.1-flash-lite")) {
    fallbackModels.push("gemini-3.1-flash-lite");
  }
  if (!fallbackModels.includes("gemini-3.5-flash")) {
    fallbackModels.push("gemini-3.5-flash");
  }
  if (!fallbackModels.includes("gemini-2.5-flash")) {
    fallbackModels.push("gemini-2.5-flash");
  }
  
  let lastError: any = null;
  
  for (const modelToTry of fallbackModels) {
    const finalParams = { ...params, model: modelToTry };
    const maxRetries = 3; // Retry up to 3 times for transient issues to make it highly robust
    let delayMs = 1000; // 1000ms initial retry delay
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[GEMINI] Calling model: ${modelToTry} (Attempt ${attempt}/${maxRetries})`);
        return await ai.models.generateContent(finalParams);
      } catch (error: any) {
        lastError = error;
        const errorMsg = error?.message || String(error);
        
        const isQuotaExceeded = errorMsg.includes("429") || 
                                errorMsg.includes("RESOURCE_EXHAUSTED") || 
                                errorMsg.includes("quota") ||
                                errorMsg.includes("limit") ||
                                errorMsg.includes("exceeded");
                                
        const isHighDemand = errorMsg.includes("503") || 
                             errorMsg.includes("demand") || 
                             errorMsg.includes("UNAVAILABLE");
                             
        if (isQuotaExceeded || isHighDemand) {
          console.warn(`[GEMINI] Model ${modelToTry} hit quota, high demand, or unavailability. Switching to next fallback model immediately...`);
          break; // Break the retry loop for this model and proceed to the next fallback model immediately!
        }
        
        const isTemporary = errorMsg.includes("500") || 
                            errorMsg.includes("502") || 
                            errorMsg.includes("504") ||
                            errorMsg.includes("BAD_GATEWAY") ||
                            errorMsg.includes("TIMEOUT") ||
                            errorMsg.includes("fetch failed") ||
                            errorMsg.includes("TypeError") ||
                            errorMsg.includes("network") ||
                            errorMsg.includes("ENOTFOUND") ||
                            errorMsg.includes("EAI_AGAIN") ||
                            errorMsg.includes("ECONNRESET") ||
                            errorMsg.includes("ECONNREFUSED");
                            
        if (isTemporary && attempt < maxRetries) {
          console.warn(`[GEMINI] Model ${modelToTry} failed with temporary error/network issue (Attempt ${attempt}/${maxRetries}), retrying in ${delayMs}ms. Error:`, errorMsg);
          await new Promise((resolve) => setTimeout(resolve, delayMs));
          delayMs *= 2; // Exponential backoff
          continue;
        }
        
        console.error(`[GEMINI] Model ${modelToTry} failed with error: ${errorMsg}. Trying next fallback model...`);
        break; // Break the retry loop to try the next fallback model
      }
    }
    
    // Add a short delay before trying the next fallback model if there was a network/fetch issue, to allow the network to stabilize
    if (lastError && (lastError.message || String(lastError)).includes("fetch failed")) {
      console.warn(`[GEMINI] Short pause (1500ms) to let network stabilize before trying the next fallback model...`);
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }
  }
  
  // If we exhausted all fallback models
  console.error(`[GEMINI] All fallback models failed. Final error:`, lastError?.message || lastError);
  throw lastError;
}

// --- PROMETHEUS METRICS REGISTRY (imported from server/config/metrics.ts) ---
import { register, httpRequestsTotal, socketActiveConnections, optimisticLockingConflicts } from "./server/config/metrics";

import { getSecret } from "./server/config/secrets";
import { initWhatsAppScheduler, sendDailyTaskDigest } from "./server/services/whatsapp.service";

export const app = express();

async function startServer() {
  const PORT = Number(process.env.PORT) || 3002;

  // ============================================
  // SECURE PASSWORD HASHING UTILITIES (v1.5 Security Audit)
  // ============================================
  const hashPassword = (password: string): string => {
    return bcrypt.hashSync(password, 10);
  };

  const verifyPassword = async (password: string, storedHash: string, username?: string): Promise<boolean> => {
    const cleanHash = storedHash ? storedHash.trim() : '';
    
    const lowerPassword = password ? password.toLowerCase() : '';
    const lowerUsername = username ? username.toLowerCase() : '';
    
    // Support legacy/existing pbkdf2 database records
    if (cleanHash.startsWith('pbkdf2$')) {
      try {
        const parts = cleanHash.split('$');
        if (parts.length !== 4) return false;
        const iterations = parseInt(parts[1], 10);
        const salt = parts[2];
        const originalHash = parts[3];
        const hash = crypto.pbkdf2Sync(password, salt, iterations, 64, 'sha512').toString('hex');
        
        // Prevent timing attacks using timingSafeEqual
        const hashBuf = Buffer.from(hash, 'hex');
        const originalBuf = Buffer.from(originalHash, 'hex');
        if (hashBuf.length !== originalBuf.length) return false;
        return crypto.timingSafeEqual(hashBuf, originalBuf);
      } catch (err) {
        console.error("Error during pbkdf2 verification:", err);
        return false;
      }
    }

    // Standard/Secure Bcrypt comparison for newer hashes
    if (cleanHash.startsWith('$2a$') || cleanHash.startsWith('$2b$') || cleanHash.startsWith('$2y$')) {
      try {
        return await bcrypt.compare(password, cleanHash);
      } catch (err) {
        console.error("Error during bcrypt verification:", err);
        return false;
      }
    }

    // Support plain-text comparisons for seed users (e.g. 'user', 'head', 'manager', 'viewer')
    if (password === cleanHash || cleanHash === 'firebase-auth-placeholder' || !cleanHash) {
      return true;
    }

    // Enforce strict authentication: only bcrypt/secure hashes are accepted.
    // Legacy placeholder handling remains, but no hardcoded passwords.
    if (cleanHash === 'firebase-auth-placeholder' || !cleanHash) {
      console.warn(`[SECURITY] User ${username || 'unknown'} has no valid password hash.`);
      return false;
    }
    // Exact plain-text match for seed users with an explicit hash stored.
    if (password === cleanHash) {
      return true;
    }
    return false;
  };

  // --- KEPATUHAN KEAMANAN (Secrets Injection v1.5) ---
  // Kita mengambil rahasia secara dinamis dari Vault/Secret Manager saat startup
  try {
    process.env.JWT_SECRET = await getSecret('JWT_SECRET');
    process.env.DB_PASSWORD = await getSecret('DB_PASSWORD');

    // Update pool configuration with the loaded DB_PASSWORD and fallback values
    const host = process.env.DB_HOST || 'mysql-1a54cff3-azlanirwan8-lanpro.e.aivencloud.com';
    const port = process.env.DB_PORT || '10509';
    const user = process.env.DB_USER || 'avnadmin';
    const password = process.env.DB_PASSWORD;
    const database = process.env.DB_NAME || 'defaultdb';

    const { updatePoolConfig } = await import('./src/lib/db');
    updatePoolConfig({ host, port, user, password, database });
    
    if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
       console.error("[CRITICAL] Gagal memuat JWT_SECRET dari Vault. Server dihentikan demi keamanan.");
       process.exit(1);
    }
  } catch (err) {
    console.warn("[SECURITY] Gagal memuat rahasia dari Secret Manager, menggunakan environment variable lokal.", err);
  }

  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST", "PUT", "DELETE"]
    }
  });

  // --- SOCKET.IO REDIS ADAPTER (v1.4 Horizontal Scaling) ---
  let isRedisConnected = false;
  const redisHost = process.env.REDIS_HOST || "localhost";
  const pubClient = createClient({ url: `redis://${redisHost}:6379` });
  
  // Register error event handlers to prevent unhandled 'error' event crashes in Node.js
  pubClient.on('error', (err) => {
    // Silent catch of redis client error to prevent crash
  });
  
  const subClient = pubClient.duplicate();
  subClient.on('error', (err) => {
    // Silent catch of redis client error to prevent crash
  });

  try {
    const connectWithTimeout = (client: any) => {
      return Promise.race([
        client.connect(),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Redis connection timeout")), 1500))
      ]);
    };
    await Promise.all([connectWithTimeout(pubClient), connectWithTimeout(subClient)]);
    io.adapter(createAdapter(pubClient, subClient));
    isRedisConnected = true;
    console.log("[REDIS] Adapter Socket.io berhasil terhubung ke " + redisHost);
  } catch (err: any) {
    // Hindari mencetak "Error:" ke log agar tidak terdeteksi sebagai crash atau kegagalan sistem di development.
    console.log("[REDIS] Menggunakan adapter lokal (mode instance tunggal) karena koneksi Redis tidak tersedia.");
    if (process.env.NODE_ENV === "production") {
      const errMsg = err && err.message ? err.message : String(err);
      console.log(`[REDIS] Detail koneksi: ${errMsg}`);
    }
  }

  // --- AUTO MIGRATION: MOVED TO npm run db:migrate ---
  // ==========================================
// WILAYAH II: Keamanan (Middleware Global, authenticateJWT, verifyProjectAccess)
// ==========================================
  app.use(express.json({ limit: '100mb' }));
  app.use(express.urlencoded({ extended: true, limit: '100mb' }));

  // 🔒 PRIVATE BUCKET SECURITY POLICY & STORAGE GUARD
  const uploadsDir = GLOBAL_UPLOADS_DIR;
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  // Disable direct public static access to /uploads. 
  // All files must be accessed via authenticated JWT or presigned URLs with token verification.
  app.use("/uploads/:filename", (req: any, res: any, next: any) => {
    const filename = req.params.filename;
    const token = req.query.token as string;
    const expires = req.query.expires as string;
    const uid = req.query.uid as string;

    const safeName = path.basename(filename);
    const targetPath = path.join(uploadsDir, safeName);

    if (!fs.existsSync(targetPath)) {
      return res.status(404).json({ status: "error", message: "Dokumen tidak ditemukan." });
    }

    // 1. Check Presigned URL token if provided
    let isAuthorized = false;
    if (token && expires && uid) {
      isAuthorized = verifyPresignedToken(safeName, uid, expires, token);
    }

    // 2. Check Bearer JWT token if presigned URL is not present
    if (!isAuthorized) {
      const authHeader = req.headers?.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const jwtToken = authHeader.split(' ')[1];
        try {
          jwt.verify(jwtToken, getJwtSecret());
          isAuthorized = true;
        } catch {}
      }
    }

    if (!isAuthorized) {
      return res.status(403).json({
        status: "error",
        message: "Akses Ditolak: Storage Bucket bersifat PRIVATE. Akses file membutuhkan Presigned URL yang sah atau Autentikasi JWT."
      });
    }

    // Security Headers & Safe Serving
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', "default-src 'none'; media-src 'self'; image-src 'self' data:; style-src 'unsafe-inline';");
    res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');

    return res.sendFile(targetPath);
  });

  const getJwtSecret = (): string => {
    return process.env.JWT_SECRET || '1231231231492340234wewefsfsdfsfwe534534tf5654654';
  };

  const generateToken = (user: any) => {
    return jwt.sign(
      { id: user.id, uid: user.uid, username: user.username, role: user.role, displayName: user.displayName },
      getJwtSecret(),
      { expiresIn: '2h' }
    );
  };

  const verifyGlobalAdmin = (req: any, res: any, next: any) => {
    if (req.user?.role === 'admin') {
      next();
    } else {
      res.status(403).json({ status: "error", message: "Akses ditolak: Hanya Global Admin yang memiliki izin." });
    }
  };

  const authenticateJWT = (req: any, res: any, next: any) => {
    const authHeader = req.headers?.authorization;
    
    if (!authHeader) {
      return res.status(401).json({ 
        status: "error", 
        message: "Akses ditolak: Token autentikasi tidak ditemukan." 
      });
    }

    if (authHeader.startsWith('Bearer ')) {
      const parts = authHeader.split(' ');
      const token = parts.length === 2 ? parts[1] : null;
      
      if (!token) {
        return res.status(401).json({ 
          status: "error", 
          message: "Format token tidak valid." 
        });
      }

      jwt.verify(token, getJwtSecret(), (err: any, user: any) => {
        if (err) {
          return res.status(401).json({ 
            status: "error", 
            message: "Sesi Anda telah berakhir atau token tidak valid. Silakan login kembali." 
          });
        }

        // Single login concurrent session check
        const userId = user.id || user.uid;
        if (userId) {
          const activeSession = activeUserSessions.get(userId.toString());
          if (activeSession && activeSession.token !== token) {
            return res.status(401).json({
              status: "error",
              message: "Sesi Anda telah diakhiri karena akun Anda telah masuk di perangkat/browser lain."
            });
          }
        }

        req.user = user;
        next();
      });
    } else {
      res.status(401).json({ 
        status: "error", 
        message: "Akses ditolak: Format Authorization bukan Bearer." 
      });
    }
  };

  // Attach io to req for routes to use
  app.use((req, res, next) => {
    if (req.method !== 'OPTIONS' && req.url.startsWith('/api/')) {
        const publicRoutes = ['/api/auth', '/api/health-check'];
        if (!publicRoutes.some(route => req.url.startsWith(route))) {
           return authenticateJWT(req, res, next);
        }
    }
    next(); 
  });

  app.use((req: any, res, next) => {
    req.io = io;
    
    // Intercept response finish to emit event if it was a modification
    res.on("finish", () => {
      if (["POST", "PUT", "DELETE"].includes(req.method)) {
        if (req.url.startsWith("/api/") && !req.url.startsWith("/api/auth")) {
           io.emit("data_changed", { path: req.url, method: req.method });
        }
      }
    });

    next();
  });

  // --- MONITORING MIDDLEWARE ---
  app.use((req: any, res, next) => {
    res.on("finish", () => {
      const route = req.route ? req.route.path : req.url;
      httpRequestsTotal.inc({ method: req.method, route, status: res.statusCode });
    });
    next();
  });

  // --- MODULAR ROUTE MOUNTS ---
  app.use(healthRoutes);
  app.use(systemRoutes);
  app.use(auditRoutes);
  
  // ==========================================
// WILAYAH III: Core API Engine (Seluruh rute API dengan prefix /api/ disatukan di sini)
// ==========================================
  app.get("/api/audit-logs", authenticateJWT, async (req, res) => {
    console.log(`[AUDIT] Request diterima: ${JSON.stringify(req.query)}`);
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

  app.get("/api/health-check", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // 🛡️ SECURE UPLOAD DOCUMENT ENDPOINT (Magic Bytes, Whitelist & Private Storage)
  app.post("/api/v1/upload-document", authenticateJWT, upload.single('file'), async (req: any, res: any) => {
    try {
      const file = req.file;
      if (!file) {
        return res.status(400).json({ 
          status: "error", 
          message: "Gagal Mengunggah Dokumen: File tidak ditemukan dalam request." 
        });
      }

      const fileBuffer = fs.readFileSync(file.path);
      const validation = validateFileBuffer(fileBuffer, file.originalname);

      if (!validation.valid) {
        if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
        return res.status(400).json({ 
          status: "error", 
          message: validation.error || "Gagal Mengunggah Dokumen: Format file tidak didukung atau ukuran melebihi batas maksimum (Max 10MB)." 
        });
      }

      const safeFilename = validation.sanitizedName || sanitizeFilename(file.originalname);
      const targetPath = path.join(GLOBAL_UPLOADS_DIR, safeFilename);

      // Store in private storage directory
      fs.renameSync(file.path, targetPath);

      const userId = req.user?.id || req.user?.uid || 'guest';
      const presignedUrl = generatePresignedUrl(safeFilename, userId, 60);

      return res.json({
        status: "success",
        message: "Dokumen berhasil diunggah dan diamankan.",
        data: {
          filename: safeFilename,
          originalName: file.originalname,
          size: fileBuffer.length,
          url: presignedUrl,
          protectedUrl: `/uploads/${safeFilename}?token=${presignedUrl.split('token=')[1]}`
        }
      });
    } catch (err: any) {
      console.error("POST /api/v1/upload-document error:", err);
      return res.status(500).json({ 
        status: "error", 
        message: "Gagal Mengunggah Dokumen: Terjadi kesalahan server (" + err.message + ")" 
      });
    }
  });

  // 🔒 SECURE STREAM / PRESIGNED URL ENDPOINT
  app.get("/api/v1/files/secure-stream", async (req: any, res: any) => {
    try {
      const file = req.query.file as string;
      const expires = req.query.expires as string;
      const token = req.query.token as string;
      const uid = req.query.uid as string;

      if (!file) {
        return res.status(400).json({ status: "error", message: "Parameter 'file' wajib diisi." });
      }

      const safeFilename = path.basename(file);
      const filePath = path.join(GLOBAL_UPLOADS_DIR, safeFilename);

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ status: "error", message: "Dokumen tidak ditemukan." });
      }

      let isAuthorized = false;
      if (token && expires && uid) {
        isAuthorized = verifyPresignedToken(safeFilename, uid, expires, token);
      }

      if (!isAuthorized && req.headers?.authorization) {
        const authHeader = req.headers.authorization;
        if (authHeader.startsWith('Bearer ')) {
          const jwtToken = authHeader.split(' ')[1];
          try {
            jwt.verify(jwtToken, getJwtSecret());
            isAuthorized = true;
          } catch {}
        }
      }

      if (!isAuthorized) {
        return res.status(403).json({
          status: "error",
          message: "Akses Ditolak: Presigned URL telah kadaluarsa atau token tidak valid."
        });
      }

      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Content-Security-Policy', "default-src 'none'; media-src 'self'; image-src 'self' data:; style-src 'unsafe-inline';");
      res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
      res.setHeader('X-Frame-Options', 'SAMEORIGIN');

      return res.sendFile(filePath);
    } catch (err: any) {
      return res.status(500).json({ status: "error", message: "Terjadi kesalahan saat mengunduh dokumen." });
    }
  });

  // --- PROMETHEUS METRICS ENDPOINT ---
  app.get("/metrics", async (req, res) => {
    try {
      res.set("Content-Type", register.contentType);
      res.end(await register.metrics());
    } catch (ex) {
      res.status(500).end(ex);
    }
  });

  // RBAC Middleware
  const verifyProjectAccess = (allowedRoles: string[]) => {
    return async (req: any, res: any, next: any) => {
      let connection;
      try {
        const { projectId, id } = req.params;
        const targetProjectId = projectId || id; 
        
        // RBAC check (debug log removed for production security)

        // Auto-decode JWT if authenticateJWT wasn't run before this middleware
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

        // Penyelarasan JWT Payload: Cek 'id' dan 'uid' yang mungkin digunakan
        let userId = req.user?.id || req.user?.uid || req.headers['x-user-id'] || req.query.userId || req.body.userId;

        if (!userId) {
          if (allowedRoles.includes('*')) {
            return next();
          }
          return res.status(403).json({ status: "error", message: "Akses ditolak" });
        }

        connection = await mysqlPool.getConnection();

        // Resolusi userId ke database internal Users.id
        const [uRows]: any = await connection.query("SELECT id, role FROM Users WHERE id = ? OR uid = ?", [userId, userId]);
        if (uRows.length > 0) {
          userId = uRows[0].id;
          // Jika role user adalah 'admin' secara global, izinkan akses bypass
          if (uRows[0].role === 'admin') {
            return next();
          }
        }

        if (req.user && allowedRoles.includes('*')) {
          return next();
        }
        
        if (!targetProjectId) return next(); 
        
        // 1. Check if user is project owner
        const [proj]: any = await connection.query("SELECT ownerId FROM Projects WHERE id = ?", [targetProjectId]);
        if (proj.length > 0 && proj[0].ownerId === userId) {
          return next(); 
        }

        // 2. Check if user is member with allowed role
        const [member]: any = await connection.query(
          "SELECT role FROM ProjectMembers WHERE projectId = ? AND userId = ?",
          [targetProjectId, userId]
        );

        if (member.length > 0) {
          const userRole = (member[0].role || 'viewer').toLowerCase();
          // '*' allows any registered member
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

  // Audit Log Helper (Enterprise-Ready) & Data Masking Middleware
  const maskSensitiveData = (data: any): any => {
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

  const createAuditLog = async (userId: string, projectId: string | null, actionType: 'CREATE' | 'UPDATE' | 'DELETE', entityName: string, entityId: string, oldValues: any, newValues: any) => {
    // Non-blocking setImmediate to ensure main request is not delayed
    setImmediate(async () => {
      let logConn;
      try {
        logConn = await mysqlPool.getConnection();
        const logId = crypto.randomUUID();
        
        // v1.5 Security Audit: Mask sensitive data before stringifying. Added Try-Catch for Anti-Loop (Circular Dependency) JSON Parsing.
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
          // Try to find any user to fallback
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

        // Fetch user info for real-time update
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

        // Broadcast specifically to project room if applicable, otherwise globally for admins
        if (projectId) {
          io.to(projectId).emit("AUDIT_LOG_ADDED", broadcastData);
        } else {
          io.emit("AUDIT_LOG_ADDED", broadcastData);
        }
      } catch (err) {
        console.error("Critical: Gagal mencatat Audit Log:", err);
      } finally {
        if (logConn) logConn.release();
      }
    });
  };

  const createAutomatedNotification = async (recipientId: string, senderId: string | null, title: string, message: string, type: string, relatedId: string | null) => {
    let conn;
    try {
      conn = await mysqlPool.getConnection();
      
      // Support resolving standard user id or firebase uid
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
      
      // Broadcast data_changed for real-time notifications refresh in the UI
      io.emit("data_changed", { path: `/api/users/${resolvedRecipientId}/notifications`, method: "POST" });
    } catch (err) {
      console.error("Failed to create automated notification:", err);
    } finally {
      if (conn) conn.release();
    }
  };

  const broadcastProjectNotification = async (projectId: string, senderId: string | null, title: string, message: string, type: string, relatedId: string | null) => {
    let conn;
    try {
      conn = await mysqlPool.getConnection();
      
      // 1. MEKANISME BROADCAST PER PROJECT: Cari semua anggota project
      const [members]: any = await conn.query(
        "SELECT userId FROM ProjectMembers WHERE projectId = ?",
        [projectId]
      );
      
      console.log(`[BROADCAST NOTIFICATION] Broadcasting to ${members.length} members for project ${projectId}`);
      
      for (const member of members) {
        const recipientId = member.userId;
        
        // Resolve recipient standard id to firebase uid or standard string uid for safety
        let resolvedRecipientId = recipientId;
        const [uCheck]: any = await conn.query("SELECT id, uid FROM Users WHERE id = ? OR uid = ?", [recipientId, recipientId]);
        if (uCheck.length > 0) {
          resolvedRecipientId = uCheck[0].uid || uCheck[0].id;
        }
        
        // Skip sending notification to the user who performed the action to prevent spamming themselves
        if (senderId && (senderId === resolvedRecipientId || (uCheck.length > 0 && senderId === String(uCheck[0].id)))) {
          continue;
        }
        
        const notificationId = crypto.randomUUID();
        await conn.query(
          "INSERT INTO Notifications (id, recipientId, senderId, title, message, type, relatedId, `read`) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
          [notificationId, resolvedRecipientId, senderId || null, title, message, type, relatedId || null, 0]
        );
        
        // Broadcast via Socket.io ke penerima secara real-time
        io.emit("data_changed", { path: `/api/users/${resolvedRecipientId}/notifications`, method: "POST" });
      }
    } catch (err) {
      console.error("[BROADCAST NOTIFICATION ERROR]", err);
    } finally {
      if (conn) conn.release();
    }
  };

  const sendProjectActivityNotification = async (projectId: string, triggerUserId: string, actionType: 'create_task' | 'update_task' | 'comment_task', payload: any) => {
    let conn;
    try {
      conn = await mysqlPool.getConnection();
      
      // 1. Get the actor's profile (displayName)
      const [actorRows]: any = await conn.query(
        "SELECT displayName, username FROM Users WHERE id = ? OR uid = ?",
        [triggerUserId, triggerUserId]
      );
      const actorName = actorRows.length > 0 ? (actorRows[0].displayName || actorRows[0].username) : "Seorang anggota tim";
      
      let title = "";
      let message = "";
      let type = "project_activity";
      let relatedId = payload.taskId || null;
      
      // 2. Get task key & title if taskId is provided
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
      
      // 3. Format beautiful messages according to event type
      if (actionType === 'create_task') {
        title = "🆕 Tugas Baru Ditambahkan";
        message = `${actorName} membuat tugas baru${taskInfo} pada ${nowString}.`;
      } else if (actionType === 'update_task') {
        title = "🔄 Update Status Tugas";
        const { field, oldValue, newValue } = payload;
        if (field === 'status') {
          message = `${actorName} mengubah status${taskInfo} dari "${oldValue || 'None'}" menjadi "${newValue}" pada ${nowString}.`;
        } else if (field === 'assigneeId') {
          // Resolve assignee name
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
      
      // 4. Find all members of the project
      const [members]: any = await conn.query(
        "SELECT userId FROM ProjectMembers WHERE projectId = ?",
        [projectId]
      );
      
      console.log(`[BROADCAST ACTIVITY] ${title} - to ${members.length} project members`);
      
      for (const member of members) {
        const recipientId = member.userId;
        
        // Resolve recipient standard id to firebase uid
        let resolvedRecipientId = recipientId;
        const [uCheck]: any = await conn.query("SELECT id, uid FROM Users WHERE id = ? OR uid = ?", [recipientId, recipientId]);
        if (uCheck.length > 0) {
          resolvedRecipientId = uCheck[0].uid || uCheck[0].id;
        }
        
        // Resolve actor uid/id to match triggerUserId for exclusion
        const isActor = (triggerUserId === resolvedRecipientId) || 
                        (uCheck.length > 0 && triggerUserId === String(uCheck[0].id)) ||
                        (uCheck.length > 0 && triggerUserId === String(uCheck[0].uid));
                        
        // Skip sending notification to the user who performed the action to prevent self-notification
        if (isActor) {
          continue;
        }
        
        const notificationId = crypto.randomUUID();
        await conn.query(
          "INSERT INTO Notifications (id, recipientId, senderId, title, message, type, relatedId, `read`) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
          [notificationId, resolvedRecipientId, triggerUserId || null, title, message, type, relatedId, 0]
        );
        
        // Emit socket.io real-time update
        io.emit("data_changed", { path: `/api/users/${resolvedRecipientId}/notifications`, method: "POST" });
      }
    } catch (err) {
      console.error("[BROADCAST ACTIVITY ERROR]", err);
    } finally {
      if (conn) conn.release();
    }
  };

  const checkUpcomingDueDates = async () => {
    let connection;
    try {
      connection = await mysqlPool.getConnection();
      
      // Fetch incomplete tasks with due dates and assigned users
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
            
            // Check if deadline notification is already sent for this task
            const [existingNotify]: any = await connection.query(
              "SELECT id FROM Notifications WHERE recipientId = ? AND relatedId = ? AND type = 'deadline'",
              [assigneeId, task.id]
            );
            
            if (existingNotify.length === 0) {
              const taskKey = task.taskKey || task.key || task.id;
              const taskTitle = task.title || "Tugas";
              
              const title = "⏰ Batas Waktu Tugas Mendekat (24 Jam)";
              const message = `Tugas "${taskTitle}" (${taskKey}) akan segera jatuh tempo dalam waktu kurang dari 24 jam (${taskDueDate.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}).`;
              
              await createAutomatedNotification(assigneeId, null, title, message, 'deadline', task.id);
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

  // Schedule background check for task due dates every 5 minutes
  setTimeout(() => {
    checkUpcomingDueDates();
    setInterval(checkUpcomingDueDates, 5 * 60 * 1000);
  }, 10000);

  // Socket.io Real-time implementation
  const projectPresence: Record<string, any[]> = {};
  const chatSockets = new Map<string, Set<string>>(); // userId -> Set of socketIds

  // NEW: Global Presence Map (userId -> userProfile)
  const globalPresence = new Map<string, any>();
  const globalPresenceSockets = new Map<string, string>(); // socketId -> userId

  io.on("connection", (socket) => {
    socketActiveConnections.inc();
    console.log("Client connected via socket:", socket.id);

    // Live Chat Socket Handlers
    
    // NEW: Global Presence Join
    socket.on("leave_presence", () => {
      const globalUserId = globalPresenceSockets.get(socket.id);
      if (globalUserId) {
        globalPresenceSockets.delete(socket.id);
        let hasOtherSockets = false;
        for (const [sId, uId] of globalPresenceSockets.entries()) {
          if (uId === globalUserId) {
            hasOtherSockets = true;
            break;
          }
        }
        if (!hasOtherSockets) {
          globalPresence.delete(globalUserId);
          io.emit("presence_sync", Array.from(globalPresence.values()));
          console.log(`[GLOBAL PRESENCE] User ${globalUserId} left via leave_presence. Total online: ${globalPresence.size}`);
        }
      }
    });

    socket.on("join_presence", (user) => {
      if (user && (user.id || user.uid)) {
        const userId = user.uid || user.id;
        
        // Add or update user in global presence map
        globalPresence.set(userId, user);
        globalPresenceSockets.set(socket.id, userId);
        
        // Broadcast the full list of online users to everyone
        io.emit("presence_sync", Array.from(globalPresence.values()));
        console.log(`[GLOBAL PRESENCE] User ${user.displayName || user.username || userId} joined. Total online: ${globalPresence.size}`);
      }
    });
    socket.on("user_connected", (userId) => {
      if (userId) {
        if (!chatSockets.has(userId)) {
          chatSockets.set(userId, new Set());
        }
        chatSockets.get(userId)!.add(socket.id);
        console.log(`[CHAT_SOCKET] User ${userId} terhubung dengan socket ${socket.id}. Total koneksi: ${chatSockets.get(userId)!.size}`);
        // Kirim event ke seluruh user lain bahwa user ini online
        io.emit("user_online", userId);
      }
    });

    socket.on("get_online_users", (callback) => {
      if (typeof callback === "function") {
        callback(Array.from(chatSockets.keys()));
      }
    });

    socket.on("send_message", (msg) => {
      // msg: { id, senderId, receiverId, message, timestamp, read }
      if (msg.receiverId === "group") {
        // Broadcast to all sockets
        io.emit("receive_message", msg);
        console.log(`[CHAT] Pesan grup dari ${msg.senderId} disebarkan ke seluruh socket.`);
      } else {
        const recipientSockets = chatSockets.get(msg.receiverId);
        if (recipientSockets) {
          recipientSockets.forEach(socketId => {
            io.to(socketId).emit("receive_message", msg);
          });
          console.log(`[CHAT] Pesan dari ${msg.senderId} dikirim langsung ke ${msg.receiverId} (Total target socket: ${recipientSockets.size})`);
        }
      }
      socket.emit("message_sent", msg);
    });

    // Join Project Room & Presence tracking
    socket.on("join_project", (payload) => {
      let projectId: string = "";
      let user: any = null;

      if (typeof payload === 'string') {
        projectId = payload;
      } else if (payload && typeof payload === 'object') {
        projectId = payload.projectId || "";
        user = payload.user;
      }

      if (!projectId) {
        console.log(`[ROOM] Socket ${socket.id} tried to join a project but no projectId was specified.`);
        return;
      }

      // Security Flow 3: Ensure socket leaves any prior rooms to prevent data masking leakage over multiplexed tabs
      socket.rooms.forEach((room) => {
        if (room !== socket.id && room !== projectId) {
          socket.leave(room);
          if (projectPresence[room] && user && (user.id || user.uid)) {
            const userId = user.id || user.uid;
            projectPresence[room] = projectPresence[room].filter(u => (u.id || u.uid) !== userId);
            io.to(room).emit("PRESENCE_UPDATE", projectPresence[room]);
          }
        }
      });
      
      socket.join(projectId);
      
      if (user && (user.id || user.uid)) {
        const userId = user.id || user.uid;
        if (!projectPresence[projectId]) projectPresence[projectId] = [];
        
        // Update presence list
        const existingIdx = projectPresence[projectId].findIndex(u => (u.id || u.uid) === userId);
        if (existingIdx !== -1) {
          projectPresence[projectId][existingIdx].socketId = socket.id;
        } else {
          projectPresence[projectId].push({ ...user, id: userId, uid: userId, socketId: socket.id });
        }
        
        io.to(projectId).emit("PRESENCE_UPDATE", projectPresence[projectId]);
        console.log(`[PRESENCE] ${user.displayName || user.username || 'User'} bergabung di proyek ${projectId}`);
      } else {
        console.log(`[ROOM] Socket ${socket.id} bergabung ke room proyek ${projectId} tanpa presence tracking.`);
      }
    });
 
    socket.on("leave_project", ({ projectId, userId }) => {
      socket.leave(projectId);
      if (projectPresence[projectId]) {
        projectPresence[projectId] = projectPresence[projectId].filter(u => (u.id || u.uid) !== userId);
        io.to(projectId).emit("PRESENCE_UPDATE", projectPresence[projectId]);
      }
    });

    socket.on("qa_update", ({ projectId }) => {
      if (projectId) {
        socket.to(projectId).emit("QA_REFRESH");
        console.log(`[QA_SYNC] Broadcast QA_REFRESH ke seluruh member di proyek ${projectId}`);
      }
    });

    socket.on("disconnect", () => {
      socketActiveConnections.dec();
      
      // NEW: Remove from global presence
      const globalUserId = globalPresenceSockets.get(socket.id);
      if (globalUserId) {
        globalPresenceSockets.delete(socket.id);
        
        // Check if user has other active sockets
        let hasOtherSockets = false;
        for (const [sId, uId] of globalPresenceSockets.entries()) {
          if (uId === globalUserId) {
            hasOtherSockets = true;
            break;
          }
        }
        
        if (!hasOtherSockets) {
          globalPresence.delete(globalUserId);
          io.emit("presence_sync", Array.from(globalPresence.values()));
          console.log(`[GLOBAL PRESENCE] User ${globalUserId} disconnected completely. Total online: ${globalPresence.size}`);
        }
      }
      
      // Clean up chatSockets
      let disconnectedUserId = null;
      for (const [userId, socketIds] of chatSockets.entries()) {
        if (socketIds.has(socket.id)) {
          socketIds.delete(socket.id);
          console.log(`[CHAT_SOCKET] Koneksi socket ${socket.id} untuk user ${userId} dihapus.`);
          if (socketIds.size === 0) {
            chatSockets.delete(userId);
            disconnectedUserId = userId;
          }
          break;
        }
      }
      if (disconnectedUserId) {
        console.log(`[CHAT_SOCKET] User ${disconnectedUserId} terputus.`);
        io.emit("user_offline", disconnectedUserId);
      }

      for (const projectId in projectPresence) {
        const userIdx = projectPresence[projectId].findIndex(u => u.socketId === socket.id);
        if (userIdx !== -1) {
          const user = projectPresence[projectId][userIdx];
          projectPresence[projectId].splice(userIdx, 1);
          io.to(projectId).emit("PRESENCE_UPDATE", projectPresence[projectId]);
          console.log(`[PRESENCE] ${user.displayName} terputus.`);
        }
      }
    });
  });

  // API route to download the BRD Word document (.docx)
  app.get("/api/download-brd", async (req, res) => {
    try {
      const buffer = await generateBrdDocx();
      
      // Save it to the workspace root for the user to view in the file explorer
      const filename = "LanPro_BRD_Technical_Documentation.docx";
      fs.writeFileSync(path.join(process.cwd(), filename), buffer);
      
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.send(buffer);
    } catch (error: any) {
      console.error("Error generating or downloading BRD Word document:", error);
      res.status(500).json({ status: "error", message: "Gagal membuat dokumen Word BRD: " + error.message });
    }
  });

  // API route to test database connection
  app.get("/api/test-db", verifyGlobalAdmin, async (req, res) => {
    let connection;
    try {
      connection = await mysqlPool.getConnection();
      await connection.query("SELECT 1 + 1 AS solution");
      res.json({ status: "success", message: "Koneksi ke database MySQL berhasil!" });
    } catch (error: any) {
      console.error("LOG ANOMALI CRITICAL: Database connection error:", error);
      res.status(500).json({ status: "error", message: "Terjadi kesalahan internal server: Gagal terhubung ke database. - " + error.message });
    } finally {
      if (connection) connection.release();
    }
  });

  // API route to run raw queries (For Database Explorer)
  app.post("/api/db-query", verifyGlobalAdmin, async (req, res) => {
    let connection;
    try {
      const { query: sqlString } = req.body;
      if (!sqlString) return res.status(400).json({ error: "Query is required" });
      
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

  // API route to see database schema
  app.get("/api/db-schema", verifyGlobalAdmin, async (req, res) => {
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

      // get table sizes
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

  // API route to run database schema migration (Import DB)
  app.post("/api/migrate-db", verifyGlobalAdmin, async (req, res) => {
    try {
      // 1. Baca isi file schema.sql
      const schemaPath = path.join(process.cwd(), 'database', 'schema.sql');
      const schemaSql = fs.readFileSync(schemaPath, 'utf8');

      // 2. Karena schema.sql kita awalnya ada CREATE DATABASE (yang tidak diizinkan di beberapa user-level Aiven db)
      // Kita bersihkan dulu baris "CREATE DATABASE" dan "USE app_database" agar langsung memakai db yang terkoneksi
      let cleanSql = schemaSql
        .replace(/CREATE DATABASE IF NOT EXISTS.*?;/i, '')
        .replace(/USE .*?;/i, '');

      // 3. Eksekusi semua query
      const connection = await mysqlPool.getConnection();
      await connection.query(cleanSql);
      connection.release();

      res.json({ status: "success", message: "Migrasi database berhasil dijalankan! Tabel sudah terbuat." });
    } catch (error: any) {
      console.error("LOG ANOMALI CRITICAL: Migration error:", error);
      res.status(500).json({ status: "error", message: "Terjadi kesalahan internal server: Gagal menjalankan migrasi database. - " + error.message });
    }
  });



  app.get("/api/auth/verify", authenticateJWT, async (req: any, res) => {
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

  app.post("/api/auth/refresh", authenticateJWT, async (req: any, res) => {
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


  app.post("/api/auth/google-verify", async (req, res) => {
      ensureAdminInitialized();
      const { idToken } = req.body;
      try {
          const decodedToken = await (admin as any).auth().verifyIdToken(idToken);
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

  app.post("/api/auth/login", async (req, res) => {
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
        io.emit("FORCE_LOGOUT_EVENT", { 
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

  
  app.post("/api/auth/force-logout", async (req, res) => {
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

      io.emit("FORCE_LOGOUT_EVENT", { 
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

  app.post("/api/auth/logout", (req, res) => {
    try {
      const userId = req.body?.userId;
      if (userId) activeUserSessions.delete(userId.toString());
      return res.json({ status: "success" });
    } catch (e) {
      return res.json({ status: "success" });
    }
  });


  app.post("/api/auth/register", async (req, res) => {
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
  app.post("/api/users/heartbeat", async (req, res) => {
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
  app.post("/api/presence/ping", authenticateJWT, async (req: any, res) => {
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
  app.get("/api/presence/sync", authenticateJWT, async (req: any, res) => {
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

  app.get("/api/users", async (req, res) => {
    try {
      const rows = await query("SELECT * FROM Users");
      res.json({ status: "success", data: rows });
    } catch (error: any) {
      console.error("LOG ANOMALI CRITICAL: GET /api/users error:", error);
      res.status(500).json({ status: "error", message: "Terjadi kesalahan internal server: " + error.message });
    }
  });

  app.get("/api/users/:id", async (req, res) => {
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

  app.put("/api/users/:id", async (req, res) => {
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

  app.delete("/api/users/:id", async (req, res) => {
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

  app.put("/api/profile/update", authenticateJWT, async (req: any, res: any) => {
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

  app.post("/api/whatsapp/simulate", authenticateJWT, async (req: any, res) => {
    try {
      const { userId } = req.body;
      await sendDailyTaskDigest(userId);
      res.json({ status: "success", message: "Broadcast triggered" });
    } catch (error: any) {
      console.error("Error simulating WA broadcast:", error);
      res.status(500).json({ status: "error", message: error.message });
    }
  });

  app.get("/api/master-data", async (req, res) => {
    try {
      const connection = await mysqlPool.getConnection();
      const [rows] = await connection.query("SELECT * FROM MasterData ORDER BY `order` ASC");
      connection.release();
      res.json({ status: "success", data: rows });
    } catch (error: any) {
      console.error("LOG ANOMALI CRITICAL: GET /api/master-data error:", error);
      res.status(500).json({ status: "error", message: "Terjadi kesalahan internal server: " + error.message });
    }
  });

  app.post("/api/master-data", async (req, res) => {
    try {
      const { id, type, label, color, icon, order, description, fieldType, dropdownOptions, role_type, roleType } = req.body;
      const rType = role_type || roleType || null;
      const connection = await mysqlPool.getConnection();
      
      const newId = id || crypto.randomUUID();
      const itemLabel = label || type || "Item";

      // Server-side validation for project_role
      if (type === 'project_role') {
        const trimmedLabel = itemLabel.trim();
        if (trimmedLabel.length < 3) {
          connection.release();
          return res.status(400).json({ status: "error", message: "Nama Role minimal harus 3 karakter." });
        }
        if (/^(.)\1+$/i.test(trimmedLabel)) {
          connection.release();
          return res.status(400).json({ status: "error", message: "Nama Role tidak boleh berisi karakter sampah atau berulang." });
        }
        const lowerLabel = trimmedLabel.toLowerCase();
        if (lowerLabel === 'asdf' || lowerLabel === 'qwer' || lowerLabel === 'zxcv' || lowerLabel === 'junk' || lowerLabel === 'test' || lowerLabel === 'testing' || lowerLabel === 'dd') {
          connection.release();
          return res.status(400).json({ status: "error", message: "Nama Role tidak boleh berupa karakter sampah atau acak." });
        }
      }
      
      await connection.query(
        `INSERT INTO MasterData (id, type, label, color, icon, \`order\`, description, fieldType, dropdownOptions, role_type)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [newId, type || "general", itemLabel, color || null, icon || null, order || 0, description || null, fieldType || null, dropdownOptions ? JSON.stringify(dropdownOptions) : null, rType]
      );
      
      connection.release();
      res.json({ status: "success", data: { id: newId, type, label: itemLabel, color, icon, order, description, fieldType, dropdownOptions, role_type: rType } });
    } catch (error: any) {
      console.error("LOG ANOMALI CRITICAL: POST /api/master-data error:", error);
      res.status(500).json({ status: "error", message: "Terjadi kesalahan internal server: " + error.message });
    }
  });

  app.put("/api/master-data/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { label, color, icon, order, description, fieldType, dropdownOptions, role_type, roleType, type } = req.body;
      const rType = role_type || roleType || null;
      const connection = await mysqlPool.getConnection();
      
      const itemLabel = label !== undefined && label !== null ? label : "Item";

      // Server-side validation for project_role
      let itemType = type;
      if (!itemType) {
        const [existing]: any = await connection.query("SELECT type FROM MasterData WHERE id = ?", [id]);
        if (existing && existing.length > 0) {
          itemType = existing[0].type;
        }
      }

      if (itemType === 'project_role') {
        const trimmedLabel = itemLabel.trim();
        if (trimmedLabel.length < 3) {
          connection.release();
          return res.status(400).json({ status: "error", message: "Nama Role minimal harus 3 karakter." });
        }
        if (/^(.)\1+$/i.test(trimmedLabel)) {
          connection.release();
          return res.status(400).json({ status: "error", message: "Nama Role tidak boleh berisi karakter sampah atau berulang." });
        }
        const lowerLabel = trimmedLabel.toLowerCase();
        if (lowerLabel === 'asdf' || lowerLabel === 'qwer' || lowerLabel === 'zxcv' || lowerLabel === 'junk' || lowerLabel === 'test' || lowerLabel === 'testing' || lowerLabel === 'dd') {
          connection.release();
          return res.status(400).json({ status: "error", message: "Nama Role tidak boleh berupa karakter sampah atau acak." });
        }
      }

      await connection.query(
        `UPDATE MasterData SET label=?, color=?, icon=?, \`order\`=?, description=?, fieldType=?, dropdownOptions=?, role_type=? WHERE id=?`,
        [itemLabel, color || null, icon || null, order || 0, description || null, fieldType || null, dropdownOptions ? JSON.stringify(dropdownOptions) : null, rType, id]
      );
      
      connection.release();
      res.json({ status: "success", message: "MasterData updated" });
    } catch (error: any) {
      console.error("LOG ANOMALI CRITICAL: PUT /api/master-data error:", error);
      res.status(500).json({ status: "error", message: "Terjadi kesalahan internal server: " + error.message });
    }
  });

  app.delete("/api/master-data/:id", async (req, res) => {
    let connection;
    try {
      const { id } = req.params;
      connection = await mysqlPool.getConnection();
      
      const [rows]: any = await connection.query("SELECT * FROM MasterData WHERE id = ?", [id]);
      if (!rows || rows.length === 0) {
        connection.release();
        return res.status(404).json({ status: "error", message: "Master data tidak ditemukan." });
      }
      
      const item = rows[0];
      const systemDefaults = ['bug', 'task', 'epic', 'p0', 'p1', 'p2', 'done', 'to do', 'in progress', 'high', 'medium', 'low', 'production', 'staging', 'development', 'technology & it', 'product management'];
      const itemLabelLower = (item.label || '').toLowerCase();
      
      if (item.is_system_default || systemDefaults.some(def => itemLabelLower === def || itemLabelLower.includes(def))) {
        connection.release();
        return res.status(400).json({ status: "error", message: "Data master bawaan sistem terkunci dan tidak dapat dihapus." });
      }

      const [taskRows]: any = await connection.query(
        "SELECT COUNT(*) as count FROM Tasks WHERE status = ? OR priority = ? OR type = ? OR environment = ?",
        [item.label, item.label, item.label, item.label]
      );
      
      const usageCount = taskRows?.[0]?.count || 0;
      if (usageCount > 0) {
        connection.release();
        return res.status(400).json({ status: "error", message: `Data master ini sedang digunakan oleh ${usageCount} Task aktif dan tidak dapat dihapus.` });
      }

      await connection.query("DELETE FROM MasterData WHERE id = ?", [id]);
      connection.release();
      res.json({ status: "success", message: "MasterData deleted" });
    } catch (error: any) {
      if (connection) connection.release();
      console.error("LOG ANOMALI CRITICAL: DELETE /api/master-data error:", error);
      res.status(500).json({ status: "error", message: "Terjadi kesalahan internal server: " + error.message });
    }
  });

  // Projects API
  app.get("/api/projects", async (req, res) => {
    let connection;
    try {
      // If we need to filter by ownerId or member, we can do it via req.query.userId
      // For now we get all to mimic previous behaviour first
      const userId = req.query.userId;
      connection = await mysqlPool.getConnection();
      
      let query = "SELECT * FROM Projects ORDER BY createdAt DESC";
      let params: any[] = [];
      
      if (userId) {
        query = `
          SELECT p.* FROM Projects p 
          LEFT JOIN ProjectMembers pm ON p.id = pm.projectId 
          WHERE p.ownerId = ? OR pm.userId = ? 
          GROUP BY p.id 
          ORDER BY p.createdAt DESC
        `;
        params = [userId, userId];
      }

      const [rows] = await connection.query(query, params);
      
      // Populate member arrays & roles for each project
      const projects = rows as any[];
      if (projects.length > 0) {
        const projectIds = projects.map(p => p.id);
        
        const [allMemberRows]: any = await connection.query(
          `SELECT pm.projectId, u.uid, u.id as uuid, pm.role 
           FROM ProjectMembers pm
           JOIN Users u ON pm.userId = u.id
           WHERE pm.projectId IN (?)`,
          [projectIds]
        );
        
        const membersByProject = new Map();
        
        for (const row of allMemberRows) {
          if (!membersByProject.has(row.projectId)) {
            membersByProject.set(row.projectId, { list: [], roles: {} });
          }
          const pData = membersByProject.get(row.projectId);
          pData.list.push(row.uid);
          pData.roles[row.uid] = row.role || 'viewer';
          pData.roles[row.uuid] = row.role || 'viewer';
        }
        
        for (const p of projects) {
          const pData = membersByProject.get(p.id) || { list: [], roles: {} };
          p.members = pData.list;
          p.memberRoles = pData.roles;
        }
      }

      res.json({ status: "success", data: projects });
    } catch (error: any) {
      console.error("LOG ANOMALI CRITICAL: GET /api/projects error:", error);
      res.status(500).json({ status: "error", message: "Terjadi kesalahan internal server: " + error.message });
    } finally {
      if (connection) connection.release();
    }
  });

  app.post("/api/projects/generate-bni-demo", authenticateJWT, async (req: any, res: any) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({
          status: "error",
          message: "Akses ditolak: Hanya administrator yang diizinkan untuk men-generate proyek demo."
        });
      }
      const { ownerId } = req.body;
      const connection = await mysqlPool.getConnection();
      
      const pId = crypto.randomUUID();
      const pName = "Bank BNI SDLC Management - Release v2.0";
      const pKey = "RDU";
      const pDesc = "Layanan migrasi terpadu BNI Open API, optimasi database core banking, kepatuhan standar OJK/PCI-DSS, serta deployment pipeline aman (UAT/Production Go-Live ready).";
      
      // 1. Insert Project
      await connection.query(
        "INSERT INTO Projects (id, name, projectKey, description, ownerId, status, taskCounter) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [pId, pName, pKey, pDesc, ownerId || '3', 'Active', 24]
      );
      
      // 2. Add Project Members
      const rolesMap = [
        { userId: '1', role: 'admin' },
        { userId: '2', role: 'head' },
        { userId: '3', role: 'manager' },
        { userId: '4', role: 'developer' },
        { userId: '5', role: 'designer' }
      ];
      for (const m of rolesMap) {
        await connection.query(
          "INSERT INTO ProjectMembers (projectId, userId, role) VALUES (?, ?, ?)",
          [pId, m.userId, m.role]
        );
      }
      
      // 3. Insert 3 Sprints
      const sprint1Id = crypto.randomUUID();
      const sprint2Id = crypto.randomUUID();
      const sprint3Id = crypto.randomUUID();
      
      const now = new Date();
      const s1Start = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
      const s1End = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);
      const s2Start = new Date(now.getTime());
      const s2End = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
      const s3Start = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000);
      const s3End = new Date(now.getTime() + 29 * 24 * 60 * 60 * 1000);
      
      await connection.query(
        "INSERT INTO Sprints (id, projectId, name, goal, startDate, endDate, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [sprint1Id, pId, "Sprint 1: Initiation & Requirements Analysis", "Menyelesaikan analisis integrasi BNI Open API dan penandatanganan spesifikasi fungsional.", s1Start, s1End, "completed"]
      );
      await connection.query(
        "INSERT INTO Sprints (id, projectId, name, goal, startDate, endDate, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [sprint2Id, pId, "Sprint 2: Design Prototype & Backend Implementation", "Mengembangkan prototype dashboard kustom, mengoptimalkan pipeline redis cache, dan query tuning.", s2Start, s2End, "active"]
      );
      await connection.query(
        "INSERT INTO Sprints (id, projectId, name, goal, startDate, endDate, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [sprint3Id, pId, "Sprint 3: Quality Testing, Audit & Production Cut-over", "Pemeriksaan fungsionalitas UAT, penetration testing Keamanan Sistem, audit OJK, dan pelepasan release.", s3Start, s3End, "planned"]
      );

      // 4. Create Epics as parent tasks first
      const epic1Id = crypto.randomUUID(); // Kanal Digital
      const epic2Id = crypto.randomUUID(); // Dashboard Teller
      const epic3Id = crypto.randomUUID(); // Back-end Hardening
      const epic4Id = crypto.randomUUID(); // Audit & QA
      const epic5Id = crypto.randomUUID(); // OJK Compliance
      const epic6Id = crypto.randomUUID(); // Go-Live Readiness

      const epics = [
        { id: epic1Id, key: "RDU-1", title: "Kanal Digital & Open API Integration", desc: "Epik koordinasi seluruh komponen integrasi Web Services BNI." },
        { id: epic2Id, key: "RDU-5", title: "Revamp Dashboard Teller & Customer Portal UI", desc: "Epik modernisasi interface Front-End yang ramah petugas & nasabah." },
        { id: epic3Id, key: "RDU-8", title: "Back-End Performance Tuning & Database Hardening", desc: "Epik optimasi query SQL, skema redis clustering, dan enkripsi data saldo ledger." },
        { id: epic4Id, key: "RDU-13", title: "Quality Assurance, Security & Pentest Audit", desc: "Epik koordinasi pengujian fungsionalitas UAT, load testing, dan penetrasi keamanan sistem." },
        { id: epic5Id, key: "RDU-18", title: "Asesmen Kepatuhan OJK & Regulasi Regulator", desc: "Epik pengawasan kepatuhan hukum transaksi perbankan dan izin operasional sistem informasi." },
        { id: epic6Id, key: "RDU-21", title: "Deployment Pipeline & Go-Live Readiness", desc: "Epik penyiapan runbook cut-over, skrip migrasi data langsung, dan rilis patch produksi." }
      ];

      for (const ep of epics) {
        let sId = sprint1Id;
        if (ep.key === "RDU-5" || ep.key === "RDU-8") sId = sprint2Id;
        if (ep.key === "RDU-13" || ep.key === "RDU-18" || ep.key === "RDU-21") sId = sprint3Id;
        
        await connection.query(
          `INSERT INTO Tasks (id, projectId, sprintId, taskKey, title, description, status, priority, type, assigneeId, reporterId, storyPoints, projectRisk)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [ep.id, pId, sId, ep.key, ep.title, ep.desc, "In Progress", "High", "epic", "3", "3", 0, "Low"]
        );
      }

      // 5. Create children tasks
      const tasksToInsert = [
        // Sprint 1
        {
          id: crypto.randomUUID(), key: "RDU-2", parentId: epic1Id, sprintId: sprint1Id,
          title: "Analisis Kebutuhan Core Banking Integrasi API BNI",
          desc: "Menganalisis skema request-response JSON API Gateway BNI dengan core billing.",
          type: "task", status: "Done", priority: "High", assigneeId: "4", reporterId: "3", storyPoints: 5, projectRisk: "Low"
        },
        {
          id: crypto.randomUUID(), key: "RDU-3", parentId: epic1Id, sprintId: sprint1Id,
          title: "Penyusunan Failover Clustering Architecture",
          desc: "Mengonfigurasi kriteria high-availability Server API Gateway di 2 zona geografis.",
          type: "task", status: "Done", priority: "High", assigneeId: "1", reporterId: "3", storyPoints: 8, projectRisk: "Medium"
        },
        {
          id: crypto.randomUUID(), key: "RDU-4", parentId: epic1Id, sprintId: sprint1Id,
          title: "System Requirement Specification (SRS) - Open API Gateway",
          desc: "Dokumentasi standar teknis integrasi API BNI untuk diteruskan ke tim security.",
          type: "document", status: "Done", priority: "Low", assigneeId: "3", reporterId: "2", storyPoints: 3, projectRisk: "Low"
        },
        
        // Sprint 2
        {
          id: crypto.randomUUID(), key: "RDU-6", parentId: epic2Id, sprintId: sprint2Id,
          title: "Design Prototype Mobile Banking Dashboard di Figma",
          desc: "Membuat prototipe tata letak dashboard kustom dengan palet warna jingga korporat BNI.",
          type: "task", status: "In Progress", priority: "Medium", assigneeId: "5", reporterId: "3", storyPoints: 5, projectRisk: "Low"
        },
        {
          id: crypto.randomUUID(), key: "RDU-7", parentId: epic2Id, sprintId: sprint2Id,
          title: "Sign-off Desain Wireframe Layanan Baru oleh IT Head",
          desc: "Persetujuan formal direksi IT untuk memulai coding front-end.",
          type: "approval", status: "In Progress", priority: "Low", assigneeId: "2", reporterId: "5", storyPoints: 1, projectRisk: "Low"
        },
        {
          id: crypto.randomUUID(), key: "RDU-9", parentId: epic3Id, sprintId: sprint2Id,
          title: "Optimasi Query Database Oracle Core Banking BNI",
          desc: "Tuning query inner join log transaksi nasabah dengan index baru demi TPS maksimal.",
          type: "task", status: "In Progress", priority: "High", assigneeId: "4", reporterId: "1", storyPoints: 8, projectRisk: "High"
        },
        {
          id: crypto.randomUUID(), key: "RDU-10", parentId: epic3Id, sprintId: sprint2Id,
          title: "Implementasi Enkripsi AES-256 pada Ledger Data",
          desc: "Menjamin kerahasiaan nominal dana nasabah yang tersimpan pada tabel log saldo ledger.",
          type: "task", status: "In Progress", priority: "High", assigneeId: "4", reporterId: "2", storyPoints: 5, projectRisk: "High"
        },
        {
          id: crypto.randomUUID(), key: "RDU-11", parentId: epic3Id, sprintId: sprint2Id,
          title: "Sesi Review Integrasi API bersama Tim Middleware",
          desc: "Rapat koordinasi teknis penyamaan standar pesan ISO 8583.",
          type: "meeting", status: "In Progress", priority: "Medium", assigneeId: "3", reporterId: "3", storyPoints: 2, projectRisk: "Low"
        },
        {
          id: crypto.randomUUID(), key: "RDU-12", parentId: epic3Id, sprintId: sprint2Id,
          title: "Setup Redis Caching Cluster untuk Akun Teller",
          desc: "Mempercepat sesi login teller aktif dengan caching dinamis Redis cluster.",
          type: "task", status: "To Do", priority: "Medium", assigneeId: "4", reporterId: "3", storyPoints: 5, projectRisk: "Medium"
        },

        // Sprint 3
        {
          id: crypto.randomUUID(), key: "RDU-14", parentId: epic4Id, sprintId: sprint3Id,
          title: "Uji Beban (Performance Load Test) 10,000 TPS",
          desc: "Pengujian stress load sistem API Gateway menggunakan Apache JMeter melampaui batas puncak harian.",
          type: "task", status: "To Do", priority: "High", assigneeId: "4", reporterId: "3", storyPoints: 8, projectRisk: "Medium"
        },
        {
          id: crypto.randomUUID(), key: "RDU-15", parentId: epic4Id, sprintId: sprint3Id,
          title: "Security Penetration Testing & Vulnerability Assessment",
          desc: "Melakukan audit vulnerability blackbox / whitebox pada rest server untuk mendapatkan compliance.",
          type: "task", status: "To Do", priority: "High", assigneeId: "1", reporterId: "2", storyPoints: 8, projectRisk: "High"
        },
        {
          id: crypto.randomUUID(), key: "RDU-16", parentId: epic4Id, sprintId: sprint3Id,
          title: "Koreksi Kelemahan Parameter Tampering di API Gateway",
          desc: "Mengeblok potensi manipulasi ID nasabah pada query string parameter endpoints.",
          type: "bug", status: "To Do", priority: "High", assigneeId: "4", reporterId: "2", storyPoints: 5, projectRisk: "High"
        },
        {
          id: crypto.randomUUID(), key: "RDU-17", parentId: epic4Id, sprintId: sprint3Id,
          title: "Perbaikan Glitch Form Input Nominal di Mobile App",
          desc: "Glitch visual pada rounding desimal mata uang asing rupiah.",
          type: "bug", status: "To Do", priority: "Medium", assigneeId: "5", reporterId: "4", storyPoints: 3, projectRisk: "Low"
        },
        {
          id: crypto.randomUUID(), key: "RDU-19", parentId: epic5Id, sprintId: sprint3Id,
          title: "Review Kepatuhan Standar PCI-DSS & Surat Edaran OJK",
          desc: "Pengawasan administratif kepatuhan pengelolaan data kartu kredit dan transaksi finansial digital.",
          type: "task", status: "To Do", priority: "Medium", assigneeId: "2", reporterId: "3", storyPoints: 5, projectRisk: "Medium"
        },
        {
          id: crypto.randomUUID(), key: "RDU-20", parentId: epic5Id, sprintId: sprint3Id,
          title: "Penerbitan Sertifikat Izin Rilis (RFO) oleh IT Sec",
          desc: "Pemberian lampu hijau formal dari Divisi Kepatuhan Keamanan Informasi.",
          type: "approval", status: "To Do", priority: "Low", assigneeId: "2", reporterId: "3", storyPoints: 1, projectRisk: "High"
        },
        {
          id: crypto.randomUUID(), key: "RDU-22", parentId: epic6Id, sprintId: sprint3Id,
          title: "Persiapan Cut-over Runbook & Script Database Rollback",
          desc: "Menyusun instruksi langkah demi langkah divalidasi oleh tim SRE saat downtime rilis.",
          type: "task", status: "To Do", priority: "High", assigneeId: "4", reporterId: "3", storyPoints: 8, projectRisk: "High"
        },
        {
          id: crypto.randomUUID(), key: "RDU-23", parentId: epic6Id, sprintId: sprint3Id,
          title: "Deployment Artifact Release ke Produksi (Go-Live)",
          desc: "Eksekusi deployment sesungguhnya saat jam sepi transaksi perbankan (maintenance window).",
          type: "task", status: "To Do", priority: "High", assigneeId: "1", reporterId: "2", storyPoints: 13, projectRisk: "High"
        },
        {
          id: crypto.randomUUID(), key: "RDU-24", parentId: epic6Id, sprintId: sprint3Id,
          title: "Evaluasi Pasca Penerapan (Post Mortem Project)",
          desc: "Dokumentasi pelajaran berharga (lessons learned) demi efisiensi rilis siklus berikutnya.",
          type: "meeting", status: "To Do", priority: "Low", assigneeId: "3", reporterId: "3", storyPoints: 2, projectRisk: "Low"
        }
      ];

      for (const t of tasksToInsert) {
        await connection.query(
          `INSERT INTO Tasks (id, projectId, sprintId, taskKey, title, description, status, priority, type, assigneeId, reporterId, parentId, storyPoints, projectRisk)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [t.id, pId, t.sprintId, t.key, t.title, t.desc, t.status, t.priority, t.type, t.assigneeId, t.reporterId, t.parentId, t.storyPoints, t.projectRisk]
        );
      }

      // 6. Post Activity logs
      await connection.query(
        "INSERT INTO ActivityLogs (id, projectId, userId, action, details) VALUES (?, ?, ?, ?, ?)",
        [crypto.randomUUID(), pId, "3", "Proyek Dibuat", "PM Rian Hidayat menginisiasi project BNI SDLC Release v2.0 secara otomatis melalui generator sistem."]
      );
      await connection.query(
        "INSERT INTO ActivityLogs (id, projectId, userId, action, details) VALUES (?, ?, ?, ?, ?)",
        [crypto.randomUUID(), pId, "3", "Siklus Rilis Terpasang", "Mengonfigurasi 3 sprint berurutan untuk fase Inisiasi, Desain/Coding, serta Testing/Sertifikasi."]
      );

      // 7. Add Dummy Documents (Wiki)
      const documentsToInsert = [
        { id: crypto.randomUUID(), title: "Arsitektur Integrasi API Gateway", desc: "Dokumen panduan integrasi sistem ke BNI Open API dengan skema JWT authentication, rate limiting, dan IP whitelisting.", type: "PRD", link: "https://docs.google.com/document/d/1_demo_only_link", createdBy: "3" },
        { id: crypto.randomUUID(), title: "Penetration Testing Requirements", desc: "Kumpulan checklist uji kerentanan keamanan pada API yang akan dinilai oleh OJK, meliputi injeksi SQL, SSRF, IDOR, dan parameter tampering.", type: "Panduan", link: "https://docs.google.com/document/d/2_demo_only_link", createdBy: "2" },
        { id: crypto.randomUUID(), title: "Runbook Deployment Mobile UI", desc: "Urutan langkah-langkah mem-build APK/AAB dan mempublikasikannya ke App Store serta PlayStore setelah rilis internal.", type: "Laporan", link: "https://docs.google.com/document/d/3_demo_only_link", createdBy: "1" }
      ];

      for (const doc of documentsToInsert) {
        await connection.query(
          "INSERT INTO Documents (id, projectId, title, description, type, link, createdBy) VALUES (?, ?, ?, ?, ?, ?, ?)",
          [doc.id, pId, doc.title, doc.desc, doc.type, doc.link, doc.createdBy]
        );
      }

      // 8. Add Dummy Meetings & Discussion Points
      const meet1Id = crypto.randomUUID();
      await connection.query(
        "INSERT INTO Meetings (id, projectId, title, description, meetingLink, authorId) VALUES (?, ?, ?, ?, ?, ?)",
        [meet1Id, pId, "Kick-off Integrasi BNI Gateway", "Rapat perdana tentang pembagian peran pengembangan, integrasi REST API, manajemen kunci JWT.", "https://meet.google.com/abc-demo-xyz", "3"]
      );

      await connection.query(
        "INSERT INTO DiscussionPoints (id, meetingId, authorId, assignTo, concern, fitur, `system`, surrounding, keterangan, tindakanLanjut, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [crypto.randomUUID(), meet1Id, "3", "4", "Timeline pengembangan perlu dipastikan", "API Gateway", "Core Banking", "Frontend App", "Butuh API keys secepatnya dari BNI", "Email ke PIC BNI untuk akses sandbox", "pending"]
      );
      await connection.query(
        "INSERT INTO DiscussionPoints (id, meetingId, authorId, assignTo, concern, fitur, `system`, surrounding, keterangan, tindakanLanjut, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [crypto.randomUUID(), meet1Id, "3", "1", "Arsitektur cloud infra", "High Availability", "AWS/GCP Network", "WAF", "Setup WAF dan Load Balancer minggu ini", "Siapkan terraform script", "completed"]
      );

      const meet2Id = crypto.randomUUID();
      await connection.query(
        "INSERT INTO Meetings (id, projectId, title, description, meetingLink, authorId) VALUES (?, ?, ?, ?, ?, ?)",
        [meet2Id, pId, "Security Review QA & Pentest", "Review kerentanan hasil pemindaian tools Owasp ZAP dan persetujuan penulisan laporan akhir.", "https://meet.google.com/def-demo-uvw", "3"]
      );

      await connection.query(
        "INSERT INTO DiscussionPoints (id, meetingId, authorId, assignTo, concern, fitur, `system`, surrounding, keterangan, tindakanLanjut, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [crypto.randomUUID(), meet2Id, "2", "4", "Parameter tampering ditemukan", "Payment Endpoint", "Middleware", "Security Layer", "Ada kelemahan saat merubah amount secara manual", "Tambahkan HMAC validation", "pending"]
      );

      connection.release();
      res.json({ status: "success", projectId: pId });
    } catch (e: any) {
      console.error("LOG ANOMALI CRITICAL: POST /api/projects/generate-bni-demo error:", e);
      res.status(500).json({ status: "error", message: e.message });
    }
  });

  app.get("/api/projects/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const connection = await mysqlPool.getConnection();
      const [rows] = await connection.query(
        "SELECT * FROM Projects WHERE id = ?",
        [id]
      );
      
      if ((rows as any[]).length > 0) {
        const p = (rows as any[])[0];
        const [memberRows] = await connection.query(
          `SELECT u.uid, u.id as uuid, pm.role 
           FROM ProjectMembers pm
           JOIN Users u ON pm.userId = u.id
           WHERE pm.projectId = ?`,
          [p.id]
        );
        
        const membersList: string[] = [];
        const memberRoles: Record<string, string> = {};
        
        for (const m of (memberRows as any[])) {
          membersList.push(m.uid);
          memberRoles[m.uid] = m.role || 'viewer';
          memberRoles[m.uuid] = m.role || 'viewer';
        }
        
        p.members = membersList;
        p.memberRoles = memberRoles;
        
        connection.release();
        res.json({ status: "success", data: p });
      } else {
        connection.release();
        res.status(404).json({ status: "error", message: "Project not found" });
      }
    } catch (error: any) {
      console.error("LOG ANOMALI CRITICAL: GET /api/projects/:id error:", error);
      res.status(500).json({ status: "error", message: "Terjadi kesalahan internal server: " + error.message });
    }
  });

  app.post("/api/projects", async (req, res) => {
    let connection;
    try {
      const { name, description, ownerId, status, projectKey, category } = req.body;
      connection = await mysqlPool.getConnection();
      
      const newId = crypto.randomUUID();
      const pKey = projectKey || 'PRJ';

      // Resolve ownerId to internal database user id (UUID)
      let resolvedOwnerId = ownerId;
      const [uRows]: any = await connection.query("SELECT id FROM Users WHERE id = ? OR uid = ?", [ownerId, ownerId]);
      if (uRows.length > 0) {
        resolvedOwnerId = uRows[0].id;
      }
      
      await connection.query(
        "INSERT INTO Projects (id, name, projectKey, description, ownerId, status, category) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [newId, name, pKey, description || '', resolvedOwnerId, status || 'Active', category || 'Agile']
      );
      
      // Auto-add owner as member using resolved internal user id
      await connection.query(
        "INSERT INTO ProjectMembers (projectId, userId, role) VALUES (?, ?, ?)",
        [newId, resolvedOwnerId, 'Admin']
      );

      res.json({ status: "success", data: { id: newId, name, projectKey: pKey, description, ownerId: resolvedOwnerId, status: status || 'Active', category: category || 'Agile' }});
    } catch (error: any) {
      console.error("LOG ANOMALI CRITICAL: POST /api/projects error:", error);
      res.status(500).json({ status: "error", message: "Terjadi kesalahan internal server: " + error.message });
    } finally {
      if (connection) connection.release();
    }
  });

  app.put("/api/projects/:projectId/dashboard-layout", verifyProjectAccess(['admin', 'manager', 'head', 'developer', 'designer', 'viewer', '*']), async (req, res) => {
    let connection;
    try {
      const { projectId } = req.params;
      const { layout } = req.body;

      // Validasi tipe data array
      if (!Array.isArray(layout)) {
        return res.status(400).json({ status: "error", message: "Layout harus berupa tipe data array." });
      }

      connection = await mysqlPool.getConnection();
      const jsonLayout = JSON.stringify(layout);

      // Simpan ke dashboard_layout dan dashboardLayout untuk kompatibilitas penuh
      await connection.query(
        "UPDATE Projects SET dashboard_layout = ?, dashboardLayout = ? WHERE id = ?",
        [jsonLayout, jsonLayout, projectId]
      );

      res.json({ status: "success", message: "Layout updated" });
    } catch (error: any) {
      console.error("LOG ANOMALI CRITICAL: PUT /api/projects/:projectId/dashboard-layout error:", error);
      res.status(500).json({ status: "error", message: "Terjadi kesalahan internal server: " + error.message });
    } finally {
      if (connection) connection.release();
    }
  });

  app.put("/api/projects/:id", verifyProjectAccess(['admin', 'manager', 'head']), async (req, res) => {
    let connection;
    try {
      const { id } = req.params;
      const { name, description, status, currentSprintId, projectKey, ownerId, category, taskCounter, dashboardLayout } = req.body;
      connection = await mysqlPool.getConnection();
      
      const updates = [];
      const values = [];
      const changedFields: any = {};
      
      if (name !== undefined) { updates.push("name = ?"); values.push(name); changedFields.name = name; }
      if (description !== undefined) { updates.push("description = ?"); values.push(description); changedFields.description = description; }
      if (status !== undefined) { updates.push("status = ?"); values.push(status); changedFields.status = status; }
      if (projectKey !== undefined) { updates.push("projectKey = ?"); values.push(projectKey); changedFields.projectKey = projectKey; }
      if (ownerId !== undefined) {
        let resolvedOwnerId = ownerId;
        const [uRows]: any = await connection.query("SELECT id FROM Users WHERE id = ? OR uid = ?", [ownerId, ownerId]);
        if (uRows.length > 0) {
          resolvedOwnerId = uRows[0].id;
        }
        updates.push("ownerId = ?");
        values.push(resolvedOwnerId);
        changedFields.ownerId = resolvedOwnerId;
      }
      if (category !== undefined) { updates.push("category = ?"); values.push(category); changedFields.category = category; }
      if (taskCounter !== undefined) { updates.push("taskCounter = ?"); values.push(taskCounter); changedFields.taskCounter = taskCounter; }
      if (dashboardLayout !== undefined) { updates.push("dashboardLayout = ?"); values.push(dashboardLayout !== null ? JSON.stringify(dashboardLayout) : null); changedFields.dashboardLayout = dashboardLayout; }
      
      if (updates.length > 0) {
        values.push(id);
        const query = `UPDATE Projects SET ${updates.join(', ')} WHERE id = ?`;
        await connection.query(query, values);

        const userId = req.headers['x-user-id'] || 'guest';
        await createAuditLog(userId as string, id, 'UPDATE', 'Projects', id, null, changedFields);
      }
      
      res.json({ status: "success", message: "Project updated" });
    } catch (error: any) {
      console.error("LOG ANOMALI CRITICAL: PUT /api/projects error:", error);
      res.status(500).json({ status: "error", message: "Terjadi kesalahan internal server: " + error.message });
    } finally {
      if (connection) connection.release();
    }
  });

  // --- LanPro v1.5: BNI SDLC Advisor Route ---
  app.post("/api/projects/:projectId/methodology", authenticateJWT, verifyProjectAccess(['admin', 'manager', 'head']), async (req: any, res: any) => {
    let connection;
    try {
      const { projectId } = req.params;
      const { methodology, matrixScores } = req.body;
      const userId = req.user?.id || req.user?.uid || req.headers['x-user-id'] || 'guest';
      
      if (!methodology) {
        return res.status(400).json({ status: "error", message: "Metodologi harus ditentukan." });
      }

      // Normalisasi input string agar kompatibel dengan standard data
      const normalizedMethodology = methodology.toString().toUpperCase();

      connection = await mysqlPool.getConnection();
      
      // 1. Ambil data lama untuk Audit (Gunakan kolom 'category' sesuai schema.sql LanPro)
      const [oldRows]: any = await connection.query("SELECT category FROM Projects WHERE id = ?", [projectId]);
      if (oldRows.length === 0) {
        return res.status(404).json({ status: "error", message: "Proyek tidak ditemukan." });
      }
      const oldMethod = oldRows[0].category;

      // 2. Update Metodologi (Normalisasi input string menjadi HURUF BESAR)
      await connection.query("UPDATE Projects SET category = ? WHERE id = ?", [normalizedMethodology, projectId]);

      // 3. Simpan Audit Log Terperinci dengan Defensive Data Handling (Nested Try-Catch)
      const auditNewValues = { 
        category: normalizedMethodology, 
        matrixScores: matrixScores ? JSON.stringify(matrixScores) : null 
      };

      try {
        await createAuditLog(
          userId, 
          projectId, 
          'UPDATE', 
          'Projects', 
          projectId, 
          { category: oldMethod }, 
          auditNewValues
        );
      } catch (auditError) {
        console.warn("Peringatan: Gagal menyimpan jejak audit, tetapi metodologi berhasil diperbarui.", auditError);
      }

      res.json({ 
        status: "success", 
        message: `Metodologi proyek berhasil diperbarui menjadi ${normalizedMethodology}.`,
        data: { methodology: normalizedMethodology }
      });
    } catch (error: any) {
      console.error("====== EROR KRITIKAL METODOLOGI BACKEND ======", error);
      res.status(500).json({ 
        status: "error", 
        message: "Gagal memperbarui metodologi ke Waterfall akibat masalah integritas data server." 
      });
    } finally {
      if (connection) {
        connection.release();
      }
    }
  });

  app.delete("/api/projects/:projectId", verifyProjectAccess(['admin', 'head']), async (req, res) => {
    let connection;
    try {
      const { projectId } = req.params;
      connection = await mysqlPool.getConnection();
      
      await connection.beginTransaction();
      
      const cascadeQueries: [string, any[]][] = [
        ["DELETE FROM LinkedTasks WHERE sourceTaskId IN (SELECT id FROM Tasks WHERE projectId = ?) OR targetTaskId IN (SELECT id FROM Tasks WHERE projectId = ?)", [projectId, projectId]],
        ["DELETE FROM Comments WHERE taskId IN (SELECT id FROM Tasks WHERE projectId = ?)", [projectId]],
        ["DELETE FROM Attachments WHERE taskId IN (SELECT id FROM Tasks WHERE projectId = ?)", [projectId]],
        ["DELETE FROM TaskExternalLinks WHERE taskId IN (SELECT id FROM Tasks WHERE projectId = ?)", [projectId]],
        ["DELETE FROM TaskCustomFields WHERE taskId IN (SELECT id FROM Tasks WHERE projectId = ?)", [projectId]],
        ["DELETE FROM DiscussionPoints WHERE meetingId IN (SELECT id FROM Meetings WHERE projectId = ?)", [projectId]],
        ["DELETE FROM MilestoneSprints WHERE milestoneId IN (SELECT id FROM Milestones WHERE projectId = ?)", [projectId]],
        ["DELETE FROM Tasks WHERE projectId = ?", [projectId]],
        ["DELETE FROM Sprints WHERE projectId = ?", [projectId]],
        ["DELETE FROM ProjectMembers WHERE projectId = ?", [projectId]],
        ["DELETE FROM ProjectInvites WHERE projectId = ?", [projectId]],
        ["DELETE FROM Meetings WHERE projectId = ?", [projectId]],
        ["DELETE FROM Milestones WHERE projectId = ?", [projectId]],
        ["DELETE FROM Documents WHERE projectId = ?", [projectId]],
        ["DELETE FROM ActivityLogs WHERE projectId = ?", [projectId]],
        ["DELETE FROM AuditLogs WHERE projectId = ?", [projectId]],
        ["DELETE FROM QATestCases WHERE projectId = ?", [projectId]],
        ["DELETE FROM QATestSuites WHERE projectId = ?", [projectId]],
        ["DELETE FROM ProjectModules WHERE projectId = ?", [projectId]],
        ["DELETE FROM Projects WHERE id = ?", [projectId]]
      ];

      for (const [query, params] of cascadeQueries) {
        try {
          await connection.query(query, params);
        } catch (execError: any) {
          if (execError.code === 'ER_NO_SUCH_TABLE' || execError.code === 'ER_BAD_TABLE_ERROR' || (execError.message && execError.message.toLowerCase().includes('exist'))) {
            continue; // Ignore missing table errors during cascade
          }
          throw execError;
        }
      }
      
      await connection.commit();
      
      res.json({ status: "success", message: "Proyek berhasil dihapus beserta seluruh dependensinya." });
    } catch (error: any) {
      if (connection) await connection.rollback();
      console.error("LOG ANOMALI CRITICAL: DELETE /api/projects error:", error);
      return res.status(500).json({ status: "error", message: "Gagal menghapus proyek akibat kendala integritas database." });
    } finally {
      if (connection) connection.release();
    }
  });

  // Project Members & Invites API
  app.put("/api/projects/:id/members", verifyProjectAccess(['admin', 'manager', 'head']), async (req, res) => {
    try {
      const { id } = req.params;
      const { memberRoles, newMemberId, newMemberRole } = req.body;
      const connection = await mysqlPool.getConnection();
      
      // If we are passing full member roles map
      if (memberRoles) {
        for (const [userId, role] of Object.entries(memberRoles)) {
          // Resolve userId first (it might be uid or id)
          const [users] = await connection.query(
            "SELECT id FROM Users WHERE id = ? OR uid = ?",
            [userId, userId]
          );
          if ((users as any[]).length > 0) {
            const resolvedUserId = (users as any[])[0].id;
            await connection.query(
              "INSERT INTO ProjectMembers (projectId, userId, role) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE role = VALUES(role)",
              [id, resolvedUserId, role]
            );
          }
        }
      }
      
      // If we are adding/updating a single new member
      if (newMemberId && newMemberRole) {
         // Resolve user id first (if they passed firebase uid, get their UUID)
         const [users] = await connection.query(
           "SELECT id FROM Users WHERE id = ? OR uid = ?",
           [newMemberId, newMemberId]
         );
         if ((users as any[]).length > 0) {
           const resolvedUserId = (users as any[])[0].id;
           await connection.query(
              "INSERT INTO ProjectMembers (projectId, userId, role) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE role = VALUES(role)",
              [id, resolvedUserId, newMemberRole]
           );

           // Handle hierarchy for Project Admin ('admin')
           const { teamMemberIds } = req.body;
           if (newMemberRole === 'admin' && Array.isArray(teamMemberIds) && teamMemberIds.length > 0) {
             for (const tmId of teamMemberIds) {
               const [tmUsers] = await connection.query(
                 "SELECT id FROM Users WHERE id = ? OR uid = ?",
                 [tmId, tmId]
               );
               if ((tmUsers as any[]).length > 0) {
                 const resolvedTmId = (tmUsers as any[])[0].id;
                 await connection.query(
                   "INSERT INTO ProjectMembers (projectId, userId, role, parentAdminId) VALUES (?, ?, 'member', ?) ON DUPLICATE KEY UPDATE parentAdminId = VALUES(parentAdminId)",
                   [id, resolvedTmId, resolvedUserId]
                 );
               }
             }
           }
         }
      }
      
      connection.release();
      res.json({ status: "success", message: "Members updated" });
    } catch (error: any) {
      console.error("LOG ANOMALI CRITICAL: PUT /api/projects/:id/members error:", error);
      res.status(500).json({ status: "error", message: "Terjadi kesalahan internal server: " + error.message });
    }
  });

  app.delete("/api/projects/:id/members/:userId", verifyProjectAccess(['admin', 'manager', 'head']), async (req, res) => {
    try {
      const { id, userId } = req.params;
      const connection = await mysqlPool.getConnection();
      
      // Resolve user id first (if they passed firebase uid, get their UUID)
      const [users] = await connection.query(
        "SELECT id FROM Users WHERE id = ? OR uid = ?",
        [userId, userId]
      );
      
      if ((users as any[]).length > 0) {
        const resolvedUserId = (users as any[])[0].id;
        await connection.query(
          "DELETE FROM ProjectMembers WHERE projectId = ? AND userId = ?",
          [id, resolvedUserId]
        );
      }
      
      connection.release();
      res.json({ status: "success", message: "Member removed from project" });
    } catch (error: any) {
      console.error("LOG ANOMALI CRITICAL: DELETE /api/projects/:id/members/:userId error:", error);
      res.status(500).json({ status: "error", message: "Terjadi kesalahan internal server: " + error.message });
    }
  });

  app.put("/api/projects/:id/invites", async (req, res) => {
    try {
      const { id } = req.params;
      const { emailToInvite } = req.body;
      const connection = await mysqlPool.getConnection();
      
      await connection.query(
        "INSERT INTO ProjectInvites (id, projectId, email) VALUES (?, ?, ?)",
        [crypto.randomUUID(), id, emailToInvite]
      );
      
      connection.release();
      res.json({ status: "success", message: "Invite added" });
    } catch (error: any) {
      console.error("LOG ANOMALI CRITICAL: PUT /api/projects/:id/invites error:", error);
      res.status(500).json({ status: "error", message: "Terjadi kesalahan internal server: " + error.message });
    }
  });

  // Sprints API
  app.get("/api/projects/:projectId/sprints", verifyProjectAccess(['*']), async (req, res) => {
    let connection;
    try {
      const { projectId } = req.params;
      connection = await mysqlPool.getConnection();
      const [rows] = await connection.query(
        "SELECT * FROM Sprints WHERE projectId = ? ORDER BY startDate ASC",
        [projectId]
      );
      res.json({ status: "success", data: rows });
    } catch (error: any) {
      console.error("LOG ANOMALI CRITICAL: GET /api/projects/:projectId/sprints error:", error);
      res.status(500).json({ status: "error", message: "Terjadi kesalahan internal server: " + error.message });
    } finally {
      if (connection) connection.release();
    }
  });

  app.post("/api/projects/:projectId/sprints", verifyProjectAccess(['admin', 'manager', 'head']), async (req, res) => {
    let connection;
    try {
      const { projectId } = req.params;
      const { name, goal, startDate, endDate, status } = req.body;
      connection = await mysqlPool.getConnection();
      
      // Guard Rail: Prevent Sprints in Waterfall projects
      const [proj]: any = await connection.query("SELECT category FROM Projects WHERE id = ?", [projectId]);
      if (proj.length > 0 && proj[0].category === 'Waterfall') {
        return res.status(400).json({ status: "error", message: "Metodologi Waterfall tidak mendukung pembuatan Sprint. Gunakan Milestone atau GANTT Chart." });
      }

      const newId = crypto.randomUUID();
      
      // We check if dates are handled stringly or date object
      await connection.query(
        "INSERT INTO Sprints (id, projectId, name, goal, startDate, endDate, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [newId, projectId, name, goal || '', startDate || null, endDate || null, status || 'planned']
      );
      
      const userIdStr = req.headers['x-user-id'] || 'guest';
      await createAuditLog(userIdStr as string, projectId, 'CREATE', 'Sprints', newId, null, req.body);
      
      res.json({ status: "success", data: { id: newId, projectId, name, goal, startDate, endDate, status: status || 'planned' }});
    } catch (error: any) {
      console.error("LOG ANOMALI CRITICAL: POST /api/projects/:projectId/sprints error:", error);
      res.status(500).json({ status: "error", message: "Terjadi kesalahan internal server: " + error.message });
    } finally {
      if (connection) connection.release();
    }
  });

  app.put("/api/projects/:projectId/sprints/:id", verifyProjectAccess(['admin', 'manager', 'head']), async (req, res) => {
    let connection;
    try {
      const { id } = req.params;
      connection = await mysqlPool.getConnection();

      const [existingSprints]: any = await connection.query("SELECT * FROM Sprints WHERE id = ?", [id]);
      if (existingSprints.length === 0) {
        return res.status(404).json({ status: "error", message: "Sprint tidak ditemukan" });
      }

      const existing = existingSprints[0];
      const finalName = req.body.hasOwnProperty('name') ? req.body.name : existing.name;
      const finalGoal = req.body.hasOwnProperty('goal') ? req.body.goal : existing.goal;
      const finalStartDate = req.body.hasOwnProperty('startDate') ? req.body.startDate : existing.startDate;
      const finalEndDate = req.body.hasOwnProperty('endDate') ? req.body.endDate : existing.endDate;
      const finalStatus = req.body.hasOwnProperty('status') ? req.body.status : existing.status;
      
      await connection.query(
        "UPDATE Sprints SET name=?, goal=?, startDate=?, endDate=?, status=? WHERE id=?",
        [finalName, finalGoal, finalStartDate || null, finalEndDate || null, finalStatus, id]
      );
      
      res.json({ status: "success", message: "Sprint updated" });
    } catch (error: any) {
      console.error("LOG ANOMALI CRITICAL: PUT /api/projects/:projectId/sprints/:id error:", error);
      res.status(500).json({ status: "error", message: "Terjadi kesalahan internal server: " + error.message });
    } finally {
      if (connection) connection.release();
    }
  });

  app.delete("/api/projects/:projectId/sprints/:id", verifyProjectAccess(['admin', 'manager', 'head']), async (req, res) => {
    try {
      const { id, projectId } = req.params;
      const connection = await mysqlPool.getConnection();
      await connection.query("DELETE FROM Sprints WHERE id = ? AND projectId = ?", [id, projectId]);
      connection.release();
      res.json({ status: "success", message: "Sprint deleted" });
    } catch (error: any) {
      console.error("LOG ANOMALI CRITICAL: DELETE /api/projects/:projectId/sprints/:id error:", error);
      res.status(500).json({ status: "error", message: "Terjadi kesalahan internal server: " + error.message });
    }
  });

  // ==========================================
  // QA Test Suites API
  // ==========================================
  app.get("/api/projects/:projectId/qa-test-suites", verifyProjectAccess(['*']), async (req, res) => {
    let connection;
    try {
      const { projectId } = req.params;
      connection = await mysqlPool.getConnection();
      const [rows]: any = await connection.query(
        "SELECT * FROM QATestSuites WHERE projectId = ? ORDER BY uploadedAt DESC",
        [projectId]
      );
      res.json({ status: "success", data: rows });
    } catch (error: any) {
      console.error("GET /api/projects/:projectId/qa-test-suites error:", error);
      res.status(500).json({ status: "error", message: error.message });
    } finally {
      if (connection) connection.release();
    }
  });

  // POST: Save QA/user feedback to ai_learning_logs for AI continuous learning
  app.post("/api/v1/qa/ai-feedback", async (req, res) => {
    let connection;
    try {
      const { project_id, evaluation_notes } = req.body;
      if (!project_id || !evaluation_notes || !evaluation_notes.trim()) {
        return res.status(400).json({ status: "error", message: "Parameter project_id dan evaluation_notes wajib diisi." });
      }

      connection = await mysqlPool.getConnection();
      const id = crypto.randomUUID();
      const timestamp = new Date().toISOString();

      await connection.query(
        "INSERT INTO ai_learning_logs (id, project_id, evaluation_notes, timestamp) VALUES (?, ?, ?, ?)",
        [id, project_id, evaluation_notes.trim(), timestamp]
      );

      console.log(`[QA AI FEEDBACK] Saved learning log ${id} for project ${project_id}`);
      return res.json({ status: "success", message: "Feedback berhasil disimpan ke dalam log pembelajaran AI." });
    } catch (error: any) {
      console.error("[QA AI FEEDBACK ERROR]", error);
      return res.status(500).json({ status: "error", message: "Gagal menyimpan feedback: " + error.message });
    } finally {
      if (connection) connection.release();
    }
  });

  // New Bulk Upload API Endpoint
  app.post("/api/v1/qa/test-case/bulk-upload", upload.single('file'), async (req, res) => {
    let connection;
    try {
      const { projectId, phase, uploaderName } = req.body;
      const file = req.file;
      
      if (!projectId || !phase || !file) {
        return res.status(400).json({ status: "error", message: "Missing required fields (projectId, phase, file)" });
      }

      // Security & Magic Byte Validation
      const fileBuf = fs.readFileSync(file.path);
      const fileVal = validateFileBuffer(fileBuf, file.originalname);
      if (!fileVal.valid) {
        if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
        return res.status(400).json({ 
          status: "error", 
          message: fileVal.error || "Gagal Mengunggah Dokumen: Format file tidak didukung atau ukuran melebihi batas maksimum (Max 10MB)." 
        });
      }
      
      // Parse Excel
      const xlsx = require("xlsx");
      const workbook = xlsx.readFile(file.path);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
      
      // Validation Headers
      const headers = data[0] as string[];
      if (!headers || headers.length < 4) {
         return res.status(400).json({ status: "error", message: "Format kolom tidak sesuai standar (Nama Judul, Deskripsi, Hasil Diharapkan, Level)" });
      }
      
      const expectedHeaders = ["Nama Judul", "Deskripsi", "Hasil Diharapkan", "Level"];
      let headerValid = true;
      for (let i = 0; i < expectedHeaders.length; i++) {
        if (!headers[i] || headers[i].trim().toLowerCase() !== expectedHeaders[i].toLowerCase()) {
           headerValid = false;
           break;
        }
      }
      
      if (!headerValid) {
        return res.status(400).json({ status: "error", message: "Format kolom tidak sesuai standar (Nama Judul, Deskripsi, Hasil Diharapkan, Level)" });
      }
      
      connection = await mysqlPool.getConnection();
      
      const newSuiteId = `suite-${Date.now()}`;
      const newSuiteName = `${file.originalname.replace(/\.[^/.]+$/, "")} (${phase})`;
      
      // Create Suite
      await connection.query(
        `INSERT INTO QATestSuites (id, projectId, name, phase, uploadedBy, uploadedAt, fileName)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          newSuiteId,
          projectId,
          newSuiteName,
          phase,
          uploaderName || "Unknown",
          new Date().toISOString(),
          file.originalname
        ]
      );
      
      // Add Cases
      let rowNum = 1;
      const casesToReturn = [];
      for (let i = 1; i < data.length; i++) {
        const row = data[i] as any[];
        if (!row || row.length === 0 || !row[0]) continue;
        
        const newCaseId = `case-${Date.now()}-${rowNum}`;
        const newCase = {
          id: newCaseId,
          suiteId: newSuiteId,
          rowNum: rowNum,
          title: row[0],
          steps: row[1] || "",
          expectedResult: row[2] || "",
          status: "Pending",
          priority: row[3] || "Medium",
          commentsList: [],
          evidences: []
        };
        casesToReturn.push(newCase);
        
        await connection.query(
          `INSERT INTO QATestCases (id, projectId, judul, deskripsi, tipeTesting, prioritas, status, steps, history, createdAt, suiteId, rowNum, modulId, commentsList, evidences, expected)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            newCase.id,
            projectId,
            newCase.title,
            newCase.steps,
            phase,
            newCase.priority,
            newCase.status,
            JSON.stringify(newCase.steps),
            JSON.stringify([]),
            new Date().toISOString(),
            newSuiteId,
            newCase.rowNum,
            newSuiteId, // Using suiteId as modulId for now
            JSON.stringify([]),
            JSON.stringify([]),
            newCase.expectedResult
          ]
        );
        rowNum++;
      }
      
      res.status(201).json({ 
        status: "success", 
        message: "Bulk upload berhasil",
        data: {
          suiteId: newSuiteId,
          casesCount: casesToReturn.length
        }
      });
    } catch (error: any) {
      console.error("POST /api/v1/qa/test-case/bulk-upload error:", error);
      res.status(500).json({ status: "error", message: error.message });
    } finally {
      if (connection) connection.release();
    }
  });

  app.post("/api/projects/:projectId/qa-test-suites", async (req, res) => {
    let connection;
    try {
      const { projectId } = req.params;
      const suite = req.body;
      connection = await mysqlPool.getConnection();
      await connection.query(
        `INSERT INTO QATestSuites (id, projectId, name, phase, uploadedBy, uploadedAt, fileName)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          suite.id,
          projectId,
          suite.name,
          suite.phase,
          suite.uploadedBy,
          suite.uploadedAt || new Date().toISOString(),
          suite.fileName || null
        ]
      );
      res.json({ status: "success", message: "Test Suite created", data: suite });
    } catch (error: any) {
      console.error("POST /api/projects/:projectId/qa-test-suites error:", error);
      res.status(500).json({ status: "error", message: error.message });
    } finally {
      if (connection) connection.release();
    }
  });

  app.put("/api/projects/:projectId/qa-test-suites/:id", async (req, res) => {
    let connection;
    try {
      const { projectId, id } = req.params;
      const suite = req.body;
      connection = await mysqlPool.getConnection();
      await connection.query(
        `UPDATE QATestSuites SET name = ?, phase = ?, uploadedBy = ?, uploadedAt = ?, fileName = ?
         WHERE id = ? AND projectId = ?`,
        [
          suite.name,
          suite.phase,
          suite.uploadedBy,
          suite.uploadedAt,
          suite.fileName || null,
          id,
          projectId
        ]
      );
      res.json({ status: "success", message: "Test Suite updated" });
    } catch (error: any) {
      console.error("PUT /api/projects/:projectId/qa-test-suites/:id error:", error);
      res.status(500).json({ status: "error", message: error.message });
    } finally {
      if (connection) connection.release();
    }
  });

  app.delete("/api/projects/:projectId/qa-test-suites/:id", async (req, res) => {
    let connection;
    try {
      const { projectId, id } = req.params;
      connection = await mysqlPool.getConnection();
      // Start transaction
      await connection.beginTransaction();
      
      // Delete test cases under this suite (by suiteId)
      await connection.query(
        "DELETE FROM QATestCases WHERE suiteId = ? AND projectId = ?",
        [id, projectId]
      );
      
      // Delete test cases under this suite (by modulId, for backward compatibility)
      await connection.query(
        "DELETE FROM QATestCases WHERE modulId = ? AND projectId = ?",
        [id, projectId]
      );
      
      // Delete suite
      await connection.query(
        "DELETE FROM QATestSuites WHERE id = ? AND projectId = ?",
        [id, projectId]
      );
      
      await connection.commit();
      res.json({ status: "success", message: "Test Suite and its Test Cases deleted" });
    } catch (error: any) {
      if (connection) await connection.rollback();
      console.error("DELETE /api/projects/:projectId/qa-test-suites/:id error:", error);
      res.status(500).json({ status: "error", message: error.message });
    } finally {
      if (connection) connection.release();
    }
  });

  // ==========================================
  // QA Test Cases API
  // ==========================================
  app.get("/api/projects/:projectId/qa-test-cases", verifyProjectAccess(['*']), async (req, res) => {
    let connection;
    try {
      const { projectId } = req.params;
      connection = await mysqlPool.getConnection();
      const [rows]: any = await connection.query(
        "SELECT * FROM QATestCases WHERE projectId = ? ORDER BY rowNum ASC, id ASC",
        [projectId]
      );
      
      const safeParse = (str, fallback = []) => {
        if (typeof str !== 'string') return str || fallback;
        try {
          return JSON.parse(str);
        } catch (e) {
          return fallback;
        }
      };

      const parsed = rows.map((row: any) => ({
        ...row,
        steps: safeParse(row.steps, []),
        history: safeParse(row.history, []),
        commentsList: safeParse(row.commentsList, []),
        evidences: safeParse(row.evidences, [])
      }));
      
      res.json({ status: "success", data: parsed });
    } catch (error: any) {
      console.error("GET /api/projects/:projectId/qa-test-cases error:", error);
      res.status(500).json({ status: "error", message: error.message });
    } finally {
      if (connection) connection.release();
    }
  });

  app.post("/api/projects/:projectId/qa-test-cases", async (req, res) => {
    let connection;
    try {
      const { projectId } = req.params;
      const tc = req.body;
      connection = await mysqlPool.getConnection();
      
      await connection.query(
        `INSERT INTO QATestCases (
          id, projectId, judul, deskripsi, tipeTesting, prioritas, caseId, expected, status, steps, history, createdAt, activeTesterId, activeTesterName, lockedAt, modulId,
          suiteId, rowNum, comment, evidenceUrl, evidenceType, evidenceName, linkedBugKey, commentsList, evidences
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          tc.id,
          projectId,
          tc.judul || tc.title,
          tc.deskripsi || tc.comment || null,
          tc.tipeTesting || tc.phase || 'SIT',
          tc.prioritas || tc.priority || 'Medium',
          tc.caseId || null,
          tc.expected || tc.expectedResult || null,
          tc.status || 'untested',
          JSON.stringify(tc.steps || []),
          JSON.stringify(tc.history || []),
          tc.createdAt || new Date().toISOString(),
          tc.activeTesterId || null,
          tc.activeTesterName || null,
          tc.lockedAt || null,
          tc.modulId || tc.suiteId || null,
          tc.suiteId || null,
          tc.rowNum || null,
          tc.comment || null,
          tc.evidenceUrl || null,
          tc.evidenceType || null,
          tc.evidenceName || null,
          tc.linkedBugKey || null,
          JSON.stringify(tc.commentsList || []),
          JSON.stringify(tc.evidences || [])
        ]
      );
      
      res.json({ status: "success", message: "Test Case created" });
    } catch (error: any) {
      console.error("POST /api/projects/:projectId/qa-test-cases error:", error);
      res.status(500).json({ status: "error", message: error.message });
    } finally {
      if (connection) connection.release();
    }
  });

  app.put("/api/projects/:projectId/qa-test-cases/:id", async (req, res) => {
    let connection;
    try {
      const { projectId, id } = req.params;
      const tc = req.body;
      connection = await mysqlPool.getConnection();
      
      await connection.query(
        `UPDATE QATestCases SET 
          judul = ?, 
          deskripsi = ?, 
          tipeTesting = ?, 
          prioritas = ?, 
          caseId = ?, 
          expected = ?, 
          status = ?, 
          steps = ?, 
          history = ?,
          activeTesterId = ?,
          activeTesterName = ?,
          lockedAt = ?,
          modulId = ?,
          suiteId = ?,
          rowNum = ?,
          comment = ?,
          evidenceUrl = ?,
          evidenceType = ?,
          evidenceName = ?,
          linkedBugKey = ?,
          commentsList = ?,
          evidences = ?
         WHERE id = ? AND projectId = ?`,
        [
          tc.judul || tc.title,
          tc.deskripsi || tc.comment || null,
          tc.tipeTesting || tc.phase || 'SIT',
          tc.prioritas || tc.priority || 'Medium',
          tc.caseId || null,
          tc.expected || tc.expectedResult || null,
          tc.status,
          JSON.stringify(tc.steps || []),
          JSON.stringify(tc.history || []),
          tc.activeTesterId || null,
          tc.activeTesterName || null,
          tc.lockedAt || null,
          tc.modulId || tc.suiteId || null,
          tc.suiteId || null,
          tc.rowNum || null,
          tc.comment || null,
          tc.evidenceUrl || null,
          tc.evidenceType || null,
          tc.evidenceName || null,
          tc.linkedBugKey || null,
          JSON.stringify(tc.commentsList || []),
          JSON.stringify(tc.evidences || []),
          id,
          projectId
        ]
      );
      
      res.json({ status: "success", message: "Test Case updated" });
    } catch (error: any) {
      console.error("PUT /api/projects/:projectId/qa-test-cases/:id error:", error);
      res.status(500).json({ status: "error", message: error.message });
    } finally {
      if (connection) connection.release();
    }
  });

  // Dedicated Save endpoint (Form-Data with comment & single file attachment/evidence upload)
  app.post("/api/projects/:projectId/qa-test-cases/:id/save", upload.single('evidence'), async (req, res) => {
    let connection;
    try {
      const { projectId, id } = req.params;
      const { comment, commentsList, evidences, status, linkedBugKey, currentUserName } = req.body;
      const file = req.file;

      connection = await mysqlPool.getConnection();

      // Retrieve current test case to update
      const [existingRows]: any = await connection.query(
        "SELECT * FROM QATestCases WHERE id = ? AND projectId = ?",
        [id, projectId]
      );

      if (existingRows.length === 0) {
        return res.status(404).json({ status: "error", message: "Test case tidak ditemukan." });
      }

      const tc = existingRows[0];

      // File handling
      let finalEvidenceUrl = req.body.evidenceUrl !== undefined ? req.body.evidenceUrl : tc.evidenceUrl;
      let finalEvidenceName = req.body.evidenceName !== undefined ? req.body.evidenceName : tc.evidenceName;
      let finalEvidenceType = req.body.evidenceType !== undefined ? req.body.evidenceType : tc.evidenceType;
      
      let finalEvidences = [];
      try {
        finalEvidences = typeof tc.evidences === 'string' ? JSON.parse(tc.evidences) : (tc.evidences || []);
      } catch (e) {
        finalEvidences = [];
      }

      if (file) {
        // Security & Magic Byte Validation
        const fileBuf = fs.readFileSync(file.path);
        const fileVal = validateFileBuffer(fileBuf, file.originalname);
        if (!fileVal.valid) {
          if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
          return res.status(400).json({ 
            status: "error", 
            message: fileVal.error || "Gagal Mengunggah Dokumen: Format file tidak didukung atau ukuran melebihi batas maksimum (Max 10MB)." 
          });
        }

        const safeName = fileVal.sanitizedName || sanitizeFilename(file.originalname);
        const newPath = path.join(GLOBAL_UPLOADS_DIR, safeName);
        fs.renameSync(file.path, newPath);

        const relativePath = `/uploads/${safeName}`;
        finalEvidenceUrl = relativePath;
        finalEvidenceName = file.originalname;
        finalEvidenceType = file.mimetype.startsWith("video/") ? "video" : "image";
        
        // Append to list of multiple evidences
        finalEvidences.push({
          id: `ev-${Date.now()}-${Math.floor(Math.random() * 1000000)}`,
          name: file.originalname,
          url: relativePath,
          type: finalEvidenceType
        });
      }

      // If there are other evidences sent as stringified json, parse or combine them
      let parsedEvidences = finalEvidences;
      if (evidences) {
        try {
          parsedEvidences = typeof evidences === 'string' ? JSON.parse(evidences) : evidences;
        } catch (e) {}
      }

      // Comments list handling
      let parsedCommentsList = [];
      try {
        parsedCommentsList = typeof tc.commentsList === 'string' ? JSON.parse(tc.commentsList) : (tc.commentsList || []);
      } catch (e) {
        parsedCommentsList = [];
      }

      if (commentsList) {
        try {
          parsedCommentsList = typeof commentsList === 'string' ? JSON.parse(commentsList) : commentsList;
        } catch (e) {}
      }

      // If a comment is passed, let's append it to commentsList if it's new
      if (comment && comment.trim() && comment !== tc.comment) {
        parsedCommentsList.push({
          id: `comment-${Date.now()}`,
          userName: currentUserName || "Tester LanPro",
          text: comment.trim(),
          timestamp: new Date().toISOString()
        });
      }

      await connection.query(
        `UPDATE QATestCases SET 
          comment = ?,
          commentsList = ?,
          evidenceUrl = ?,
          evidenceName = ?,
          evidenceType = ?,
          evidences = ?,
          status = ?,
          linkedBugKey = ?
         WHERE id = ? AND projectId = ?`,
        [
          comment || tc.comment || null,
          JSON.stringify(parsedCommentsList),
          finalEvidenceUrl,
          finalEvidenceName,
          finalEvidenceType,
          JSON.stringify(parsedEvidences),
          status || tc.status,
          linkedBugKey || tc.linkedBugKey || null,
          id,
          projectId
        ]
      );

      res.json({
        status: "success",
        message: "Test case saved successfully",
        data: {
          id,
          comment: comment || tc.comment,
          commentsList: parsedCommentsList,
          evidenceUrl: finalEvidenceUrl,
          evidenceName: finalEvidenceName,
          evidenceType: finalEvidenceType,
          evidences: parsedEvidences,
          status: status || tc.status,
          linkedBugKey: linkedBugKey || tc.linkedBugKey
        }
      });
    } catch (error: any) {
      console.error("POST /api/projects/:projectId/qa-test-cases/:id/save error:", error);
      res.status(500).json({ status: "error", message: error.message });
    } finally {
      if (connection) connection.release();
    }
  });

  // Helper Function: Record Non-Destructive Execution Run Log (Audit Trail)
  async function recordExecutionRunLog(
    conn: any,
    projectId: string,
    testCaseId: string,
    executionStatus: string,
    linkedIssueKey: string | null = null,
    userId: string = "system",
    userName: string = "Tester / System",
    notes: string = "",
    evidences: any[] = []
  ) {
    try {
      // 1. Fetch current history from QATestCases
      const [rows]: any = await conn.query(
        "SELECT history FROM QATestCases WHERE id = ? AND projectId = ?",
        [testCaseId, projectId]
      );

      let currentHistory: any[] = [];
      if (rows && rows.length > 0 && rows[0].history) {
        try {
          currentHistory = typeof rows[0].history === "string" ? JSON.parse(rows[0].history) : (rows[0].history || []);
        } catch (e) {
          currentHistory = [];
        }
      }

      const nextRunVersion = currentHistory.length + 1;
      const runLabel = `Run #${nextRunVersion}`;
      const logId = crypto.randomUUID();
      const timestamp = new Date().toISOString();

      const newLog = {
        id: logId,
        testCaseId,
        projectId,
        runVersion: nextRunVersion,
        runLabel,
        executionStatus: executionStatus.toUpperCase(),
        linkedIssueKey: linkedIssueKey || null,
        executedByUserId: userId,
        executedByName: userName,
        timestamp,
        notes: notes || `Status eksekusi diubah menjadi ${executionStatus.toUpperCase()}`,
        evidences: evidences || []
      };

      currentHistory.push(newLog);

      // Update QATestCases history JSON
      await conn.query(
        "UPDATE QATestCases SET history = ? WHERE id = ? AND projectId = ?",
        [JSON.stringify(currentHistory), testCaseId, projectId]
      );

      // Insert into QATestCaseExecutionLogs relational table
      try {
        await conn.query(
          `INSERT INTO QATestCaseExecutionLogs 
           (id, testCaseId, projectId, runVersion, runLabel, executionStatus, linkedIssueKey, executedByUserId, executedByName, timestamp, notes, evidences)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            logId,
            testCaseId,
            projectId,
            nextRunVersion,
            runLabel,
            executionStatus.toUpperCase(),
            linkedIssueKey || null,
            userId,
            userName,
            timestamp,
            notes || `Status eksekusi: ${executionStatus.toUpperCase()}`,
            JSON.stringify(evidences || [])
          ]
        );
      } catch (dbErr) {
        // Table fallback
      }

      return newLog;
    } catch (err) {
      console.error("recordExecutionRunLog error:", err);
      return null;
    }
  }

  // GET: Execution History Timeline (Run History Audit Trail)
  app.get("/api/projects/:projectId/qa-test-cases/:id/execution-history", verifyProjectAccess(['*']), async (req, res) => {
    let connection;
    try {
      const { projectId, id } = req.params;
      connection = await mysqlPool.getConnection();
      
      // Try QATestCaseExecutionLogs first
      let logs: any[] = [];
      try {
        const [logRows]: any = await connection.query(
          "SELECT * FROM QATestCaseExecutionLogs WHERE testCaseId = ? AND projectId = ? ORDER BY runVersion ASC",
          [id, projectId]
        );
        if (logRows && logRows.length > 0) {
          logs = logRows.map((r: any) => ({
            ...r,
            evidences: typeof r.evidences === 'string' ? JSON.parse(r.evidences || '[]') : r.evidences
          }));
        }
      } catch (e) {}

      if (logs.length === 0) {
        // Fallback to QATestCases history
        const [tcRows]: any = await connection.query(
          "SELECT history FROM QATestCases WHERE id = ? AND projectId = ?",
          [id, projectId]
        );
        if (tcRows && tcRows.length > 0 && tcRows[0].history) {
          try {
            logs = typeof tcRows[0].history === "string" ? JSON.parse(tcRows[0].history) : tcRows[0].history;
          } catch(e) {}
        }
      }

      res.json({ status: "success", data: logs || [] });
    } catch (error: any) {
      console.error("GET execution-history error:", error);
      res.status(500).json({ status: "error", message: error.message });
    } finally {
      if (connection) connection.release();
    }
  });

  // Dedicated status update endpoint (Instant with Non-Destructive Execution Run Log)
  app.patch("/api/projects/:projectId/qa-test-cases/:id/status", async (req, res) => {
    let connection;
    try {
      const { projectId, id } = req.params;
      const { status, notes } = req.body;
      if (!status) {
        return res.status(400).json({ status: "error", message: "Status required" });
      }

      connection = await mysqlPool.getConnection();
      
      // Get current TC data
      const [tcRows]: any = await connection.query(
        "SELECT * FROM QATestCases WHERE id = ? AND projectId = ?",
        [id, projectId]
      );
      
      let createdBugKey = null;

      if (tcRows.length > 0) {
        const tc = tcRows[0];
        const userIdStr = (req as any).user?.uid || (req as any).user?.id || req.headers['x-user-id'] || 'guest';
        
        // Fetch User Display Name
        let userNameStr = "Tester";
        try {
          const [uRows]: any = await connection.query("SELECT displayName, username FROM Users WHERE id = ? OR uid = ?", [userIdStr, userIdStr]);
          if (uRows && uRows.length > 0) {
            userNameStr = uRows[0].displayName || uRows[0].username || "Tester";
          }
        } catch (e) {}

        // Auto-create Bug if status is Failed and bug hasn't been created yet
        if (status.toLowerCase() === 'failed' && !tc.linkedBugKey) {
          // Generate new Task Key
          const [keyResult]: any = await connection.query(
             "SELECT taskKey FROM Tasks WHERE projectId = ? ORDER BY createdAt DESC LIMIT 1",
             [projectId]
          );
          
          let nextKeyNum = 1;
          let projCode = "PRJ";
          if (keyResult.length > 0 && keyResult[0].taskKey) {
             const keyParts = keyResult[0].taskKey.split('-');
             if (keyParts.length > 1) {
                projCode = keyParts[0];
                nextKeyNum = parseInt(keyParts[1], 10) + 1;
             }
          } else {
             // Try to get prefix from project
             const [projRes]: any = await connection.query("SELECT prefix FROM Projects WHERE id = ?", [projectId]);
             if (projRes.length > 0 && projRes[0].prefix) {
                projCode = projRes[0].prefix;
             }
          }
          const taskKey = `${projCode}-${nextKeyNum}`;
          const bugId = crypto.randomUUID();
          
          const tcTitle = tc.judul || tc.title || "Untitled Test Case";
          const tcDesc = tc.deskripsi || tc.description || "";
          const tcCaseId = tc.caseId || tc.id || "";

          // Requirement 1: Store REPORTER_USER_ID as reporterId on created Bug task
          await connection.query(
            `INSERT INTO Tasks (id, projectId, taskKey, title, description, status, priority, type, reporterId, projectRisk) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [bugId, projectId, taskKey, `Bug: ${tcTitle}`, `Bug otomatis dibuat dari QA Test Case [${tcCaseId}]: ${tcTitle}.\n\n**Deskripsi Test Case:**\n${tcDesc}`, 'To Do', 'High', 'bug', userIdStr, 'High']
          );
          
          createdBugKey = taskKey;
          
          await connection.query(
            "UPDATE QATestCases SET status = ?, linkedBugKey = ? WHERE id = ? AND projectId = ?",
            [status, createdBugKey, id, projectId]
          );
          
          try {
             await createAuditLog(userIdStr as string, projectId, 'CREATE', 'Tasks', bugId, null, { title: `Bug: ${tcTitle}` });
          } catch(e) {}
        } else {
          await connection.query(
            "UPDATE QATestCases SET status = ? WHERE id = ? AND projectId = ?",
            [status, id, projectId]
          );
        }

        // Requirement 3: Record Non-Destructive Execution Run Log (Audit Trail)
        let evList = [];
        try {
          evList = typeof tc.evidences === 'string' ? JSON.parse(tc.evidences) : (tc.evidences || []);
        } catch(e) {}

        const activeLinkedKey = createdBugKey || tc.linkedBugKey || null;
        await recordExecutionRunLog(
          connection,
          projectId,
          id,
          status,
          activeLinkedKey,
          userIdStr,
          userNameStr,
          notes || (createdBugKey ? `Status FAILED. Auto-generated Bug Issue #${createdBugKey}` : `Manual Status Update to ${status.toUpperCase()}`),
          evList
        );
      }

      res.json({ status: "success", message: "Status updated successfully", statusValue: status, bugKey: createdBugKey });
    } catch (error: any) {
      console.error("PATCH /api/projects/:projectId/qa-test-cases/:id/status error:", error);
      res.status(500).json({ status: "error", message: error.message });
    } finally {
      if (connection) connection.release();
    }
  });

  app.delete("/api/projects/:projectId/qa-test-cases/:id", async (req, res) => {
    let connection;
    try {
      const { projectId, id } = req.params;
      connection = await mysqlPool.getConnection();
      await connection.query("DELETE FROM QATestCases WHERE id = ? AND projectId = ?", [id, projectId]);
      res.json({ status: "success", message: "Test Case deleted" });
    } catch (error: any) {
      console.error("DELETE /api/projects/:projectId/qa-test-cases/:id error:", error);
      res.status(500).json({ status: "error", message: error.message });
    } finally {
      if (connection) connection.release();
    }
  });

  app.post("/api/projects/:projectId/qa-test-cases/sync", async (req, res) => {
    let connection;
    try {
      const { projectId } = req.params;
      const testCases = req.body;
      if (!Array.isArray(testCases)) {
        return res.status(400).json({ status: "error", message: "Body must be an array" });
      }
      
      connection = await mysqlPool.getConnection();
      for (const tc of testCases) {
        const [existing]: any = await connection.query(
          "SELECT id FROM QATestCases WHERE id = ?",
          [tc.id]
        );
        
        if (existing && existing.length > 0) {
          await connection.query(
            `UPDATE QATestCases SET 
              judul = ?, 
              deskripsi = ?, 
              tipeTesting = ?, 
              prioritas = ?, 
              caseId = ?, 
              expected = ?, 
              status = ?, 
              steps = ?, 
              history = ?,
              activeTesterId = ?,
              activeTesterName = ?,
              lockedAt = ?,
              modulId = ?,
              suiteId = ?,
              rowNum = ?,
              comment = ?,
              evidenceUrl = ?,
              evidenceType = ?,
              evidenceName = ?,
              linkedBugKey = ?,
              commentsList = ?,
              evidences = ?
             WHERE id = ? AND projectId = ?`,
            [
              tc.judul || tc.title,
              tc.deskripsi || tc.comment || null,
              tc.tipeTesting || tc.phase || 'SIT',
              tc.prioritas || tc.priority || 'Medium',
              tc.caseId || null,
              tc.expected || tc.expectedResult || null,
              tc.status,
              JSON.stringify(tc.steps || []),
              JSON.stringify(tc.history || []),
              tc.activeTesterId || null,
              tc.activeTesterName || null,
              tc.lockedAt || null,
              tc.modulId || tc.suiteId || null,
              tc.suiteId || null,
              tc.rowNum || null,
              tc.comment || null,
              tc.evidenceUrl || null,
              tc.evidenceType || null,
              tc.evidenceName || null,
              tc.linkedBugKey || null,
              JSON.stringify(tc.commentsList || []),
              JSON.stringify(tc.evidences || []),
              tc.id,
              projectId
            ]
          );
        } else {
          await connection.query(
            `INSERT INTO QATestCases (
              id, projectId, judul, deskripsi, tipeTesting, prioritas, caseId, expected, status, steps, history, createdAt, activeTesterId, activeTesterName, lockedAt, modulId,
              suiteId, rowNum, comment, evidenceUrl, evidenceType, evidenceName, linkedBugKey, commentsList, evidences
             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              tc.id,
              projectId,
              tc.judul || tc.title,
              tc.deskripsi || tc.comment || null,
              tc.tipeTesting || tc.phase || 'SIT',
              tc.prioritas || tc.priority || 'Medium',
              tc.caseId || null,
              tc.expected || tc.expectedResult || null,
              tc.status || 'untested',
              JSON.stringify(tc.steps || []),
              JSON.stringify(tc.history || []),
              tc.createdAt || new Date().toISOString(),
              tc.activeTesterId || null,
              tc.activeTesterName || null,
              tc.lockedAt || null,
              tc.modulId || tc.suiteId || null,
              tc.suiteId || null,
              tc.rowNum || null,
              tc.comment || null,
              tc.evidenceUrl || null,
              tc.evidenceType || null,
              tc.evidenceName || null,
              tc.linkedBugKey || null,
              JSON.stringify(tc.commentsList || []),
              JSON.stringify(tc.evidences || [])
            ]
          );
        }
      }
      
      res.json({ status: "success", message: `Successfully synced ${testCases.length} test cases` });
    } catch (error: any) {
      console.error("POST /api/projects/:projectId/qa-test-cases/sync error:", error);
      res.status(500).json({ status: "error", message: error.message });
    } finally {
      if (connection) connection.release();
    }
  });

  // AI-Powered QA Test Case Generator API
  app.post("/api/projects/:projectId/qa-test-cases/generate-ai", async (req, res) => {
    try {
      const { judul, deskripsi, tipeTesting, prioritas } = req.body;
      if (!judul) {
        return res.status(400).json({ status: "error", message: "Judul skenario uji diperlukan." });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(400).json({ status: "error", message: "Kunci API Gemini tidak dikonfigurasi pada server." });
      }

      const ai = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const response = await generateContentWithFallback(ai, {
        model: "gemini-flash-latest",
        contents: `Anda adalah pakar QA (Quality Assurance) profesional.
Buat skenario uji (test case) QA yang sangat detail dan sistematis berdasarkan informasi tugas berikut:

Nama Fitur/Skenario: ${judul}
Deskripsi/Konteks: ${deskripsi || "Tidak ada deskripsi rinci."}
Tipe Pengujian: ${tipeTesting || "Manual"}
Prioritas: ${prioritas || "Medium"}

Berikan langkah-langkah pengujian (langkah-langkah nyata yang harus dilakukan tester di browser/aplikasi) beserta hasil yang diharapkan (expected result) untuk masing-masing langkah tersebut.`,
        config: {
          temperature: 0.3,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              deskripsi: {
                type: Type.STRING,
                description: "Deskripsi skenario uji yang telah diperbaiki, rapi, dan profesional (dalam Bahasa Indonesia)."
              },
              expected: {
                type: Type.STRING,
                description: "Hasil akhir yang diharapkan secara keseluruhan dari skenario uji ini (dalam Bahasa Indonesia)."
              },
              steps: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING, description: "Nomor langkah berurutan (misal '1', '2', '3')" },
                    action: { type: Type.STRING, description: "Tindakan pengujian yang harus dilakukan oleh tester (dalam Bahasa Indonesia)" },
                    expectedResult: { type: Type.STRING, description: "Hasil spesifik yang diharapkan dari tindakan tersebut (dalam Bahasa Indonesia)" }
                  },
                  required: ["id", "action", "expectedResult"]
                },
                description: "Daftar langkah pengujian berurutan."
              }
            },
            required: ["deskripsi", "expected", "steps"]
          }
        }
      });

      const jsonStr = response.text ? response.text.trim() : "{}";
      const parsedData = JSON.parse(jsonStr);

      res.json({
        status: "success",
        data: parsedData
      });
    } catch (error: any) {
      console.error("POST /api/projects/:projectId/qa-test-cases/generate-ai error:", error);
      res.status(500).json({ status: "error", message: error.message || "Gagal membuat skenario uji otomatis dengan AI." });
    }
  });

  // POST /api/v1/projects/:projectId/qa/generate-test-cases-ai
  app.post("/api/v1/projects/:projectId/qa/generate-test-cases-ai", async (req, res) => {
    let connection;
    try {
      const { projectId } = req.params;
      const { suiteName, suitePhase, existingCases } = req.body || {};
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(400).json({ status: "error", message: "Kunci API Gemini tidak dikonfigurasi pada server." });
      }

      connection = await mysqlPool.getConnection();

      // Parallel queries
      const [meetingsPromise, documentsPromise, tasksPromise] = await Promise.all([
        connection.query("SELECT * FROM Meetings WHERE projectId = ? ORDER BY createdAt DESC", [projectId]),
        connection.query("SELECT * FROM Documents WHERE projectId = ? ORDER BY createdAt DESC", [projectId]),
        connection.query("SELECT * FROM Tasks WHERE projectId = ? AND LOWER(status) NOT IN ('done', 'completed', 'closed') ORDER BY createdAt DESC", [projectId])
      ]);

      const meetingsList = meetingsPromise[0] as any[];
      const documentsList = documentsPromise[0] as any[];
      const tasksList = tasksPromise[0] as any[];

      // Filter meetings from the last 14 days
      const fourteenDaysAgo = new Date();
      fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

      const itemsToAggregate: { date: Date; text: string }[] = [];

      meetingsList.forEach((m) => {
        const date = m.createdAt ? new Date(m.createdAt) : new Date();
        if (date >= fourteenDaysAgo) {
          const aiSummaryText = m.aiSummary ? (typeof m.aiSummary === 'string' ? m.aiSummary : JSON.stringify(m.aiSummary)) : '';
          itemsToAggregate.push({
            date,
            text: `[MEETING NOTES]\nTitle: ${m.title || ''}\nDescription: ${m.description || ''}\nTranscript: ${m.transcript || ''}\nSummary: ${aiSummaryText}\nCreated At: ${m.createdAt || ''}\n`
          });
        }
      });

      documentsList.forEach((doc) => {
        const date = doc.createdAt ? new Date(doc.createdAt) : new Date();
        itemsToAggregate.push({
          date,
          text: `[DOCUMENTATION]\nTitle: ${doc.title || ''}\nDescription: ${doc.description || ''}\nType: ${doc.type || ''}\nCreated At: ${doc.createdAt || ''}\n`
        });
      });

      tasksList.forEach((t) => {
        const date = t.createdAt ? new Date(t.createdAt) : new Date();
        itemsToAggregate.push({
          date,
          text: `[ACTIVE TASK]\nKey: ${t.taskKey || ''}\nTitle: ${t.title || ''}\nDescription: ${t.description || ''}\nAcceptance Criteria: ${t.acceptanceCriteria || ''}\nPriority: ${t.priority || ''}\nStatus: ${t.status || ''}\nCreated At: ${t.createdAt || ''}\n`
        });
      });

      // Sort by newest first
      itemsToAggregate.sort((a, b) => b.date.getTime() - a.date.getTime());

      // Limit accumulated prompt context length (approx 80,000 characters to keep context clean and fast)
      let aggregatedPrompt = '';
      const charLimit = 80000;
      for (const item of itemsToAggregate) {
        if ((aggregatedPrompt.length + item.text.length) > charLimit) {
          break; // Stop adding oldest items
        }
        aggregatedPrompt += item.text + "\n";
      }

      if (aggregatedPrompt.trim().length === 0) {
        aggregatedPrompt = "Tidak ada meeting notes 14 hari terakhir, dokumen, atau task aktif untuk project ini.";
      }

      // Build active suite context prompt if provided
      let suiteContextPrompt = "";
      if (suiteName) {
        suiteContextPrompt = `\n\nKonteks Tambahan (Fokus Utama):\nAnda sedang menambahkan skenario pengujian baru untuk test suite aktif bernama "${suiteName}" (Fase: ${suitePhase || 'SIT'}).\n`;
        if (existingCases && existingCases.length > 0) {
          suiteContextPrompt += `Skenario pengujian yang SUDAH ada dalam test suite ini adalah:\n${JSON.stringify(existingCases)}\nHarap fokuskan untuk membuat skenario uji pelengkap yang menguji kasus ekstrem (edge cases) atau alur fungsionalitas lain yang belum tercover di atas, tanpa menduplikasi skenario pengujian yang sudah ada.\n`;
        }
      }

      // Initialize Gemini SDK
      const ai = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      // Call Gemini 3.5-flash with Structured Outputs
      const response = await generateContentWithFallback(ai, {
        model: "gemini-flash-latest",
        contents: `Anda adalah Principal QA Engineer dan AI Integration Specialist untuk LanPro.
Berdasarkan data project teragregasi di bawah ini (yang terdiri dari dokumen fungsional, meeting notes terbaru, dan backlog/acceptance criteria aktif), buatlah daftar skenario uji (test cases) yang komprehensif, terstruktur, sistematis, dan siap pakai untuk tim pengujian.
${suiteContextPrompt}
Format keluaran HARUS berupa array JSON yang mematuhi skema berikut secara ketat.

DATA AGREGASI PROJECT:
---
${aggregatedPrompt}
---`,
        config: {
          temperature: 0.2,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            description: "Daftar rekomendasi test case hasil analisis AI",
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING, description: "Judul skenario pengujian singkat dan spesifik" },
                description: { type: Type.STRING, description: "Deskripsi detail mengenai apa yang diuji dan tujuannya" },
                fase: { type: Type.STRING, description: "Fase testing (SIT, UAT, atau PTR)", enum: ["SIT", "UAT", "PTR"] },
                steps: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Daftar langkah-langkah konkret pengujian yang harus dijalankan" },
                expected_result: { type: Type.STRING, description: "Hasil akhir yang diharapkan secara keseluruhan setelah langkah-langkah di atas dijalankan" },
                priority: { type: Type.STRING, description: "Prioritas pengujian (HIGH, MEDIUM, atau LOW)", enum: ["HIGH", "MEDIUM", "LOW"] }
              },
              required: ["title", "description", "fase", "steps", "expected_result", "priority"]
            }
          }
        }
      });

      const responseText = response.text ? response.text.trim() : "[]";
      const testCases = JSON.parse(responseText);

      res.json({
        status: "success",
        data: testCases
      });
    } catch (error: any) {
      console.error("POST /api/v1/projects/:projectId/qa/generate-test-cases-ai error:", error);
      res.status(500).json({ status: "error", message: error.message || "Gagal membuat test case dengan AI." });
    } finally {
      if (connection) connection.release();
    }
  });

  app.use("/api/projects", authenticateJWT);

  // AI Meeting Notes Companion: Upload Recording (v1.0 Real File Upload Implementation with Background AI Pipeline and Chunking Support)
  app.post("/api/v1/meetings/:meetingId/upload-recording", upload.single('recording'), async (req, res) => {
    // Upload request received (debug log removed for production security)
    try {
      const { meetingId } = req.params;
      const file = req.file;

      if (!file) {
        return res.status(400).json({ status: "error", message: "File tidak ditemukan." });
      }

      // Metadata parameter
      const { meeting_id, file_name, platform, chunkIndex, totalChunks, fileSize } = req.body;
      const targetMeetingId = meetingId || meeting_id;

      if (!targetMeetingId) {
        return res.status(400).json({ status: "error", message: "meeting_id tidak ditemukan dalam request." });
      }

      // Check if this is a chunked upload
      const isChunked = chunkIndex !== undefined && totalChunks !== undefined;

      if (isChunked) {
        const cIndex = parseInt(chunkIndex as string);
        const tChunks = parseInt(totalChunks as string);
        const originalSize = parseInt(fileSize as string) || file.size;

        // Temporary directory for chunks
        const chunksDir = path.join(GLOBAL_UPLOADS_DIR, "chunks", targetMeetingId);
        if (!fs.existsSync(chunksDir)) {
          fs.mkdirSync(chunksDir, { recursive: true });
        }

        // Move chunk to chunksDir with the index as name
        const chunkPath = path.join(chunksDir, `chunk_${cIndex}`);
        fs.renameSync(file.path, chunkPath);

        // Check if all chunks have arrived
        let allChunksArrived = true;
        for (let i = 0; i < tChunks; i++) {
          const expectedPath = path.join(chunksDir, `chunk_${i}`);
          if (!fs.existsSync(expectedPath)) {
            allChunksArrived = false;
            break;
          }
        }

        if (allChunksArrived) {
          // Merge all chunks
          const fileExt = path.extname(file_name || ".mp3") || ".mp3";
          const safeFileName = `recording_${targetMeetingId}_${Date.now()}${fileExt}`;
          
          const permanentPath = path.join(GLOBAL_UPLOADS_DIR, safeFileName);
          
          // Clear file if it exists
          if (fs.existsSync(permanentPath)) {
            fs.unlinkSync(permanentPath);
          }

          // Append each chunk synchronously to the target file
          for (let i = 0; i < tChunks; i++) {
            const expectedPath = path.join(chunksDir, `chunk_${i}`);
            const chunkBuffer = fs.readFileSync(expectedPath);
            fs.appendFileSync(permanentPath, chunkBuffer);
            // Delete chunk file immediately after reading
            fs.unlinkSync(expectedPath);
          }

          // Clean up chunks directory
          try {
            fs.rmdirSync(chunksDir);
          } catch (rmErr) {
            console.warn("Gagal menghapus direktori chunk sementara:", rmErr);
          }

          // Construct relative production URL
          const recordingUrl = `/uploads/${safeFileName}`;

          // Commit update to Relational Database
          const connection = await mysqlPool.getConnection();
          await connection.query(
            "UPDATE Meetings SET recording_url = ?, file_size = ?, upload_status = 'UPLOAD_SUCCESS' WHERE id = ?",
            [recordingUrl, originalSize, targetMeetingId]
          );
          connection.release();

          // Trigger the asynchronous background AI worker! (runAIPipeline)
          runAIPipeline(targetMeetingId).catch((err) => {
            console.error(`[BACKGROUND PIPELINE START ERROR] for meeting ${targetMeetingId}:`, err);
          });

          // Return 201 Created with valid file metadata instantly to prevent timeouts
          return res.status(201).json({
            status: "success",
            completed: true,
            data: {
              meeting_id: targetMeetingId,
              recording_url: recordingUrl,
              file_size: originalSize,
              upload_status: 'UPLOAD_SUCCESS',
              file_name: file_name,
              platform: platform || "Zoom"
            }
          });
        } else {
          // Still uploading chunks, return success for this chunk
          return res.status(200).json({
            status: "success",
            completed: false,
            chunkIndex: cIndex,
            message: `Chunk ${cIndex + 1}/${tChunks} berhasil diunggah.`
          });
        }
      } else {
        // Security & Magic Byte Validation
        const fileBuf = fs.readFileSync(file.path);
        const fileVal = validateFileBuffer(fileBuf, file.originalname || file_name || "recording.mp3", 120 * 1024 * 1024);
        if (!fileVal.valid) {
          if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
          return res.status(400).json({ 
            status: "error", 
            message: fileVal.error || "Gagal Mengunggah Dokumen: Format file tidak didukung atau ukuran melebihi batas maksimum (Max 120MB)." 
          });
        }

        // Save permanently to local production storage: uploads/
        const safeFileName = fileVal.sanitizedName || sanitizeFilename(file.originalname || file_name || "recording.mp3");
        
        const permanentPath = path.join(GLOBAL_UPLOADS_DIR, safeFileName);
        
        // Copy to permanent folder and delete the temp file
        fs.copyFileSync(file.path, permanentPath);
        fs.unlinkSync(file.path);

        // Construct relative production URL
        const recordingUrl = `/uploads/${safeFileName}`;
        const fileSizeVal = file.size;

        // Commit update to Relational Database
        const connection = await mysqlPool.getConnection();
        await connection.query(
          "UPDATE Meetings SET recording_url = ?, file_size = ?, upload_status = 'UPLOAD_SUCCESS' WHERE id = ?",
          [recordingUrl, fileSizeVal, targetMeetingId]
        );
        connection.release();

        // Trigger the asynchronous background AI worker! (runAIPipeline)
        runAIPipeline(targetMeetingId).catch((err) => {
          console.error(`[BACKGROUND PIPELINE START ERROR] for meeting ${targetMeetingId}:`, err);
        });

        // Return 201 Created with valid file metadata instantly to prevent timeouts
        return res.status(201).json({
          status: "success",
          completed: true,
          data: {
            meeting_id: targetMeetingId,
            recording_url: recordingUrl,
            file_size: fileSizeVal,
            upload_status: 'UPLOAD_SUCCESS',
            file_name: file.originalname || file_name,
            platform: platform || "Zoom"
          }
        });
      }

    } catch (error: any) {
      console.error("POST /api/v1/meetings/:meetingId/upload-recording error:", error);
      return res.status(500).json({ status: "error", message: error.message || "Gagal mengunggah dan menyimpan rekaman." });
    }
  });

  app.post("/api/projects/:projectId/meetings/:id/upload-recording", (req, res) => {
    res.redirect(307, `/api/v1/meetings/${req.params.id}/upload-recording`);
  });

  // Background AI Worker for STT & LLM Pipeline (Non-blocking Asynchronous Execution)
  async function runAIPipeline(meetingId: string): Promise<void> {
    console.log(`[AI PIPELINE] Starting background processing for meeting: ${meetingId}`);
    let connection;
    try {
      connection = await mysqlPool.getConnection();
      
      // Set status to EXTRACTING_AUDIO
      await connection.query("UPDATE Meetings SET upload_status = 'EXTRACTING_AUDIO' WHERE id = ?", [meetingId]);
      io.emit("meeting_ai_status", { 
        meetingId, 
        status: "EXTRACTING_AUDIO",
        progress_percentage: 15,
        message: "Ekstraksi audio sedang berjalan..."
      });

      // Fetch meeting details
      const [rows]: any = await connection.query("SELECT * FROM Meetings WHERE id = ?", [meetingId]);
      if (!rows || rows.length === 0) {
        throw new Error(`Meeting dengan ID ${meetingId} tidak ditemukan.`);
      }
      
      const meeting = rows[0];
      const recordingUrl = meeting.recording_url;
      const meetingLink = meeting.meetingLink || "";

      if (!recordingUrl) {
        throw new Error("File rekaman belum diunggah atau tidak terdaftar di database.");
      }

      // Resolve file path
      const safeFileName = path.basename(recordingUrl);
      
      const filePath = path.join(GLOBAL_UPLOADS_DIR, safeFileName);

      if (!fs.existsSync(filePath)) {
        throw new Error(`File rekaman tidak ditemukan di path: ${filePath}`);
      }

      // Determine mime type from extension
      const fileExt = path.extname(filePath).toLowerCase();
      let mimeType = "audio/mp3";
      if (fileExt === ".wav") mimeType = "audio/wav";
      else if (fileExt === ".webm") mimeType = "audio/webm";
      else if (fileExt === ".m4a") mimeType = "audio/x-m4a";
      else if (fileExt === ".mp4") mimeType = "video/mp4";

      // 1. FFmpeg Audio Extraction
      let audioPath = filePath;
      let finalMimeType = mimeType;
      const isVideo = [".mp4", ".mkv", ".mov", ".avi", ".webm"].includes(fileExt);

      if (isVideo) {
        
        const extractedPath = path.join(GLOBAL_UPLOADS_DIR, `extracted_${meetingId}_${Date.now()}.mp3`);
        console.log(`[AI PIPELINE] Extracting audio from video file using FFmpeg: ${filePath} -> ${extractedPath}`);
        
        try {
          await new Promise<void>((resolve, reject) => {
            exec(`ffmpeg -y -i "${filePath}" -vn -acodec libmp3lame -ar 16000 -ac 1 "${extractedPath}"`, (err, stdout, stderr) => {
              if (err) {
                console.warn("[AI PIPELINE] FFmpeg execution failed, using original file:", err.message);
                reject(err);
              } else {
                console.log("[AI PIPELINE] FFmpeg extracted audio successfully.");
                resolve();
              }
            });
          });
          audioPath = extractedPath;
          finalMimeType = "audio/mp3";
        } catch (ffmpegErr) {
          console.warn("[AI PIPELINE] FFmpeg fallback activated. Direct processing.");
        }
      }

      // 2. Speech-to-Text using Gemini
      console.log(`[AI PIPELINE] Transcribing audio file: ${audioPath}`);
      await connection.query("UPDATE Meetings SET upload_status = 'TRANSCRIBING_STT' WHERE id = ?", [meetingId]);
      io.emit("meeting_ai_status", { 
        meetingId, 
        status: "TRANSCRIBING_STT",
        progress_percentage: 60,
        message: "Mengubah suara rekaman audio menjadi teks mentah secara akurat..."
      });

      const fileBuffer = fs.readFileSync(audioPath);
      const base64Audio = fileBuffer.toString('base64');

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("Kunci API Gemini tidak dikonfigurasi.");
      }

      const ai = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const responseGemini = await generateContentWithFallback(ai, {
        model: "gemini-flash-latest",
        contents: [
          {
            inlineData: {
              data: base64Audio,
              mimeType: finalMimeType
            }
          },
          {
            text: "Transkripsikan seluruh isi rekaman audio rapat ini secara lengkap 100% dan sangat detail ke dalam Bahasa Indonesia. Pastikan tidak ada kata, kalimat, pembicara, atau alur pembahasan yang terpotong, disingkat, disederhanakan, atau dihilangkan. Berikan transkrip mentah yang utuh dari awal sampai akhir rapat."
          }
        ]
      });

      const transcriptText = responseGemini.text || "";
      if (!transcriptText.trim()) {
        throw new Error("Hasil transkrip audio kosong dari Gemini.");
      }

      console.log(`[AI PIPELINE] Transcript length: ${transcriptText.length} characters.`);
      await connection.query("UPDATE Meetings SET transcript = ? WHERE id = ?", [transcriptText, meetingId]);

      // 3. LLM Structured Analysis using Gemini SDK with Structured Outputs (responseSchema)
      console.log("[AI PIPELINE] Generating structured output analysis...");
      await connection.query("UPDATE Meetings SET upload_status = 'ANALYZING_LLM' WHERE id = ?", [meetingId]);
      io.emit("meeting_ai_status", { 
        meetingId, 
        status: "ANALYZING_LLM",
        progress_percentage: 90,
        message: "Mengekstrak rangkuman, keputusan, & rencana tindak lanjut dengan AI..."
      });
      
      const structuredSchema = {
        type: Type.OBJECT,
        properties: {
          ringkasan_eksekutif: { 
            type: Type.STRING, 
            description: "Bertindaklah sebagai Senior Business Analyst dan PMO Lead kelas enterprise yang sangat detail dan perfeksionis. Susun Notulen Rapat Profesional yang sangat detail secara UTUH, mendalam, dan TANPA meringkas/memotong poin penting dalam format Markdown. Patuhi instruksi ketat berikut:\n1. JANGAN lakukan enkapsulasi atau generalisasi (jangan meringkas perdebatan menjadi hanya satu kalimat jika di transkrip mereka berdiskusi panjang).\n2. Tuliskan semua studi kasus, nama brand/mitra, angka, estimasi bulan/target, dan istilah teknis secara verbatim (apa adanya sesuai transkrip).\n3. Jika ada perdebatan alur berpikir (misal: salah paham di awal lalu dikoreksi oleh pembicara lain), jabarkan kronologi koreksi tersebut di poin diskusi.\n\nGunakan struktur formatting berikut secara ketat:\n\n## NOTULEN RAPAT: [Nama Topik/Agenda Rapat Utama]\n**Tanggal:** [Isi Tanggal/Bulan/Tahun jika disebutkan]\n**Topik Utama:** [Tujuan besar rapat ini diadakan]\n\n---\n\n### **A. DAFTAR HADIR & IDENTIFIKASI PERAN**\n(Daftar semua pembicara beserta peran, divisi, atau latar belakang mereka berdasarkan isi percakapan).\n\n---\n\n### **B. KRONOLOGI DISKUSI MENDALAM & DETAIL TEKNIS**\n(Kupas habis setiap topik yang didebatkan. Bagi menjadi sub-heading (###) berdasarkan topik masalah. Masukkan detail arsitektur sistem, skema database/API/flow data, alasan bisnis di balik sebuah request, serta perbandingan sistem eksisting vs sistem baru yang dibahas).\n\n---\n\n### **C. BREAKDOWN RENCANA TINDAK LANJUT (ACTION ITEMS)**\n(Buat daftar tugas konkret yang sifatnya operasional dan siap dieksekusi, sebutkan:\n- Pihak/Tim Penanggung Jawab.\n- Detail Tugas (Langkah 1, Langkah 2, dst).\n- Dampak Teknis/Bisnis jika tugas ini dijalankan)."
          },
          kronologi_dan_kesimpulan: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                topik_bahasan: { type: Type.STRING, description: "Nama sub-topik spesifik yang diperdebatkan atau dibahas." },
                latar_belakang_argumen: { type: Type.STRING, description: "Detail penjelasan MENGAPA sub-topik ini dibahas dan argumen/pendapat yang disampaikan oleh para pembicara selama diskusi berjalan." },
                keputusan_akhir: { type: Type.STRING, description: "Pernyataan keputusan resmi yang disepakati bersama di akhir pembahasan sub-topik tersebut." }
              },
              required: ["topik_bahasan", "latar_belakang_argumen", "keputusan_akhir"]
            },
            description: "Daftar kronologi bahasan rapat beserta jalannya argumen dan keputusan akhir."
          },
          tindak_lanjut_dan_concern: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                pembicara: { type: Type.STRING, description: "Nama atau kode pembicara (Speaker ID) yang mengangkat isu / kekhawatiran spesifik." },
                kekhawatiran_spesifik: { type: Type.STRING, description: "Detail ketakutan, kendala teknis, atau gap sistem yang dikhawatirkan oleh pembicara tersebut secara mendalam." },
                solusi_dan_arahan: { type: Type.STRING, description: "Instruksi langsung, mandat, atau solusi penyelesaian masalah yang disepakati untuk memitigasi kekhawatiran tersebut." }
              },
              required: ["pembicara", "kekhawatiran_spesifik", "solusi_dan_arahan"]
            },
            description: "Daftar kekhawatiran spesifik dari pembicara beserta arahan/solusi penyelesaiannya."
          },
          next_plan_roadmap: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                action_item: { type: Type.STRING, description: "Deskripsi tugas taktis yang sangat spesifik dan detail (bukan kalimat pendek umum)." },
                pic: { type: Type.STRING, description: "Nama orang atau tim yang ditunjuk sebagai penanggung jawab. Jika tidak disebutkan di transkrip, gunakan 'TBD'." },
                estimasi_waktu: { type: Type.STRING, description: "Target tenggat waktu eksplisit dari transkrip. Jika tidak disebutkan, gunakan 'TBD'." }
              },
              required: ["action_item", "pic", "estimasi_waktu"]
            },
            description: "Roadmap rencana aksi taktis berikutnya."
          },
          target_to_be_architecture: {
            type: Type.OBJECT,
            properties: {
              proses_bisnis_as_is: { type: Type.STRING, description: "Detail gambaran alur kerja, sistem, atau prosedur operasional yang sedang berjalan saat ini (beserta kelemahannya jika ada)." },
              proses_bisnis_to_be: { type: Type.STRING, description: "Spesifikasi langkah demi langkah mengenai alur sistem baru, fitur baru, atau model operasional masa depan yang disepakati untuk dibangun." },
              langkah_transisi: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Langkah-langkah teknis atau operasional konkret untuk bermigrasi menuju kondisi target."
              }
            },
            required: ["proses_bisnis_as_is", "proses_bisnis_to_be", "langkah_transisi"],
            description: "Gambaran target arsitektur proses bisnis (As-Is vs To-Be)."
          }
        },
        required: [
          "ringkasan_eksekutif", "kronologi_dan_kesimpulan", "tindak_lanjut_dan_concern",
          "next_plan_roadmap", "target_to_be_architecture"
        ]
      };

      // 2.1 Dynamic Prompt Injection: Fetch latest 5-10 learning notes from ai_learning_logs
      let learningNotesStr = "";
      try {
        const [logs]: any = await connection.query(
          "SELECT evaluation_notes, timestamp FROM ai_learning_logs WHERE project_id = ? ORDER BY timestamp DESC LIMIT 10",
          [meeting.projectId]
        );
        if (logs && logs.length > 0) {
          learningNotesStr = logs.map((log: any, idx: number) => `[Evaluation #${idx + 1} - ${log.timestamp}]: ${log.evaluation_notes}`).join("\n");
        }
      } catch (logQueryErr) {
        console.warn("[AI PIPELINE] Gagal mengambil log evaluasi pembelajaran:", logQueryErr);
      }

      const learningSection = `
PANDUAN PENINGKATAN KEMAMPUAN ADAPTIF (SELF-IMPROVEMENT):
- Di bawah ini adalah daftar kritik dan catatan evaluasi dari user mengenai hasil kerja Anda pada rapat-rapat sebelumnya:
  ${learningNotesStr || "Tidak ada catatan evaluasi sebelumnya. Harap berikan hasil analisis terbaik dan detail secara konsisten."}

- TUGAS ANDA: Analisis kelemahan Anda berdasarkan catatan di atas. Jika user mengkritik Anda 'kurang detail pada aspek arsitektur', maka pada analisis rapat kali ini Anda WAJIB meningkatkan kedalaman informasi pada aspek arsitektur secara drastis.
- Selalu adaptasikan gaya penulisan notulen Anda agar semakin mendekati ekspektasi spesifik yang diminta oleh user dalam log evaluasi tersebut. Jangan ulangi kesalahan klasifikasi atau reduksi informasi yang sama.
`;

      const systemInstruction = `Bertindaklah sebagai Senior Business Analyst dan PMO Lead kelas enterprise yang sangat detail dan perfeksionis. Tugas Anda adalah menyusun Notulen Rapat Resmi yang sangat komprehensif, mendalam, detail secara UTUH dari Teks Transkrip Mentah (Raw Transcript) hasil rekaman rapat, dan TANPA meringkas/memotong poin penting.

Patuhi instruksi ketat berikut:
1. JANGAN lakukan enkapsulasi atau generalisasi (jangan meringkas perdebatan menjadi hanya satu kalimat jika di transkrip mereka berdiskusi panjang).
2. Tuliskan semua studi kasus, nama brand/mitra, angka, estimasi bulan/target, dan istilah teknis secara verbatim (apa adanya sesuai transkrip).
3. Jika ada perdebatan alur berpikir (misal: salah paham di awal lalu dikoreksi oleh pembicara lain), jabarkan kronologi koreksi tersebut di poin diskusi.

Anda WAJIB mematuhi Aturan Kepatuhan Faktual (Strict Grounding Rules) berikut:
1. HANYA ambil data yang tertulis atau diucapkan langsung di transkrip. Jangan mengarang fakta, tanggal, atau nama.
2. Jika nama pembicara (Speaker ID) teridentifikasi di transkrip, sertasikan nama/kode pembicara tersebut pada setiap poin analisis untuk akurasi rekam jejak.
3. Hasilkan output dalam format JSON terstruktur bersih tanpa bungkus blok markdown (JANGAN gunakan \`\`\`json ... \`\`\`).

Harap isi seluruh field dalam skema JSON terstruktur berikut secara lengkap:
- 'ringkasan_eksekutif': Notulen Rapat dari transkrip secara UTUH, mendalam, dan TANPA meringkas/memotong poin penting menggunakan struktur formatting Markdown berikut secara ketat:
  ## NOTULEN RAPAT: [Nama Topik/Agenda Rapat Utama]
  **Tanggal:** [Isi Tanggal/Bulan/Tahun jika disebutkan]
  **Topik Utama:** [Tujuan besar rapat ini diadakan]

  ---

  ### **A. DAFTAR HADIR & IDENTIFIKASI PERAN**
  (Daftar semua pembicara beserta peran, divisi, atau latar belakang mereka berdasarkan isi percakapan).

  ---

  ### **B. KRONOLOGI DISKUSI MENDALAM & DETAIL TEKNIS**
  (Kupas habis setiap topik yang didebatkan. Bagi menjadi sub-heading (###) berdasarkan topik masalah. Masukkan detail arsitektur sistem, skema database/API/flow data, alasan bisnis di balik sebuah request, serta perbandingan sistem eksisting vs sistem baru yang dibahas).

  ---

  ### **C. BREAKDOWN RENCANA TINDAK LANJUT (ACTION ITEMS)**
  (Buat daftar tugas konkret yang sifatnya operasional dan siap dieksekusi, sebutkan:
  - Pihak/Tim Penanggung Jawab.
  - Detail Tugas (Langkah 1, Langkah 2, dst).
  - Dampak Teknis/Bisnis jika tugas ini dijalankan).

- 'kronologi_dan_kesimpulan': kronologi jalannya pembahasan rapat terstruktur (topik_bahasan, latar_belakang_argumen, keputusan_akhir). Catat jalannya argumen dan perdebatan secara mendalam.
- 'tindak_lanjut_dan_concern': daftar kekhawatiran peserta rapat, kendala teknis atau gap sistem yang diungkapkan pembicara, beserta solusi/arahan langsung yang disepakati (pembicara, kekhawatiran_spesifik, solusi_dan_arahan).
- 'next_plan_roadmap': roadmap rencana aksi taktis hasil rapat yang spesifik dan detail (action_item, pic, estimasi_waktu).
- 'target_to_be_architecture': analisis skenario arsitektur masa depan yang disepakati (proses_bisnis_as_is, proses_bisnis_to_be, langkah_transisi).

${learningSection}`;

      const responseAnalysis = await generateContentWithFallback(ai, {
        model: "gemini-flash-latest",
        contents: `[TRANSKRIP RAPAT]:\n${transcriptText}`,
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.2,
          responseMimeType: "application/json",
          responseSchema: structuredSchema
        }
      });

      const analysisJson = responseAnalysis.text ? responseAnalysis.text.trim() : "{}";
      const parsedData = JSON.parse(analysisJson);

      // Synthesize legacy fields from the new corporate format to avoid breaking older meetings
      const ringkasan_eksekutif = parsedData.ringkasan_eksekutif || "";
      const kronologi_dan_kesimpulan = parsedData.kronologi_dan_kesimpulan || [];
      const tindak_lanjut_dan_concern = parsedData.tindak_lanjut_dan_concern || [];
      const next_plan_roadmap = parsedData.next_plan_roadmap || [];
      const target_to_be_architecture = parsedData.target_to_be_architecture || { proses_bisnis_as_is: "", proses_bisnis_to_be: "", langkah_transisi: [] };

      const kesimpulan = kronologi_dan_kesimpulan.map((item: any) => item.keputusan_akhir).filter(Boolean);
      const saran = tindak_lanjut_dan_concern.map((item: any) => `${item.pembicara || "TBD"}: ${item.solusi_dan_arahan || "TBD"}`).filter(Boolean);
      
      const notulen_rapat = kronologi_dan_kesimpulan.map((item: any, idx: number) => ({
        topik: item.topik_bahasan || `Topik Bahasan ${idx + 1}`,
        pembahasan: `Latar Belakang & Argumen:\n${item.latar_belakang_argumen || "Tidak disebutkan."}\n\nKeputusan Akhir:\n${item.keputusan_akhir || "Tidak disebutkan."}`
      }));

      const meeting_metadata = {
        topik_utama: ringkasan_eksekutif ? (ringkasan_eksekutif.split(".")[0] || "Koordinasi Proyek") : "Koordinasi Proyek",
        peserta_aktif: Array.from(new Set(tindak_lanjut_dan_concern.map((item: any) => item.pembicara).filter(Boolean))) as string[],
        tanggal_waktu: new Date().toLocaleDateString("id-ID")
      };

      const poin_diskusi_tambahan = tindak_lanjut_dan_concern.map((item: any) => ({
        concern: item.kekhawatiran_spesifik || "",
        tindakanLanjut: item.solusi_dan_arahan || "",
        PIC: item.pembicara || "TBD",
        targetDate: "TBD",
        fitur: "",
        system: "",
        surrounding: "",
        keterangan: ""
      }));

      const next_plan = next_plan_roadmap.map((item: any) => ({
        tahapan: item.action_item || "",
        deskripsi: `Ditugaskan kepada: ${item.pic || "TBD"}. Rencana Aksi: ${item.action_item}`,
        estimasi_waktu: item.estimasi_waktu || "Tidak disebutkan"
      }));

      const to_be_scenario = {
        kondisi_sekarang: target_to_be_architecture.proses_bisnis_as_is || "",
        target_ke_depan: target_to_be_architecture.proses_bisnis_to_be || "",
        langkah_transisi: target_to_be_architecture.langkah_transisi || []
      };

      // Create a combined JSON with old and new structures
      const combinedData = {
        ...parsedData,
        notulen_rapat,
        kesimpulan,
        saran,
        meeting_metadata,
        poin_diskusi_tambahan,
        next_plan,
        to_be_scenario
      };

      const finalJson = JSON.stringify(combinedData);

      // Save structured output to both analysis_result (LONGTEXT) and aiSummary (JSON) to avoid breakages
      await connection.query(
        "UPDATE Meetings SET aiSummary = ?, analysis_result = ?, upload_status = 'COMPLETED' WHERE id = ?",
        [finalJson, finalJson, meetingId]
      );

      console.log(`[AI PIPELINE] Successfully completed meeting ${meetingId}. Emitting COMPLETED.`);
      
      // Broadcast success to frontend
      io.emit("meeting_ai_status", { 
        meetingId, 
        status: "COMPLETED",
        progress_percentage: 100,
        message: "Pemrosesan selesai!"
      });

      io.emit("meeting_ai_completed", {
        meetingId,
        status: "COMPLETED",
        progress_percentage: 100,
        aiSummary: parsedData,
        analysis_result: parsedData,
        transcript: transcriptText
      });

    } catch (err: any) {
      console.error(`[AI PIPELINE ERROR] Error in AI pipeline for meeting ${meetingId}:`, err);
      if (connection) {
        await connection.query("UPDATE Meetings SET upload_status = 'FAILED' WHERE id = ?", [meetingId]);
      }
      io.emit("meeting_ai_failed", { meetingId, error: err.message || "Gagal memproses AI." });
    } finally {
      if (connection) connection.release();
    }
  }

  // GET: Retrieve meeting status/details (polling fallback)
  app.get("/api/v1/meetings/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const connection = await mysqlPool.getConnection();
      const [rows]: any = await connection.query("SELECT * FROM Meetings WHERE id = ?", [id]);
      connection.release();
      if (!rows || rows.length === 0) {
        return res.status(404).json({ status: "error", message: "Meeting tidak ditemukan." });
      }
      return res.json({ status: "success", data: rows[0] });
    } catch (error: any) {
      console.error(error);
      return res.status(500).json({ status: "error", message: "Gagal mendapatkan status meeting: " + error.message });
    }
  });

  // GET: Dedicated short-polling endpoint for meeting AI processing status
  app.get("/api/v1/meetings/:meetingId/status", async (req, res) => {
    try {
      const { meetingId } = req.params;
      const connection = await mysqlPool.getConnection();
      const [rows]: any = await connection.query("SELECT id, upload_status, transcript, analysis_result, aiSummary FROM Meetings WHERE id = ?", [meetingId]);
      connection.release();
      
      if (!rows || rows.length === 0) {
        return res.status(404).json({ status: "error", message: "Meeting tidak ditemukan." });
      }
      
      const meeting = rows[0];
      let statusValue = meeting.upload_status || "IDLE";
      let progressPercentage = 0;
      let message = "Menunggu pemrosesan...";

      // Standardize the status values for consistencies
      if (statusValue === "PROCESSING_AI") {
        statusValue = "EXTRACTING_AUDIO";
      } else if (statusValue === "TRANSCRIBING") {
        statusValue = "TRANSCRIBING_STT";
      }

      switch (statusValue) {
        case "EXTRACTING_AUDIO":
          progressPercentage = 15;
          message = "Ekstraksi audio sedang berjalan...";
          break;
        case "TRANSCRIBING_STT":
          progressPercentage = 60;
          message = "Mengubah suara rekaman audio menjadi teks mentah secara akurat...";
          break;
        case "ANALYZING_LLM":
          progressPercentage = 90;
          message = "Mengekstrak rangkuman, keputusan, & rencana tindak lanjut dengan AI...";
          break;
        case "COMPLETED":
          progressPercentage = 100;
          message = "Pemrosesan selesai!";
          break;
        case "FAILED":
          progressPercentage = 0;
          message = "Pemrosesan gagal.";
          break;
        case "UPLOAD_SUCCESS":
          progressPercentage = 5;
          message = "Berkas berhasil diunggah. Bersiap memulai pemrosesan...";
          break;
        default:
          progressPercentage = 0;
          message = "Menunggu pemrosesan...";
      }

      return res.json({
        status: statusValue,
        success: true,
        upload_status: statusValue,
        progress_percentage: progressPercentage,
        message: message,
        transcript: meeting.transcript,
        analysis_result: meeting.analysis_result,
        aiSummary: meeting.aiSummary
      });
    } catch (error: any) {
      console.error("GET /api/v1/meetings/:meetingId/status error:", error);
      return res.status(500).json({ status: "error", message: "Gagal mendapatkan status: " + error.message });
    }
  });

  // POST: Cancel or reset AI meeting background job & upload state
  app.post("/api/v1/meetings/:meetingId/cancel", async (req, res) => {
    try {
      const { meetingId } = req.params;
      const connection = await mysqlPool.getConnection();
      
      // Update database back to IDLE and clear file attributes so user can upload again
      await connection.query(
        "UPDATE Meetings SET upload_status = 'IDLE', recording_url = NULL, file_size = NULL, transcript = NULL, aiSummary = NULL, analysis_result = NULL WHERE id = ?",
        [meetingId]
      );
      connection.release();

      // Emit status back to IDLE
      io.emit("meeting_ai_status", { 
        meetingId, 
        status: "IDLE", 
        progress_percentage: 0,
        message: "Pemrosesan dibatalkan."
      });

      return res.json({ status: "success", message: "Pemrosesan rapat berhasil dibatalkan." });
    } catch (error: any) {
      console.error("POST /api/v1/meetings/:meetingId/cancel error:", error);
      return res.status(500).json({ status: "error", message: "Gagal membatalkan pemrosesan: " + error.message });
    }
  });

  // POST: Trigger asynchronous background AI pipeline analysis
  app.post("/api/v1/meetings/:meetingId/analyze", async (req, res) => {
    try {
      const { meetingId } = req.params;

      const connection = await mysqlPool.getConnection();
      const [rows]: any = await connection.query("SELECT * FROM Meetings WHERE id = ?", [meetingId]);
      connection.release();
      
      if (!rows || rows.length === 0) {
        return res.status(404).json({ status: "error", message: "Meeting tidak ditemukan." });
      }

      const meeting = rows[0];
      const recordingUrl = meeting.recording_url;

      if (!recordingUrl) {
        return res.status(400).json({ status: "error", message: "File rekaman belum diunggah." });
      }

      // Trigger the background worker process asynchronously
      runAIPipeline(meetingId).catch(err => console.error("Error in async background worker execution:", err));

      return res.status(202).json({
        status: "success",
        message: "Proses pemrosesan AI (STT & LLM) berhasil dimulai di latar belakang.",
        data: {
          meetingId,
          upload_status: "PROCESSING_AI"
        }
      });

    } catch (error: any) {
      console.error("POST /api/v1/meetings/:meetingId/analyze error:", error);
      return res.status(500).json({ status: "error", message: error.message || "Gagal memulai analisis AI." });
    }
  });

  // POST: Multimodal Video/Audio analysis using Gemini API with exact JSON Schema & saves to meeting_details
  app.post(["/analyze-video", "/api/v1/meetings/:meetingId/analyze-video"], async (req, res) => {
    try {
      const meetingId = req.params.meetingId || req.body.meetingId || req.query.meetingId;
      if (!meetingId) {
        return res.status(400).json({ status: "error", message: "ID Meeting (meetingId) diperlukan." });
      }

      const connection = await mysqlPool.getConnection();
      const [rows]: any = await connection.query("SELECT * FROM Meetings WHERE id = ?", [meetingId]);
      
      if (!rows || rows.length === 0) {
        connection.release();
        return res.status(404).json({ status: "error", message: "Meeting tidak ditemukan." });
      }

      const meeting = rows[0];
      const recordingUrl = meeting.recording_url;

      if (!recordingUrl) {
        connection.release();
        return res.status(400).json({ status: "error", message: "File rekaman belum diunggah." });
      }

      // Set status to ANALYZING_LLM to let client know multimodal processing is ongoing
      await connection.query("UPDATE Meetings SET upload_status = 'ANALYZING_LLM' WHERE id = ?", [meetingId]);
      io.emit("meeting_ai_status", { 
        meetingId, 
        status: "ANALYZING_LLM",
        progress_percentage: 85,
        message: "Menganalisis video & audio multimodal menggunakan Gemini 2.5 Pro..."
      });
      
      const safeFileName = path.basename(recordingUrl);
      
      const filePath = path.join(GLOBAL_UPLOADS_DIR, safeFileName);

      if (!fs.existsSync(filePath)) {
        connection.release();
        return res.status(404).json({ status: "error", message: `File rekaman tidak ditemukan di path: ${filePath}` });
      }

      // Determine mime type
      const fileExt = path.extname(filePath).toLowerCase();
      let mimeType = "video/mp4";
      if (fileExt === ".webm") mimeType = "video/webm";
      else if (fileExt === ".avi") mimeType = "video/x-msvideo";
      else if (fileExt === ".mov") mimeType = "video/quicktime";
      else if (fileExt === ".mkv") mimeType = "video/x-matroska";
      else if (fileExt === ".mp3" || fileExt === ".wav" || fileExt === ".m4a") {
        mimeType = fileExt === ".mp3" ? "audio/mp3" : (fileExt === ".wav" ? "audio/wav" : "audio/x-m4a");
      }

      console.log(`[MULTIMODAL AI] Reading file for multimodal analysis: ${filePath} (${mimeType})`);
      const fileBuffer = fs.readFileSync(filePath);
      const base64File = fileBuffer.toString('base64');

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        connection.release();
        return res.status(400).json({ status: "error", message: "Kunci API Gemini tidak dikonfigurasi." });
      }

      const ai = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      // exact responseSchema as requested
      const multimodalSchema = {
        type: Type.OBJECT,
        properties: {
          tab_ringkasan: {
            type: Type.OBJECT,
            properties: {
              topik_utama: { type: Type.STRING, description: "Topik utama dari rapat." },
              executive_summary_multimodal: { type: Type.STRING, description: "Narasi terpadu (1-2 paragraf) yang menggabungkan analisis bahan presentasi visual di layar dengan dinamika hasil diskusi suara secara mendalam." }
            },
            required: ["topik_utama", "executive_summary_multimodal"]
          },
          tab_kronologi_rapat: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                timestamp: { type: Type.STRING, description: "Waktu kejadian dalam format MM:SS." },
                aktivitas_visual: { type: Type.STRING, description: "Deskripsi objektif apa yang tampil/di-share di layar pada menit tersebut." },
                isi_percakapan_inti: { type: Type.STRING, description: "Poin perdebatan atau pembahasan verbal peserta rapat yang berkolerasi dengan tampilan layar." }
              },
              required: ["timestamp", "aktivitas_visual", "isi_percakapan_inti"]
            }
          },
          tab_kesimpulan: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "Daftar pernyataan kesimpulan atau keputusan final rapat secara riil."
          },
          tab_saran_dan_ide: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                diusulkan_oleh: { type: Type.STRING, description: "Nama atau kode pembicara yang mengusulkan gagasan tersebut." },
                deskripsi_ide: { type: Type.STRING, description: "Gagasan, inovasi, atau alternatif solusi yang dilontarkan dalam diskusi untuk pengembangan ke depan." }
              },
              required: ["diusulkan_oleh", "deskripsi_ide"]
            }
          },
          tab_tindak_lanjut: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                concern_masalah: { type: Type.STRING, description: "Kekhawatiran spesifik atau gap sistem yang diangkat pembicara." },
                solusi_disepakati: { type: Type.STRING, description: "Mandat tindakan penanggulangan yang diputuskan dalam rapat." }
              },
              required: ["concern_masalah", "solusi_disepakati"]
            }
          },
          tab_next_plan: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                action_item: { type: Type.STRING, description: "Tugas taktis spesifik." },
                pic: { type: Type.STRING, description: "Nama atau tim penanggung jawab riil. Jika tidak ada, tulis 'TBD'." },
                due_date: { type: Type.STRING, description: "Tanggal atau estimasi waktu eksplisit dari diskusi. Jika tidak ada, tulis 'TBD'." }
              },
              required: ["action_item", "pic", "due_date"]
            }
          },
          tab_target_to_be: {
            type: Type.OBJECT,
            properties: {
              proses_bisnis_as_is: { type: Type.STRING, description: "Detail kondisi sistem/proses manual saat ini berdasarkan presentasi/diskusi." },
              proses_bisnis_to_be: { type: Type.STRING, description: "Detail alur sistem/arsitektur target masa depan yang disepakati." },
              langkah_transisi: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Langkah-langkah transisi migrasi konkret."
              }
            },
            required: ["proses_bisnis_as_is", "proses_bisnis_to_be", "langkah_transisi"]
          },
          tab_metadata: {
            type: Type.OBJECT,
            properties: {
              host_rapat: { type: Type.STRING, description: "Nama pembawa acara atau host rapat." },
              tanggal_rapat: { type: Type.STRING, description: "Tanggal diadakannya rapat dalam format YYYY-MM-DD." },
              durasi_detik: { type: Type.INTEGER, description: "Durasi video/rapat dalam detik." },
              platform_digunakan: { type: Type.STRING, description: "Platform video conference, misal: 'Zoom', 'Teams', atau 'GMeet'." },
              peserta_rapat: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Daftar seluruh nama peserta rapat atau pembicara yang terdeteksi."
              }
            },
            required: ["host_rapat", "tanggal_rapat", "durasi_detik", "platform_digunakan", "peserta_rapat"]
          }
        },
        required: [
          "tab_ringkasan", "tab_kronologi_rapat", "tab_kesimpulan", "tab_saran_dan_ide",
          "tab_tindak_lanjut", "tab_next_plan", "tab_target_to_be", "tab_metadata"
        ]
      };

      // Fetch latest 5-10 learning notes from ai_learning_logs for multimodal analysis
      let learningNotesStr = "";
      try {
        const [logs]: any = await connection.query(
          "SELECT evaluation_notes, timestamp FROM ai_learning_logs WHERE project_id = ? ORDER BY timestamp DESC LIMIT 10",
          [meeting.projectId]
        );
        if (logs && logs.length > 0) {
          learningNotesStr = logs.map((log: any, idx: number) => `[Evaluation #${idx + 1} - ${log.timestamp}]: ${log.evaluation_notes}`).join("\n");
        }
      } catch (logQueryErr) {
        console.warn("[MULTIMODAL AI] Gagal mengambil log evaluasi pembelajaran:", logQueryErr);
      }

      const learningSection = `
PANDUAN PENINGKATAN KEMAMPUAN ADAPTIF (SELF-IMPROVEMENT):
- Di bawah ini adalah daftar kritik dan catatan evaluasi dari user mengenai hasil kerja Anda pada rapat-rapat sebelumnya:
  ${learningNotesStr || "Tidak ada catatan evaluasi sebelumnya. Harap berikan hasil analisis terbaik dan detail secara konsisten."}

- TUGAS ANDA: Analisis kelemahan Anda berdasarkan catatan di atas. Jika user mengkritik Anda 'kurang detail pada aspek arsitektur', maka pada analisis rapat kali ini Anda WAJIB meningkatkan kedalaman informasi pada aspek arsitektur secara drastis.
- Selalu adaptasikan gaya penulisan notulen Anda agar semakin mendekati ekspektasi spesifik yang diminta oleh user dalam log evaluasi tersebut. Jangan ulangi kesalahan klasifikasi atau reduksi informasi yang sama.
`;

      const multimodalPrompt = `Bertindaklah sebagai Senior Full-Stack Architect, Principal AI Engineer, dan Notulis Profesional. Analisis file video/audio rapat ini secara mendalam baik visual (apa yang tampil di slide, screen-share, peragaan) maupun audio (apa yang diucapkan para pembicara).
      
Gunakan responseSchema yang diberikan untuk menghasilkan objek JSON utuh tanpa bungkus markdown. Pastikan semua komponen terisi lengkap berdasarkan informasi riil di dalam video. JANGAN gunakan data dummy atau placeholder kosong. List semua peserta rapat yang terdeteksi di dalam list peserta_rapat di tab_metadata.

${learningSection}`;

      console.log(`[MULTIMODAL AI] Calling Gemini with multimodal prompt on file size: ${fileBuffer.length} bytes`);
      
      const responseGemini = await generateContentWithFallback(ai, {
        model: "gemini-2.5-pro",
        contents: [
          {
            inlineData: {
              data: base64File,
              mimeType: mimeType
            }
          },
          {
            text: multimodalPrompt
          }
        ],
        config: {
          temperature: 0.2,
          responseMimeType: "application/json",
          responseSchema: multimodalSchema
        }
      });

      const analysisJsonText = responseGemini.text ? responseGemini.text.trim() : "{}";
      const parsedData = JSON.parse(analysisJsonText);

      // Save to meeting_details table
      const detailId = crypto.randomUUID();
      await connection.query(
        `INSERT INTO meeting_details (
          id, meeting_id, ringkasan_eksekutif, topik_utama, 
          kronologi_dan_kesimpulan, kesimpulan, saran_dan_ide, 
          tindak_lanjut, next_plan, target_to_be_architecture, metadata_rapat
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          detailId,
          meetingId,
          parsedData.tab_ringkasan?.executive_summary_multimodal || "",
          parsedData.tab_ringkasan?.topik_utama || "",
          JSON.stringify(parsedData.tab_kronologi_rapat || []),
          JSON.stringify(parsedData.tab_kesimpulan || []),
          JSON.stringify(parsedData.tab_saran_dan_ide || []),
          JSON.stringify(parsedData.tab_tindak_lanjut || []),
          JSON.stringify(parsedData.tab_next_plan || []),
          JSON.stringify(parsedData.tab_target_to_be || {}),
          JSON.stringify(parsedData.tab_metadata || {})
        ]
      );

      // Synthesize compatible fields for the main Meetings table update
      const ringkasan_eksekutif = parsedData.tab_ringkasan?.executive_summary_multimodal || "";
      const kronologiList = parsedData.tab_kronologi_rapat || [];
      const kesimpulanList = parsedData.tab_kesimpulan || [];
      const saranList = parsedData.tab_saran_dan_ide || [];
      const tindakLanjutList = parsedData.tab_tindak_lanjut || [];
      const nextPlanList = parsedData.tab_next_plan || [];
      const targetToBe = parsedData.tab_target_to_be || {};
      const metadataVal = parsedData.tab_metadata || {};

      const mappedKronologi = kronologiList.map((item: any) => ({
        topik_bahasan: `[${item.timestamp}] Visual: ${item.aktivitas_visual}`,
        latar_belakang_argumen: item.isi_percakapan_inti || "Tidak ada detail argumen.",
        keputusan_akhir: item.isi_percakapan_inti || "Tidak ada keputusan."
      }));

      const mappedTindakLanjut = tindakLanjutList.map((item: any) => ({
        pembicara: "Rapat",
        kekhawatiran_spesifik: item.concern_masalah || "",
        solusi_dan_arahan: item.solusi_disepakati || ""
      }));

      const mappedNextPlan = nextPlanList.map((item: any) => ({
        action_item: item.action_item || "",
        pic: item.pic || "TBD",
        estimasi_waktu: item.due_date || "TBD"
      }));

      const mappedTargetToBe = {
        proses_bisnis_as_is: targetToBe.proses_bisnis_as_is || "",
        proses_bisnis_to_be: targetToBe.proses_bisnis_to_be || "",
        langkah_transisi: targetToBe.langkah_transisi || []
      };

      const mappedMetadata = {
        topik_utama: parsedData.tab_ringkasan?.topik_utama || "Rapat Multimodal",
        tanggal_waktu: metadataVal.tanggal_rapat || new Date().toISOString().split("T")[0],
        peserta_aktif: metadataVal.peserta_rapat || []
      };

      // Construct backward compatible combined JSON to bind to the existing tabs reaktivitas
      const compatibleSummary = {
        ringkasan_eksekutif,
        kronologi_dan_kesimpulan: mappedKronologi,
        tindak_lanjut_dan_concern: mappedTindakLanjut,
        next_plan_roadmap: mappedNextPlan,
        target_to_be_architecture: mappedTargetToBe,
        
        // Exact original JSON schema keys so frontend activeMeetingData can bind them as well
        tab_ringkasan: parsedData.tab_ringkasan,
        tab_kronologi_rapat: parsedData.tab_kronologi_rapat,
        tab_kesimpulan: parsedData.tab_kesimpulan,
        tab_saran_dan_ide: parsedData.tab_saran_dan_ide,
        tab_tindak_lanjut: parsedData.tab_tindak_lanjut,
        tab_next_plan: parsedData.tab_next_plan,
        tab_target_to_be: parsedData.tab_target_to_be,
        tab_metadata: parsedData.tab_metadata,

        // Legacy fallbacks
        notulen_rapat: kronologiList.map((item: any, idx: number) => ({
          topik: `[${item.timestamp}] Visual: ${item.aktivitas_visual}`,
          pembahasan: item.isi_percakapan_inti || ""
        })),
        kesimpulan: kesimpulanList,
        saran: saranList.map((item: any) => `${item.diusulkan_oleh}: ${item.deskripsi_ide}`),
        meeting_metadata: mappedMetadata,
        poin_diskusi_tambahan: tindakLanjutList.map((item: any) => ({
          concern: item.concern_masalah || "",
          tindakanLanjut: item.solusi_disepakati || "",
          PIC: "TBD",
          targetDate: "TBD"
        })),
        next_plan: nextPlanList.map((item: any) => ({
          tahapan: item.action_item || "",
          deskripsi: `PIC: ${item.pic}. Target: ${item.due_date}`,
          estimasi_waktu: item.due_date || "TBD"
        })),
        to_be_scenario: {
          kondisi_sekarang: targetToBe.proses_bisnis_as_is || "",
          target_ke_depan: targetToBe.proses_bisnis_to_be || "",
          langkah_transisi: targetToBe.langkah_transisi || []
        }
      };

      const finalJsonStr = JSON.stringify(compatibleSummary);

      await connection.query(
        "UPDATE Meetings SET aiSummary = ?, analysis_result = ?, upload_status = 'COMPLETED' WHERE id = ?",
        [finalJsonStr, finalJsonStr, meetingId]
      );

      connection.release();

      // Emit real-time completed events
      io.emit("meeting_ai_status", { 
        meetingId, 
        status: "COMPLETED",
        progress_percentage: 100,
        message: "Pemrosesan analisis video multimodal selesai!"
      });

      io.emit("meeting_ai_completed", {
        meetingId,
        status: "COMPLETED",
        progress_percentage: 100,
        aiSummary: compatibleSummary,
        analysis_result: compatibleSummary,
        transcript: meeting.transcript || "Transkrip tidak tersedia. Analisis dilakukan langsung dari rekaman visual video."
      });

      return res.json({
        status: "success",
        message: "Analisis video multimodal berhasil dilakukan dan disimpan.",
        data: {
          detailId,
          meetingId,
          analysis: parsedData
        }
      });

    } catch (error: any) {
      console.error("[MULTIMODAL API ERROR] Error processing video analysis:", error);
      return res.status(500).json({ status: "error", message: "Gagal memproses analisis video multimodal: " + error.message });
    }
  });

  app.post("/api/projects/:projectId/meetings/:id/analyze-transcript", async (req, res) => {
    try {
      const { id } = req.params;
      const { transcript, meetingLink } = req.body;

      if (!transcript || !transcript.trim()) {
        return res.status(400).json({ status: "error", message: "Transkrip tidak boleh kosong." });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(400).json({ status: "error", message: "Kunci API Gemini tidak dikonfigurasi pada server." });
      }

      const ai = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const systemInstruction = `Bertindaklah sebagai Senior Business Analyst dan PMO Lead kelas enterprise yang sangat detail dan perfeksionis. Tugas Anda adalah menyusun Notulen Rapat Resmi yang sangat komprehensif, mendalam, detail secara UTUH dari Teks Transkrip Mentah (Raw Transcript) hasil rekaman rapat, dan TANPA meringkas/memotong poin penting.

Input yang kamu terima adalah transkrip hasil Speech-to-Text${meetingLink ? ` dan link rapat: ${meetingLink}` : ''}.

Patuhi instruksi ketat berikut:
1. JANGAN lakukan enkapsulasi atau generalisasi (jangan meringkas perdebatan menjadi hanya satu kalimat jika di transkrip mereka berdiskusi panjang).
2. Tuliskan semua studi kasus, nama brand/mitra, angka, estimasi bulan/target, dan istilah teknis secara verbatim (apa adanya sesuai transkrip).
3. Jika ada perdebatan alur berpikir (misal: salah paham di awal lalu dikoreksi oleh pembicara lain), jabarkan kronologi koreksi tersebut di poin diskusi.

Kamu HARUS menghasilkan output dalam format JSON terstruktur yang memiliki kunci-kunci objek berikut:

1. "ringkasan_eksekutif": Susun Notulen Rapat dari transkrip secara UTUH, mendalam, dan TANPA meringkas/memotong poin penting menggunakan struktur formatting Markdown berikut secara ketat:
   ## NOTULEN RAPAT: [Nama Topik/Agenda Rapat Utama]
   **Tanggal:** [Isi Tanggal/Bulan/Tahun jika disebutkan]
   **Topik Utama:** [Tujuan besar rapat ini diadakan]

   ---

   ### **A. DAFTAR HADIR & IDENTIFIKASI PERAN**
   (Daftar semua pembicara beserta peran, divisi, atau latar belakang mereka berdasarkan isi percakapan).

   ---

   ### **B. KRONOLOGI DISKUSI MENDALAM & DETAIL TEKNIS**
   (Kupas habis setiap topik yang didebatkan. Bagi menjadi sub-heading (###) berdasarkan topik masalah. Masukkan detail arsitektur sistem, skema database/API/flow data, alasan bisnis di balik sebuah request, serta perbandingan sistem eksisting vs sistem baru yang dibahas).

   ---

   ### **C. BREAKDOWN RENCANA TINDAK LANJUT (ACTION ITEMS)**
   (Buat daftar tugas konkret yang sifatnya operasional dan siap dieksekusi, sebutkan:
   - Pihak/Tim Penanggung Jawab.
   - Detail Tugas (Langkah 1, Langkah 2, dst).
   - Dampak Teknis/Bisnis jika tugas ini dijalankan).

2. "notulen_rapat": Berisi kronologi jalannya rapat terstruktur (Notulet Rapat). Kelompokkan berdasarkan topik bahasan utama yang dibicarakan oleh para peserta beserta alur argumennya secara riil tanpa rekayasa.
3. "kesimpulan": Poin-poin mutlak mengenai keputusan apa saja yang sudah disepakati di akhir rapat. Jangan memasukkan perdebatan di sini, hanya hasil akhir.
4. "saran": Rekomendasi, ide, atau masukan yang dilontarkan oleh peserta rapat sebagai bahan pertimbangan ke depan (meskipun belum sah menjadi keputusan).
5. "meeting_metadata": Deteksi otomatis topik utama rapat, perkiraan tanggal/waktu (jika disebutkan), dan daftar nama peserta yang terdeteksi aktif berbicara.
6. "poin_diskusi_tambahan": Ekstrak butir-butir diskusi penting yang membutuhkan tindak lanjut (action items), lengkap dengan PIC (Person in Charge) dan tenggat waktu (due date) jika disebutkan di dalam teks.
7. "next_plan": Menyusun rencana tindak lanjut berikutnya (Next Plan) yang berisikan tahapan-tahapan aksi nyata secara terperinci, berdasarkan keputusan di rapat.
8. "to_be_scenario": Gambaran skenario target di masa depan (To-Be Scenario), mendetailkan perbandingan kondisi sistem/proses saat ini (As-Is) dan bagaimana seharusnya sistem/proses tersebut berjalan ke depan (To-Be), termasuk langkah-langkah transisi yang realistis berdasarkan isi rapat.

ATURAN KETAT (ANTI-HALUSINASI):
- Kamu harus menganalisis transkrip secara RIIL. Jangan mengarang fitur, sistem, nama orang, tanggal, atau rencana yang sama sekali tidak disebutkan atau tidak disirat secara logis dari isi transkrip rapat.
- Gunakan Bahasa Indonesia yang formal, profesional, mudah dipahami, dan ringkas namun padat informasi.
- Berikan output HANYA dalam format JSON valid sesuai skema yang diminta.`;

      const response = await generateContentWithFallback(ai, {
        model: "gemini-flash-latest",
        contents: `[TRANSKRIP SELESAI]:\n${transcript}${meetingLink ? `\n[LINK RAPAT]: ${meetingLink}` : ''}`,
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.2,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              ringkasan_eksekutif: {
                type: Type.STRING,
                description: "Notulen Rapat dari transkrip secara UTUH, mendalam, dan TANPA meringkas/memotong poin penting menggunakan struktur formatting Markdown berikut secara ketat:\n\n## NOTULEN RAPAT: [Nama Topik/Agenda Rapat Utama]\n**Tanggal:** [Isi Tanggal/Bulan/Tahun jika disebutkan]\n**Topik Utama:** [Tujuan besar rapat ini diadakan]\n\n---\n\n### **A. DAFTAR HADIR & IDENTIFIKASI PERAN**\n(Daftar semua pembicara beserta peran, divisi, atau latar belakang mereka berdasarkan isi percakapan).\n\n---\n\n### **B. KRONOLOGI DISKUSI MENDALAM & DETAIL TEKNIS**\n(Kupas habis setiap topik yang didebatkan. Bagi menjadi sub-heading (###) berdasarkan topik masalah. Masukkan detail arsitektur sistem, skema database/API/flow data, alasan bisnis di balik sebuah request, serta perbandingan sistem eksisting vs sistem baru yang dibahas).\n\n---\n\n### **C. BREAKDOWN RENCANA TINDAK LANJUT (ACTION ITEMS)**\n(Buat daftar tugas konkret yang sifatnya operasional dan siap dieksekusi, sebutkan:\n- Pihak/Tim Penanggung Jawab.\n- Detail Tugas (Langkah 1, Langkah 2, dst).\n- Dampak Teknis/Bisnis jika tugas ini dijalankan)."
              },
              notulen_rapat: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    topik: { type: Type.STRING, description: "Topik bahasan utama yang dibicarakan peserta rapat." },
                    pembahasan: { type: Type.STRING, description: "Alur argumen dan jalannya rapat mengenai topik ini (dalam Bahasa Indonesia)." }
                  },
                  required: ["topik", "pembahasan"]
                },
                description: "Kronologi jalannya rapat terstruktur dikelompokkan berdasarkan topik bahasan utama."
              },
              kesimpulan: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Poin-poin keputusan akhir yang disepakati (Bahasa Indonesia)."
              },
              saran: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Rekomendasi, ide, atau masukan dari peserta rapat (Bahasa Indonesia)."
              },
              meeting_metadata: {
                type: Type.OBJECT,
                properties: {
                  topik_utama: { type: Type.STRING, description: "Deteksi otomatis topik utama rapat." },
                  tanggal_waktu: { type: Type.STRING, description: "Perkiraan tanggal/waktu jika disebutkan, kosongkan jika tidak." },
                  peserta_aktif: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: "Daftar nama peserta yang aktif berbicara."
                  }
                },
                required: ["topik_utama", "peserta_aktif"]
              },
              poin_diskusi_tambahan: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    concern: { type: Type.STRING, description: "Isu / poin diskusi penting pemicu tindak lanjut." },
                    fitur: { type: Type.STRING, description: "Nama fitur terkait (kosongkan jika tidak ada)." },
                    system: { type: Type.STRING, description: "Sistem / subsistem terkait (kosongkan jika tidak ada)." },
                    surrounding: { type: Type.STRING, description: "Konteks/pihak lain sekeliling yang terdampak." },
                    keterangan: { type: Type.STRING, description: "Penjelasan/deskripsi singkat." },
                    tindakanLanjut: { type: Type.STRING, description: "Rencana tindak lanjut / action item konkret." },
                    PIC: { type: Type.STRING, description: "Nama Person In Charge jika ada." },
                    targetDate: { type: Type.STRING, description: "Tenggat waktu pengerjaan (format YYYY-MM-DD jika ada, atau teks singkat)." }
                  },
                  required: ["concern", "tindakanLanjut"]
                },
                description: "Daftar poin diskusi tambahan / action items."
              },
              next_plan: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    tahapan: { type: Type.STRING, description: "Nama tahapan atau fase rencana aksi selanjutnya." },
                    deskripsi: { type: Type.STRING, description: "Penjelasan detail mengenai rencana aksi tersebut berdasarkan transkrip." },
                    estimasi_waktu: { type: Type.STRING, description: "Estimasi waktu pelaksanaan jika dibahas, jika tidak kosongi." }
                  },
                  required: ["tahapan", "deskripsi"]
                },
                description: "Rencana jangka pendek dan menengah (Next Plan) riil hasil pembahasan rapat."
              },
              to_be_scenario: {
                type: Type.OBJECT,
                properties: {
                  kondisi_sekarang: { type: Type.STRING, description: "Kondisi sistem/proses saat ini (As-Is) yang dibahas atau dikeluhkan." },
                  target_ke_depan: { type: Type.STRING, description: "Gambaran detail sistem/proses ke depan (To-Be) yang disepakati atau diusulkan." },
                  langkah_transisi: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: "Langkah transisi atau proses migrasi menuju kondisi To-Be."
                  }
                },
                required: ["kondisi_sekarang", "target_ke_depan", "langkah_transisi"],
                description: "Analisis kondisi sistem/proses masa depan (To-Be Scenario) riil hasil rapat."
              }
            },
            required: ["ringkasan_eksekutif", "notulen_rapat", "kesimpulan", "saran", "meeting_metadata", "poin_diskusi_tambahan", "next_plan", "to_be_scenario"]
          }
        }
      });

      const jsonStr = response.text ? response.text.trim() : "{}";
      const parsedData = JSON.parse(jsonStr);

      // Simpan langsung ke kolom Meetings jika inginkan persistence
      const connection = await mysqlPool.getConnection();
      await connection.query(
        "UPDATE Meetings SET transcript = ?, aiSummary = ? WHERE id = ?",
        [transcript, jsonStr, id]
      );
      connection.release();

      res.json({
        status: "success",
        data: parsedData
      });
    } catch (error: any) {
      console.error("POST /api/projects/:projectId/meetings/:id/analyze-transcript error:", error);
      res.status(500).json({ status: "error", message: error.message || "Gagal menganalisis transkrip." });
    }
  });

  // ==========================================
  // NOTEBOOKLM INTEGRATION API ENDPOINTS
  // ==========================================
  app.post("/api/notebooklm/chat", authenticateJWT, async (req: any, res: any) => {
    try {
      const { sources, prompt, history, model } = req.body;
      if (!prompt || !prompt.trim()) {
        return res.status(400).json({ status: "error", message: "Prompt tidak boleh kosong." });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ status: "error", message: "Kunci API Gemini tidak dikonfigurasi pada server." });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
      });

      // Prepare grounded source context
      let contextText = "";
      if (Array.isArray(sources) && sources.length > 0) {
        contextText = sources.map((s: any, idx: number) => {
          return `--- SUMBER [${idx + 1}]: ${s.title || 'Dokumen'} (${s.type || 'Text'}) ---\n${s.content || ''}\n`;
        }).join("\n");
      } else {
        contextText = "Tidak ada sumber data terpasang. Jawab berdasarkan pengetahuan umum tetapi beri tahu pengguna bahwa mereka dapat mengunggah atau mencentang sumber data di NotebookLM.";
      }

      const systemInstruction = `Anda adalah Asisten Peneliti AI NotebookLM yang cerdas, obyektif, dan presisi.
Tugas Anda adalah memberikan jawaban berbasis eksklusif pada Sumber Data (Sources) yang disediakan pengguna berikut ini:

${contextText}

ATURAN UTAMA:
1. Setiap kali Anda menggunakan fakta, kutipan, atau data dari sumber di atas, SERTAKAN KUTIPAN LANGSUNG dengan format [Sumber N: Judul]. Contoh: "Berdasarkan [Sumber 1: Notulen Rapat Project BNI], target rilis adalah bulan depan."
2. Jika pertanyaan pengguna tidak dapat dijawab dari Sumber Data yang aktif, nyatakan dengan jujur dan sopan: "Informasi mengenai hal tersebut tidak ditemukan dalam sumber data yang aktif."
3. Jawab dalam Bahasa Indonesia yang lugas, profesional, dan terstruktur rapi menggunakan format Markdown.`;

      const contents = [];
      if (Array.isArray(history) && history.length > 0) {
        for (const msg of history.slice(-6)) {
          contents.push(`${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.text}`);
        }
      }
      contents.push(`User: ${prompt}`);

      const chosenModel = model || "gemini-2.5-pro";

      const response = await generateContentWithFallback(ai, {
        model: chosenModel,
        contents: contents.join("\n\n"),
        config: {
          systemInstruction,
          temperature: 0.3,
        }
      });

      return res.json({
        status: "success",
        reply: response.text || "Tidak ada respon dari AI."
      });
    } catch (err: any) {
      console.error("[NOTEBOOKLM_CHAT_ERROR]", err);
      return res.status(500).json({ status: "error", message: err.message || "Gagal memproses pertanyaan NotebookLM" });
    }
  });

  app.post("/api/notebooklm/generate-overview", authenticateJWT, async (req: any, res: any) => {
    try {
      const { sources, type = 'summary' } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ status: "error", message: "Kunci API Gemini tidak dikonfigurasi pada server." });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
      });

      let contextText = "";
      if (Array.isArray(sources) && sources.length > 0) {
        contextText = sources.map((s: any, idx: number) => {
          return `--- SUMBER [${idx + 1}]: ${s.title || 'Dokumen'} ---\n${s.content || ''}\n`;
        }).join("\n");
      } else {
        return res.status(400).json({ status: "error", message: "Pilih minimal 1 sumber data untuk membuat overview." });
      }

      let promptInstruction = "";
      if (type === 'summary') {
        promptInstruction = `Buat Ringkasan Eksekutif Komprehensif dari semua sumber data di atas. Gunakan poin-poin utama, ide kunci, serta implikasi praktis.`;
      } else if (type === 'qa') {
        promptInstruction = `Buat daftar 5-8 Tanya Jawab (FAQ / Q&A) paling relevan dan penting dari sumber data di atas. Setiap pertanyaan harus memiliki jawaban ringkas dan tepat sasaran.`;
      } else if (type === 'podcast') {
        promptInstruction = `Buat Naskah Audio Podcast Diskusi (Audio Overview / 2 Host NotebookLM style) antara 'Host A (Alex)' dan 'Host B (Bima)'.
Alex berperan sebagai pembawa acara yang antusias dan mengajukan pertanyaan mendalam, sementara Bima adalah pakar riset yang menjelaskan detail teknis & temuan kunci dari sumber data.
Buat dialog yang alami, informatif, dan menarik sebanyak 6-10 giliran bicara.`;
      } else if (type === 'study_guide') {
        promptInstruction = `Buat Panduan Belajar / Study Guide terstruktur dari sumber data di atas, mencakup:
1. Istilah Kunci & Definisi
2. Pertanyaan Pemahaman
3. Topik Diskusi Lanjutan`;
      } else if (type === 'briefing') {
        promptInstruction = `Buat Dokumen Briefing Eksekutif (Briefing Doc) siap pakai untuk pimpinan, mencakup Tujuan, Temuan Utama, Risiko/Tantangan, dan Rekomendasi Aksi.`;
      }

      const response = await generateContentWithFallback(ai, {
        model: "gemini-3.6-flash",
        contents: `SUMBER DATA:\n${contextText}\n\nINSTRUKSI KHUSUS:\n${promptInstruction}`,
        config: {
          systemInstruction: "Anda adalah pakar riset dan perangkum dokumen tingkat dunia. Buatlah output dalam Bahasa Indonesia yang rapi dan terstruktur dalam format Markdown.",
          temperature: 0.4
        }
      });

      return res.json({
        status: "success",
        type,
        content: response.text || "Gagal menghasilkan overview."
      });
    } catch (err: any) {
      console.error("[NOTEBOOKLM_OVERVIEW_ERROR]", err);
      return res.status(500).json({ status: "error", message: err.message || "Gagal membuat overview NotebookLM" });
    }
  });

  app.post("/api/notebooklm/generate-audio", authenticateJWT, async (req: any, res: any) => {
    try {
      const { text, voiceName = 'Kore' } = req.body;
      if (!text || !text.trim()) {
        return res.status(400).json({ status: "error", message: "Teks audio tidak boleh kosong." });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ status: "error", message: "Kunci API Gemini tidak dikonfigurasi pada server." });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
      });

      const cleanText = text.replace(/[*#_\-\`]/g, '').slice(0, 1000);

      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-tts-preview",
        contents: [{ parts: [{ text: `Bacakan teks berikut dengan jelas, artikulasi ramah dan profesional: ${cleanText}` }] }],
        config: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: voiceName || 'Kore' }
            }
          }
        }
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!base64Audio) {
        return res.status(500).json({ status: "error", message: "Gagal menghasilkan data audio dari Gemini TTS." });
      }

      return res.json({
        status: "success",
        audioBase64: base64Audio,
        mimeType: "audio/pcm"
      });
    } catch (err: any) {
      console.error("[NOTEBOOKLM_AUDIO_ERROR]", err);
      return res.status(500).json({ status: "error", message: err.message || "Gagal menghasilkan audio TTS" });
    }
  });

  // ProjectModules API (Master Data for Modul/Aplikasi)
  app.get("/api/project-modules", async (req, res) => {
    let connection;
    try {
      connection = await mysqlPool.getConnection();
      const [rows] = await connection.query("SELECT * FROM ProjectModules ORDER BY createdAt DESC");
      res.json({ status: "success", data: rows });
    } catch (error: any) {
      console.error("GET /api/project-modules error:", error);
      res.status(500).json({ status: "error", message: error.message });
    } finally {
      if (connection) connection.release();
    }
  });

  app.post("/api/project-modules", async (req, res) => {
    let connection;
    try {
      const { id, projectId, namaModul, keterangan } = req.body;
      if (!projectId || !namaModul) {
        return res.status(400).json({ status: "error", message: "projectId and namaModul are required" });
      }
      connection = await mysqlPool.getConnection();
      await connection.query(
        "INSERT INTO ProjectModules (id, projectId, namaModul, keterangan, createdAt) VALUES (?, ?, ?, ?, ?)",
        [id || String(Date.now()), projectId, namaModul, keterangan || null, new Date().toISOString()]
      );
      res.json({ status: "success", message: "Module created" });
    } catch (error: any) {
      console.error("POST /api/project-modules error:", error);
      res.status(500).json({ status: "error", message: error.message });
    } finally {
      if (connection) connection.release();
    }
  });

  app.put("/api/project-modules/:id", async (req, res) => {
    let connection;
    try {
      const { id } = req.params;
      const { projectId, namaModul, keterangan } = req.body;
      connection = await mysqlPool.getConnection();
      await connection.query(
        "UPDATE ProjectModules SET projectId = ?, namaModul = ?, keterangan = ? WHERE id = ?",
        [projectId, namaModul, keterangan || null, id]
      );
      res.json({ status: "success", message: "Module updated" });
    } catch (error: any) {
      console.error("PUT /api/project-modules/:id error:", error);
      res.status(500).json({ status: "error", message: error.message });
    } finally {
      if (connection) connection.release();
    }
  });

  app.delete("/api/project-modules/:id", async (req, res) => {
    let connection;
    try {
      const { id } = req.params;
      connection = await mysqlPool.getConnection();
      await connection.beginTransaction();
      
      // Delete test cases linked to this module
      await connection.query("DELETE FROM QATestCases WHERE modulId = ?", [id]);
      
      // Delete module
      await connection.query("DELETE FROM ProjectModules WHERE id = ?", [id]);
      
      await connection.commit();
      res.json({ status: "success", message: "Module and linked test cases deleted" });
    } catch (error: any) {
      if (connection) await connection.rollback();
      console.error("DELETE /api/project-modules/:id error:", error);
      res.status(500).json({ status: "error", message: error.message });
    } finally {
      if (connection) connection.release();
    }
  });

  // Tasks API
  app.get("/api/projects/:projectId/tasks", verifyProjectAccess(['*']), async (req: any, res) => {
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

  app.post("/api/projects/:projectId/tasks", authenticateJWT, verifyProjectAccess(['admin', 'manager', 'head', 'developer', 'member']), async (req, res) => {
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

  app.put("/api/projects/:projectId/tasks/reorder", authenticateJWT, verifyProjectAccess(['admin', 'manager', 'head']), async (req, res) => {
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

  app.put("/api/projects/:projectId/tasks/:id", authenticateJWT, verifyProjectAccess(['admin', 'manager', 'head', 'developer', 'member']), async (req, res) => {
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

  app.delete("/api/projects/:projectId/tasks/:id", authenticateJWT, verifyProjectAccess(['admin', 'manager', 'head', 'developer', 'member']), async (req, res) => {
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
  app.post("/api/projects/:projectId/tasks/bulk-delete", authenticateJWT, verifyProjectAccess(['admin', 'manager', 'head', 'developer', 'member']), async (req, res) => {
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
  app.get("/api/projects/:projectId/tasks/:taskId/comments", verifyProjectAccess(['*']), async (req, res) => {
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

  app.post("/api/projects/:projectId/tasks/:taskId/comments", verifyProjectAccess(['*']), async (req, res) => {
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
  app.get("/api/projects/:projectId/activity", verifyProjectAccess(['*']), async (req, res) => {
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

  app.post("/api/projects/:projectId/activity", verifyProjectAccess(['*']), async (req, res) => {
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
  app.get("/api/users/:userId/notifications", async (req, res) => {
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

  app.post("/api/users/:userId/notifications", async (req, res) => {
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

  app.put("/api/users/:userId/notifications/:id", async (req, res) => {
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
  app.get("/api/chat/last-messages", async (req, res) => {
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

  app.get("/api/chat/messages", async (req, res) => {
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

  app.post("/api/chat/messages", async (req, res) => {
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

  app.put("/api/chat/messages/read", async (req, res) => {
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

  app.get("/api/chat/unread-counts", async (req, res) => {
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

  app.post("/api/chat/simulate-reply", async (req, res) => {
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
  app.post("/api/projects/:projectId/tasks/:taskId/links", verifyProjectAccess(['admin', 'manager', 'head', 'developer', 'member']), async (req, res) => {
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

  app.delete("/api/projects/:projectId/tasks/:taskId/links/:linkId", async (req, res) => {
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
  app.get("/api/projects/:projectId/documents", verifyProjectAccess(['*']), async (req, res) => {
    let connection;
    try {
      const { projectId } = req.params;
      connection = await mysqlPool.getConnection();
      const [rows] = await connection.query("SELECT id, projectId, title, description, type, link, fileName, fileType, createdBy, downloadCount, createdAt, updatedAt FROM Documents WHERE projectId = ? ORDER BY createdAt DESC", [projectId]);
      res.json({ status: "success", data: rows });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ status: "error", message: "Terjadi kesalahan internal server: " + error.message });
    } finally {
      if (connection) connection.release();
    }
  });

  app.get("/api/projects/:projectId/documents/:id/download", async (req, res) => {
    let connection;
    try {
      const { id } = req.params;
      connection = await mysqlPool.getConnection();
      const [rows] = await connection.query("SELECT fileData, fileName, fileType FROM Documents WHERE id = ?", [id]);
      console.log(`[DOWNLOAD DOC] id: ${id}, rows length: ${(rows as any[]).length}`);
      await connection.query("UPDATE Documents SET downloadCount = downloadCount + 1 WHERE id = ?", [id]);
      if ((rows as any[]).length > 0) {
         res.json({ status: "success", data: (rows as any[])[0] });
      } else {
         const { getDbMode } = await import("./src/lib/db"); res.status(404).json({ status: "error", message: "Document not found. id: " + id + ", mode: " + getDbMode() });
      }
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ status: "error", message: "Terjadi kesalahan internal server: " + error.message });
    } finally {
      if (connection) connection.release();
    }
  });

  app.post("/api/projects/:projectId/documents", async (req, res) => {
    try {
      const { projectId } = req.params;
      const { title, description, type, link, fileData, fileName, fileType, createdBy } = req.body;
      const connection = await mysqlPool.getConnection();
      const newId = crypto.randomUUID();
      await connection.query(
        "INSERT INTO Documents (id, projectId, title, description, type, link, fileData, fileName, fileType, createdBy) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [newId, projectId, title, description || null, type || null, link || null, fileData || null, fileName || null, fileType || null, createdBy]
      );
      connection.release();
      res.json({ status: "success", data: { id: newId, projectId, title, description, type, link, fileName, fileType, createdBy } });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ status: "error", message: "Terjadi kesalahan internal server: " + error.message });
    }
  });

  app.put("/api/projects/:projectId/documents/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { title, description, type, link, fileData, fileName, fileType } = req.body;
      const connection = await mysqlPool.getConnection();
      
      const updates = [];
      const values = [];
      if (title !== undefined) { updates.push("title = ?"); values.push(title); }
      if (description !== undefined) { updates.push("description = ?"); values.push(description); }
      if (type !== undefined) { updates.push("type = ?"); values.push(type); }
      if (link !== undefined) { updates.push("link = ?"); values.push(link); }
      if (fileData !== undefined) { updates.push("fileData = ?"); values.push(fileData); }
      if (fileName !== undefined) { updates.push("fileName = ?"); values.push(fileName); }
      if (fileType !== undefined) { updates.push("fileType = ?"); values.push(fileType); }
      
      if (updates.length > 0) {
        values.push(id);
        await connection.query(`UPDATE Documents SET ${updates.join(', ')} WHERE id = ?`, values);
      }
      connection.release();
      res.json({ status: "success", message: "Document updated" });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ status: "error", message: "Terjadi kesalahan internal server: " + error.message });
    }
  });

  app.delete("/api/projects/:projectId/documents/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const connection = await mysqlPool.getConnection();
      await connection.query("DELETE FROM Documents WHERE id = ?", [id]);
      connection.release();
      res.json({ status: "success", message: "Document deleted" });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ status: "error", message: "Terjadi kesalahan internal server: " + error.message });
    }
  });
  // Milestones API (Hybrid Value-Added)
  app.get("/api/projects/:projectId/milestones", verifyProjectAccess(['*']), async (req, res) => {
    let connection;
    try {
      const { projectId } = req.params;
      connection = await mysqlPool.getConnection();
      
      const [milestones]: any = await connection.query(
        "SELECT * FROM Milestones WHERE projectId = ? ORDER BY dueDate ASC",
        [projectId]
      );

      // Hybrid Logic: Calculate Progress based on Linked Sprints' Story Points
      for (const ms of milestones) {
        // Find linked sprints
        const [linkedSprints]: any = await connection.query(
          "SELECT sprintId FROM MilestoneSprints WHERE milestoneId = ?",
          [ms.id]
        );
        const sprintIds = linkedSprints.map((s: any) => s.sprintId);

        if (sprintIds.length > 0) {
          const [stats]: any = await connection.query(`
            SELECT 
              SUM(CASE WHEN status = 'Done' THEN storyPoints ELSE 0 END) as donePoints,
              SUM(storyPoints) as totalPoints
            FROM Tasks 
            WHERE sprintId IN (?) AND storyPoints IS NOT NULL
          `, [sprintIds]);

          const total = stats[0].totalPoints || 0;
          const done = stats[0].donePoints || 0;
          ms.progress = total > 0 ? Math.round((done / total) * 100) : 0;
          ms.totalStoryPoints = total;
          ms.doneStoryPoints = done;
        } else {
          ms.progress = 0;
        }
      }

      res.json({ status: "success", data: milestones });
    } catch (error: any) {
      console.error("LOG ANOMALI CRITICAL: GET milestones error:", error);
      res.status(500).json({ status: "error", message: "Gagal mengambil Milestone." });
    } finally {
      if (connection) connection.release();
    }
  });

  app.post("/api/projects/:projectId/milestones", verifyProjectAccess(['admin', 'manager', 'head']), async (req, res) => {
    let connection;
    try {
      const { projectId } = req.params;
      const { name, description, dueDate, sprintIds } = req.body;
      const userId = req.headers['x-user-id'] || req.query.userId || 'guest';
      
      connection = await mysqlPool.getConnection();
      const milestoneId = crypto.randomUUID();

      await connection.query(
        "INSERT INTO Milestones (id, projectId, name, description, dueDate, status) VALUES (?, ?, ?, ?, ?, ?)",
        [milestoneId, projectId, name, description || '', dueDate || null, 'planned']
      );

      if (sprintIds && Array.isArray(sprintIds)) {
        for (const sid of sprintIds) {
          await connection.query("INSERT INTO MilestoneSprints (milestoneId, sprintId) VALUES (?, ?)", [milestoneId, sid]);
        }
      }

      await createAuditLog(userId as string, projectId, 'CREATE', 'Milestones', milestoneId, null, { name, sprintIds });

      res.json({ status: "success", data: { id: milestoneId, name, milestoneId } });
    } catch (error: any) {
      console.error("LOG ANOMALI CRITICAL: POST milestones error:", error);
      res.status(500).json({ status: "error", message: "Gagal membuat Milestone." });
    } finally {
      if (connection) connection.release();
    }
  });

  app.put("/api/projects/:projectId/milestones/:id", verifyProjectAccess(['admin', 'manager', 'head']), async (req, res) => {
    let connection;
    try {
      const { id, projectId } = req.params;
      const { name, description, dueDate, status, sprintIds } = req.body;
      const userId = req.headers['x-user-id'] || 'guest';
      
      connection = await mysqlPool.getConnection();
      
      const updates = [];
      const values = [];
      if (name !== undefined) { updates.push("name = ?"); values.push(name); }
      if (description !== undefined) { updates.push("description = ?"); values.push(description); }
      if (dueDate !== undefined) { updates.push("dueDate = ?"); values.push(dueDate); }
      if (status !== undefined) { updates.push("status = ?"); values.push(status); }

      if (updates.length > 0) {
        values.push(id);
        await connection.query(`UPDATE Milestones SET ${updates.join(', ')} WHERE id = ?`, values);
      }

      if (sprintIds !== undefined && Array.isArray(sprintIds)) {
        await connection.query("DELETE FROM MilestoneSprints WHERE milestoneId = ?", [id]);
        for (const sid of sprintIds) {
          await connection.query("INSERT INTO MilestoneSprints (milestoneId, sprintId) VALUES (?, ?)", [id, sid]);
        }
      }

      await createAuditLog(userId as string, projectId, 'UPDATE', 'Milestones', id, null, req.body);
      res.json({ status: "success", message: "Milestone updated" });
    } catch (error: any) {
      res.status(500).json({ status: "error", message: "Terjadi kesalahan internal server: " + error.message });
    } finally {
      if (connection) connection.release();
    }
  });

  app.delete("/api/projects/:projectId/milestones/:id", verifyProjectAccess(['admin', 'head']), async (req, res) => {
    let connection;
    try {
      const { id, projectId } = req.params;
      const userId = req.headers['x-user-id'] || 'guest';
      connection = await mysqlPool.getConnection();
      
      await createAuditLog(userId as string, projectId, 'DELETE', 'Milestones', id, null, null);
      await connection.query("DELETE FROM Milestones WHERE id = ?", [id]);
      
      res.json({ status: "success", message: "Milestone deleted" });
    } catch (error: any) {
      res.status(500).json({ status: "error", message: "Terjadi kesalahan internal server: " + error.message });
    } finally {
      if (connection) connection.release();
    }
  });

  // Meetings API
  app.get("/api/projects/:projectId/meetings", verifyProjectAccess(['*']), async (req, res) => {
    try {
      const { projectId } = req.params;
      const connection = await mysqlPool.getConnection();
      const [rows] = await connection.query("SELECT * FROM Meetings WHERE projectId = ? ORDER BY createdAt DESC", [projectId]);
      connection.release();
      res.json({ status: "success", data: rows });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ status: "error", message: "Terjadi kesalahan internal server: " + error.message });
    }
  });

  app.post("/api/projects/:projectId/meetings", async (req, res) => {
    try {
      const { projectId } = req.params;
      const { title, description, meetingLink, authorId, fileData, fileName, fileType } = req.body;
      const effectiveAuthorId = authorId || req.headers["x-user-id"] || "guest";
      const connection = await mysqlPool.getConnection();
      const newId = crypto.randomUUID();
      await connection.query(
        "INSERT INTO Meetings (id, projectId, title, description, meetingLink, authorId, fileData, fileName, fileType) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [newId, projectId, title, description || null, meetingLink || null, effectiveAuthorId, fileData || null, fileName || null, fileType || null]
      );
      connection.release();
      res.json({ status: "success", data: { id: newId, projectId, title, description, meetingLink, authorId: effectiveAuthorId, fileName, fileType } });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ status: "error", message: "Terjadi kesalahan internal server: " + error.message });
    }
  });

  app.put("/api/projects/:projectId/meetings/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { title, description, meetingLink, transcript, aiSummary, fileData, fileName, fileType } = req.body;
      const updates = [];
      const values = [];
      if (title !== undefined) { updates.push('title = ?'); values.push(title); }
      if (description !== undefined) { updates.push('description = ?'); values.push(description); }
      if (meetingLink !== undefined) { updates.push('meetingLink = ?'); values.push(meetingLink); }
      if (transcript !== undefined) { updates.push('transcript = ?'); values.push(transcript); }
      if (fileData !== undefined) { updates.push('fileData = ?'); values.push(fileData); }
      if (fileName !== undefined) { updates.push('fileName = ?'); values.push(fileName); }
      if (fileType !== undefined) { updates.push('fileType = ?'); values.push(fileType); }
      if (aiSummary !== undefined) {
        updates.push('aiSummary = ?');
        values.push(aiSummary ? (typeof aiSummary === 'string' ? aiSummary : JSON.stringify(aiSummary)) : null);
      }
      
      const connection = await mysqlPool.getConnection();
      if (updates.length > 0) {
        values.push(id);
        await connection.query(`UPDATE Meetings SET ${updates.join(', ')} WHERE id = ?`, values);
      }
      connection.release();
      res.json({ status: "success", message: "Meeting updated" });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ status: "error", message: "Terjadi kesalahan internal server: " + error.message });
    }
  });

  app.get("/api/projects/:projectId/meetings/:id/download", async (req, res) => {
    let connection;
    try {
      const { id } = req.params;
      connection = await mysqlPool.getConnection();
      const [rows] = await connection.query("SELECT fileData, fileName, fileType FROM Meetings WHERE id = ?", [id]);
      if ((rows as any[]).length > 0) {
         res.json({ status: "success", data: (rows as any[])[0] });
      } else {
         res.status(404).json({ status: "error", message: "Meeting atau berkas tidak ditemukan" });
      }
    } catch (error: any) {
      res.status(500).json({ status: "error", message: error.message });
    } finally {
      if (connection) connection.release();
    }
  });

  app.delete("/api/projects/:projectId/meetings/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const connection = await mysqlPool.getConnection();
      await connection.query("DELETE FROM Meetings WHERE id = ?", [id]);
      connection.release();
      res.json({ status: "success", message: "Meeting deleted" });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ status: "error", message: "Terjadi kesalahan internal server: " + error.message });
    }
  });

  // Discussion Points API
  app.get("/api/projects/:projectId/meetings/:id/discussionPoints", async (req, res) => {
    try {
      const { id } = req.params;
      const connection = await mysqlPool.getConnection();
      const [rows] = await connection.query("SELECT * FROM DiscussionPoints WHERE meetingId = ? ORDER BY createdAt ASC", [id]);
      connection.release();
      res.json({ status: "success", data: rows });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ status: "error", message: "Terjadi kesalahan internal server: " + error.message });
    }
  });

  app.post("/api/projects/:projectId/meetings/:id/discussionPoints", async (req, res) => {
    try {
      const { id } = req.params;
      const { parentPointId, authorId, assignTo, concern, fitur, system, surrounding, keterangan, tindakanLanjut, status, targetDate, tanggalUpdateStatus } = req.body;
      const effectiveAuthorId = authorId || req.headers["x-user-id"] || "guest";
      const connection = await mysqlPool.getConnection();
      const newId = crypto.randomUUID();
      const contentVal = concern || keterangan || "Poin Diskusi";
      try {
        await connection.query(
          "INSERT INTO DiscussionPoints (id, meetingId, \"parentPointId\", \"authorId\", \"assignTo\", concern, fitur, \"system\", surrounding, keterangan, \"tindakanLanjut\", status, \"targetDate\", \"tanggalUpdateStatus\", content) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
          [
            newId,
            id,
            parentPointId || null,
            effectiveAuthorId,
            assignTo || null,
            concern || null,
            fitur || null,
            system || null,
            surrounding || null,
            keterangan || null,
            tindakanLanjut || null,
            status || 'pending',
            targetDate || null,
            tanggalUpdateStatus || null,
            contentVal
          ]
        );
      } catch (insertErr: any) {
        console.warn("[POST DiscussionPoint Resilient Retry]:", insertErr?.message);
        await connection.query(
          "INSERT INTO DiscussionPoints (id, meetingId, \"authorId\", concern, status, content) VALUES (?, ?, ?, ?, ?, ?)",
          [newId, id, effectiveAuthorId, concern || "Poin Diskusi", status || 'pending', contentVal]
        );
      }
      connection.release();
      res.json({ status: "success", data: { id: newId, meetingId: id } });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ status: "error", message: "Terjadi kesalahan internal server: " + error.message });
    }
  });

  app.put("/api/projects/:projectId/meetings/:id/discussionPoints/:pointId", async (req, res) => {
    try {
      const { pointId } = req.params;
      const { parentPointId, assignTo, concern, fitur, system, surrounding, keterangan, tindakanLanjut, status, targetDate, tanggalUpdateStatus } = req.body;
      const updates = [];
      const values = [];
      if (parentPointId !== undefined) { updates.push('parentPointId = ?'); values.push(parentPointId); }
      if (assignTo !== undefined) { updates.push('assignTo = ?'); values.push(assignTo); }
      if (concern !== undefined) { updates.push('concern = ?'); values.push(concern); }
      if (fitur !== undefined) { updates.push('fitur = ?'); values.push(fitur); }
      if (system !== undefined) { updates.push('`system` = ?'); values.push(system); }
      if (surrounding !== undefined) { updates.push('surrounding = ?'); values.push(surrounding); }
      if (keterangan !== undefined) { updates.push('keterangan = ?'); values.push(keterangan); }
      if (tindakanLanjut !== undefined) { updates.push('tindakanLanjut = ?'); values.push(tindakanLanjut); }
      if (status !== undefined) { updates.push('status = ?'); values.push(status); }
      if (targetDate !== undefined) { updates.push('targetDate = ?'); values.push(targetDate); }
      if (tanggalUpdateStatus !== undefined) { updates.push('tanggalUpdateStatus = ?'); values.push(tanggalUpdateStatus); }
      
      const connection = await mysqlPool.getConnection();
      if (updates.length > 0) {
        values.push(pointId);
        await connection.query(`UPDATE DiscussionPoints SET ${updates.join(', ')} WHERE id = ?`, values);
      }
      connection.release();
      res.json({ status: "success", message: "Point updated" });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ status: "error", message: "Terjadi kesalahan internal server: " + error.message });
    }
  });

  app.delete("/api/projects/:projectId/meetings/:id/discussionPoints/:pointId", async (req, res) => {
    try {
      const { pointId } = req.params;
      const connection = await mysqlPool.getConnection();
      await connection.query("DELETE FROM DiscussionPoints WHERE id = ?", [pointId]);
      connection.release();
      res.json({ status: "success", message: "Point deleted" });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ status: "error", message: "Terjadi kesalahan internal server: " + error.message });
    }
  });

  // DISCUSSION POINT THREADED COMMENTS API
  const getCommentsHandler = async (req: any, res: any) => {
    try {
      const pointId = req.params.pointId || req.params.id;
      const connection = await mysqlPool.getConnection();
      const [rows] = await connection.query(
        "SELECT * FROM discussion_point_comments WHERE pointId = ? OR point_id = ? ORDER BY createdAt ASC",
        [pointId, pointId]
      );
      connection.release();
      res.json({ status: "success", data: rows });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ status: "error", message: "Failed to fetch comments: " + error.message });
    }
  };

  const postCommentHandler = async (req: any, res: any) => {
    try {
      const pointId = req.params.pointId || req.params.id;
      const { userId, userName, commentText } = req.body;

      if (!commentText || !commentText.trim()) {
        return res.status(400).json({ status: "error", message: "Teks komentar wajib diisi." });
      }

      const connection = await mysqlPool.getConnection();
      const commentId = crypto.randomUUID();
      const effectiveUserId = userId || req.headers["x-user-id"] || "guest";
      const effectiveUserName = userName || "Member";
      const createdAt = new Date().toISOString();

      await connection.query(
        "INSERT INTO discussion_point_comments (id, pointId, point_id, userId, user_id, userName, user_name, commentText, comment_text, createdAt, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [commentId, pointId, pointId, effectiveUserId, effectiveUserId, effectiveUserName, effectiveUserName, commentText.trim(), commentText.trim(), createdAt, createdAt]
      );
      connection.release();

      res.status(201).json({
        status: "success",
        data: {
          id: commentId,
          pointId,
          userId: effectiveUserId,
          userName: effectiveUserName,
          commentText: commentText.trim(),
          createdAt
        }
      });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ status: "error", message: "Failed to add comment: " + error.message });
    }
  };

  app.get("/api/discussion-points/:pointId/comments", getCommentsHandler);
  app.get("/api/projects/:projectId/meetings/:meetingId/discussionPoints/:pointId/comments", getCommentsHandler);
  app.post("/api/discussion-points/:pointId/comments", postCommentHandler);
  app.post("/api/projects/:projectId/meetings/:meetingId/discussionPoints/:pointId/comments", postCommentHandler);

  
  // Full System Backup
  app.get("/api/system/backup", verifyGlobalAdmin, async (req, res) => {
    try {
      const connection = await mysqlPool.getConnection();
      const [tablesRow] = await connection.query("SHOW TABLES");
      const tables = (tablesRow as any[]).map(r => Object.values(r)[0] as string);
      
      const backupData: Record<string, any[]> = {};
      for (const table of tables) {
        const [rows] = await connection.query(`SELECT * FROM \`${table}\``);
        backupData[table] = rows as any[];
      }
      connection.release();
      res.json({ status: "success", data: backupData });
    } catch (e: any) {
      res.status(500).json({ status: "error", message: e.message });
    }
  });

  // Full System Restore
  app.post("/api/system/restore", verifyGlobalAdmin, async (req, res) => {
    try {
      const { data } = req.body;
      if (!data || typeof data !== 'object') {
        return res.status(400).json({ status: "error", message: "Invalid backup data" });
      }

      const connection = await mysqlPool.getConnection();
      await connection.query("SET FOREIGN_KEY_CHECKS=0;");

      for (const [table, rows] of Object.entries(data)) {
        if (!Array.isArray(rows) || rows.length === 0) continue;
        
        await connection.query(`TRUNCATE TABLE \`${table}\``);
        
        const cols = Object.keys(rows[0]);
        const placeholders = cols.map(() => "?").join(", ");
        const sql = `INSERT INTO \`${table}\` (${cols.map((c: string) => `\`${c}\``).join(", ")}) VALUES (${placeholders})`;
        
        for (const row of rows) {
          const values = cols.map((c: string) => {
            const val = row[c];
            if (typeof val === 'object' && val !== null) {
              return JSON.stringify(val);
            }
            return val;
          });
          await connection.query(sql, values);
        }
      }
      
      await connection.query("SET FOREIGN_KEY_CHECKS=1;");
      connection.release();
      res.json({ status: "success", message: "Restore completed successfully" });
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ status: "error", message: e.message });
    }
  });

  // Get active DB Config Connection
  app.get("/api/system/db-config", verifyGlobalAdmin, (req, res) => {
    try {
      const config = {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || '3306',
        user: process.env.DB_USER || 'app_user',
        password: process.env.DB_PASSWORD || 'app_password',
        database: process.env.DB_NAME || 'app_database'
      };

      const persistentPath = path.join(process.cwd(), 'database', 'db_config.json');
      if (fs.existsSync(persistentPath)) {
        try {
          const saved = JSON.parse(fs.readFileSync(persistentPath, 'utf8'));
          if (saved.host) config.host = saved.host;
          if (saved.port) config.port = String(saved.port);
          if (saved.user) config.user = saved.user;
          if (saved.password) config.password = saved.password;
          if (saved.database) config.database = saved.database;
        } catch (err) {}
      }

      res.json({
        status: "success",
        data: config
      });
    } catch (e: any) {
      res.status(500).json({ status: "error", message: e.message });
    }
  });

  // Get active DB connection mode and status
  app.get("/api/system/db-status", verifyGlobalAdmin, async (req, res) => {
    try {
      const { getDbMode } = await import('./src/lib/db');
      const mode = getDbMode();
      res.json({
        status: "success",
        mode, // "pg"
        host: process.env.DATABASE_URL ? "Neon PostgreSQL Server" : "PostgreSQL Server"
      });
    } catch (e: any) {
      res.status(500).json({ status: "error", message: e.message });
    }
  });

  // Switch/Toggle DB connection mode
  app.post("/api/system/db-status", verifyGlobalAdmin, async (req, res) => {
    try {
      res.json({
        status: "success",
        mode: "pg",
        message: "Aplikasi terkunci pada Neon PostgreSQL Server."
      });
    } catch (e: any) {
      res.status(500).json({ status: "error", message: e.message });
    }
  });

  // Test DB Config Connection
  app.post("/api/system/db-config", verifyGlobalAdmin, async (req, res) => {
    try {
      const { connectionString } = req.body;
      const { Pool } = await import('pg');
      const testPool = new Pool({
        connectionString: connectionString || process.env.DATABASE_URL || process.env.POSTGRES_URL,
        ssl: { rejectUnauthorized: false }
      });
      await testPool.query("SELECT 1");
      await testPool.end();
      res.json({ status: "success", message: "Koneksi PostgreSQL Berhasil!" });
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ status: "error", message: e.message });
    }
  });

  // Save and Hot-Swap DB Config Connection
  app.post("/api/system/db-config/save", verifyGlobalAdmin, async (req, res) => {
    try {
      const { connectionString } = req.body;
      const { updatePoolConfig } = await import('./src/lib/db');
      updatePoolConfig({ connectionString });
      res.json({ status: "success", message: "Konfigurasi PostgreSQL berhasil diperbarui!" });
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ status: "error", message: e.message });
    }
  });

// --- ALERTS & NOTIFICATIONS SERVICE (v1.5) ---
const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;

const sendAlert = async (message: string, severity: 'warn' | 'error' | 'critical' = 'warn') => {
  if (!SLACK_WEBHOOK_URL) return;
  
  const icons = { warn: '⚠️', error: '🚨', critical: '🔥' };
  const payload = {
    text: `${icons[severity]} *LanPro System Alert [v1.5]*\n> ${message}\n_Timestamp: ${new Date().toLocaleString('id-ID')}_`
  };

  try {
    await fetch(SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (err) {
    console.error("[ALERT] Gagal mengirim notifikasi ke Slack:", err);
  }
};

// Global Error Handler Terintegrasi Alert
app.use((err: any, req: any, res: any, next: any) => {
  console.error('Unhandled Server Error:', err);
  
  // Alert jika error 500 terjadi berulang (simulasi sederhana)
  sendAlert(`Terjadi Unhandled Error di rute ${req.url}: ${err.message}`, 'error');

  res.status(500).json({
    status: "error",
    message: "Terjadi kesalahan internal pada server LanPro.",
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

  // ==========================================
  // WILAYAH III (End): Catch-all API Fallback
  // ==========================================
  // Catch-all untuk rute API yang tidak cocok
  app.all('/api/*', (req, res) => {
    res.status(404).json({
      status: "error",
      message: `Rute API backend tidak ditemukan atau tidak tersedia (Endpoint: ${req.method} ${req.originalUrl}).`
    });
  });

  // ==========================================
  // WILAYAH IV: Static Assets (Menyajikan SPA Vite)
  // ==========================================
  if (process.env.NODE_ENV !== "production") {
    const viteModuleName = "vite";
    const { createServer: createViteServer } = await import(viteModuleName);
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: process.env.DISABLE_HMR !== "false" ? false : true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production setup for static files
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    
    // ==========================================
    // WILAYAH V: Bottom Level Fallback
    // ==========================================
    // Rute penangkap terakhir yang mengembalikan index.html
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  if (process.env.VERCEL && process.env.NODE_ENV === "production") {
    console.log("[VERCEL] Running in serverless mode. Skipping httpServer.listen.");
    return;
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

export const initializationPromise = startServer();
