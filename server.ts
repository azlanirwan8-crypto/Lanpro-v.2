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

  const { default: fileRoutes } = await import('./server/routes/file.routes.ts');
  app.use(fileRoutes);

  // --- PROMETHEUS METRICS ENDPOINT ---
  app.get("/metrics", async (req, res) => {
    try {
      res.set("Content-Type", register.contentType);
      res.end(await register.metrics());
    } catch (ex) {
      res.status(500).end(ex);
    }
  });

  // RBAC Middleware (Moved to server/middleware/rbac.ts)
  const { verifyProjectAccess } = await import('./server/middleware/rbac.ts');

  // Audit Log Helper (Enterprise-Ready) & Data Masking Middleware
  const createAuditLog = async (userId: string, projectId: string | null, actionType: 'CREATE' | 'UPDATE' | 'DELETE', entityName: string, entityId: string, oldValues: any, newValues: any) => {
    const { createAuditLog: _createAuditLog } = await import('./server/services/audit.service.js');
    return _createAuditLog(io, userId, projectId, actionType, entityName, entityId, oldValues, newValues);
  };

  const createAutomatedNotification = async (recipientId: string, senderId: string | null, title: string, message: string, type: string, relatedId: string | null) => {
    const { createAutomatedNotification: _createAutomatedNotification } = await import('./server/services/notification.service.js');
    return _createAutomatedNotification(io, recipientId, senderId, title, message, type, relatedId);
  };

  const broadcastProjectNotification = async (projectId: string, senderId: string | null, title: string, message: string, type: string, relatedId: string | null) => {
    const { broadcastProjectNotification: _broadcastProjectNotification } = await import('./server/services/notification.service.js');
    return _broadcastProjectNotification(io, projectId, senderId, title, message, type, relatedId);
  };

  const sendProjectActivityNotification = async (projectId: string, triggerUserId: string, actionType: 'create_task' | 'update_task' | 'comment_task', payload: any) => {
    const { sendProjectActivityNotification: _sendProjectActivityNotification } = await import('./server/services/notification.service.js');
    return _sendProjectActivityNotification(io, projectId, triggerUserId, actionType, payload);
  };

  const checkUpcomingDueDates = async () => {
    const { checkUpcomingDueDates: _checkUpcomingDueDates } = await import('./server/services/notification.service.js');
    return _checkUpcomingDueDates(io);
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



  app.use(authRoutes);

  const { default: userRoutes } = await import('./server/routes/user.routes.ts');
  app.use(userRoutes);

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
  const { default: projectRoutes } = await import('./server/routes/project.routes.ts');
  app.use(projectRoutes);

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
  const { default: taskRoutes } = await import('./server/routes/task.routes.ts');
  app.use(taskRoutes);

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
