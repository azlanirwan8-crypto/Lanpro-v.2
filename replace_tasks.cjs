const fs = require('fs');

let serverContent = fs.readFileSync('server.ts', 'utf8');

const startMarker = '  app.get("/api/projects/:projectId/tasks", verifyProjectAccess';
const endMarker = '  app.get("/api/projects/:projectId/documents", verifyProjectAccess';

const startIndex = serverContent.indexOf(startMarker);
if (startIndex !== -1) {
  const endIndex = serverContent.indexOf(endMarker, startIndex);
  if (endIndex !== -1) {
    let chunk = serverContent.substring(startIndex, endIndex);
    
    // We will write this chunk to a new file server/routes/task.routes.ts
    const newRouteFile = `import express from "express";
import crypto from "crypto";
import mysqlPool from "../../src/lib/db";
import { authenticateJWT } from "../middleware/auth";
import { verifyProjectAccess } from "../middleware/rbac";
import { createAuditLog } from "../services/audit.service";
import { broadcastProjectNotification, sendProjectActivityNotification, checkUpcomingDueDates } from "../services/notification.service";
import { GoogleGenAI, Type } from "@google/genai";

const router = express.Router();

` + chunk.replace(/app\.get\(/g, "router.get(").replace(/app\.post\(/g, "router.post(").replace(/app\.put\(/g, "router.put(").replace(/app\.delete\(/g, "router.delete(").replace(/io\.emit\(/g, "req.io.emit(") + `

export default router;
`;

    fs.writeFileSync('server/routes/task.routes.ts', newRouteFile);

    // Replace in server.ts
    const newCodeInServerTs = `  const { default: taskRoutes } = await import('./server/routes/task.routes.ts');\n  app.use(taskRoutes);\n\n`;
    serverContent = serverContent.substring(0, startIndex) + newCodeInServerTs + serverContent.substring(endIndex);
    fs.writeFileSync('server.ts', serverContent);
    console.log("Tasks extracted successfully!");
  } else {
    console.log("Could not find end marker");
  }
} else {
  console.log("Could not find start marker");
}
