const fs = require('fs');

let serverContent = fs.readFileSync('server.ts', 'utf8');

const startMarker = '  app.get("/api/auth/verify", authenticateJWT';
const endMarker = '  const { default: userRoutes } = await import(\'./server/routes/user.routes.ts\');';

const startIndex = serverContent.indexOf(startMarker);
if (startIndex !== -1) {
  const endIndex = serverContent.indexOf(endMarker, startIndex);
  if (endIndex !== -1) {
    let chunk = serverContent.substring(startIndex, endIndex);
    
    // We will write this chunk to overwrite server/routes/auth.routes.ts
    const newRouteFile = `import express from "express";
import crypto from "crypto";
import { UAParser } from "ua-parser-js";
import mysqlPool from "../../src/lib/db";
import { authenticateJWT, activeUserSessions, generateToken } from "../middleware/auth";
import { hashPassword, verifyPassword } from "../helpers/hash";
import { createAuditLog } from "../services/audit.service";
import { GoogleGenAI, Type } from "@google/genai";

const router = express.Router();

// Helper functions for auth routes
interface LoginAttemptTracker {
  count: number;
  blockedUntil: number | null;
}
const loginAttemptsMap = new Map<string, LoginAttemptTracker>();
function formatRemainingTime(remainingMs: number): string {
  const totalSeconds = Math.max(1, Math.ceil(remainingMs / 1000));
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  if (mins > 0 && secs > 0) return \`\${mins} menit \${secs} detik\`;
  else if (mins > 0) return \`\${mins} menit\`;
  else return \`\${secs} detik\`;
}
async function handleUserAuthentication(usernameInput: string, passwordInput: string): Promise<any> {
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
    return { success: false, status: 429, message: \`Akun Anda terkunci sementara karena 3x salah password. Silakan tunggu \${remainingStr} lagi.\`, remainingMs };
  }
  if (attemptData.blockedUntil && now >= attemptData.blockedUntil) {
    attemptData.count = 0; attemptData.blockedUntil = null;
  }
  let connection; let user: any = null; let matchedUsername = cleanInput;
  try {
    connection = await mysqlPool.getConnection();
    const [rows]: any = await connection.query("SELECT * FROM Users WHERE LOWER(username) = ? OR LOWER(email) = ?", [userKey, userKey]);
    if (rows && rows.length > 0) { user = rows[0]; matchedUsername = user.username || user.displayName || cleanInput; }
  } catch (err) {} finally { if (connection) connection.release(); }
  if (!user) return { success: false, status: 404, message: "Username / Email tidak ditemukan." };
  const isValidPassword = await verifyPassword(passwordInput, user.passwordHash || user.password, matchedUsername);
  if (!isValidPassword) {
    attemptData.count += 1;
    if (attemptData.count >= 3) {
      const LOCKOUT_DURATION_MS = 5 * 60 * 1000; attemptData.blockedUntil = now + LOCKOUT_DURATION_MS;
      return { success: false, status: 429, message: \`Terlalu banyak percobaan gagal. Terkunci 5 menit.\`, remainingMs: LOCKOUT_DURATION_MS };
    }
    return { success: false, status: 401, message: \`Password salah. (Sisa percobaan: \${3 - attemptData.count}x)\` };
  }
  loginAttemptsMap.delete(userKey);
  return { success: true, user };
}

` + chunk.replace(/app\.get\(/g, "router.get(").replace(/app\.post\(/g, "router.post(").replace(/app\.put\(/g, "router.put(").replace(/app\.delete\(/g, "router.delete(").replace(/io\.emit\(/g, "req.io.emit(").replace(/req\.app\.get\("io"\)\.emit\(/g, "req.io.emit(") + `

export default router;
`;

    fs.writeFileSync('server/routes/auth.routes.ts', newRouteFile);

    const newCodeInServerTs = `  app.use(authRoutes);\n\n`;
    serverContent = serverContent.substring(0, startIndex) + newCodeInServerTs + serverContent.substring(endIndex);
    fs.writeFileSync('server.ts', serverContent);
    console.log("Auth Routes extracted successfully!");
  } else {
    console.log("Could not find end marker");
  }
} else {
  console.log("Could not find start marker");
}
