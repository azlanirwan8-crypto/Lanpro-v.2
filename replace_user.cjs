const fs = require('fs');

let serverContent = fs.readFileSync('server.ts', 'utf8');

const startMarker = '  app.post("/api/users/heartbeat", async (req, res) => {';
const endMarker = '  app.post("/api/whatsapp/simulate", authenticateJWT, async (req: any, res) => {';

const startIndex = serverContent.indexOf(startMarker);
if (startIndex !== -1) {
  const endIndex = serverContent.indexOf(endMarker, startIndex);
  if (endIndex !== -1) {
    let chunk = serverContent.substring(startIndex, endIndex);
    
    const newRouteFile = `import express from "express";
import crypto from "crypto";
import mysqlPool from "../../src/lib/db";
import { authenticateJWT, activeUserSessions } from "../middleware/auth";
import { verifyProjectAccess } from "../middleware/rbac";
import { hashPassword, verifyPassword } from "../helpers/hash";
import { createAuditLog } from "../services/audit.service";
import { broadcastProjectNotification, sendProjectActivityNotification, checkUpcomingDueDates } from "../services/notification.service";

const router = express.Router();

` + chunk.replace(/app\.get\(/g, "router.get(").replace(/app\.post\(/g, "router.post(").replace(/app\.put\(/g, "router.put(").replace(/app\.delete\(/g, "router.delete(").replace(/io\.emit\(/g, "req.io.emit(") + `

export default router;
`;

    fs.writeFileSync('server/routes/user.routes.ts', newRouteFile);

    const newCodeInServerTs = `  const { default: userRoutes } = await import('./server/routes/user.routes.ts');\n  app.use(userRoutes);\n\n`;
    serverContent = serverContent.substring(0, startIndex) + newCodeInServerTs + serverContent.substring(endIndex);
    fs.writeFileSync('server.ts', serverContent);
    console.log("User Routes extracted successfully!");
  } else {
    console.log("Could not find end marker");
  }
} else {
  console.log("Could not find start marker");
}
