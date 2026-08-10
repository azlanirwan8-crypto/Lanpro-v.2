const fs = require('fs');

let content = fs.readFileSync('server.ts', 'utf8');

const startMarker = '  app.get("/api/projects", async (req, res) => {';
const endMarker = '  app.put("/api/projects/:projectId/dashboard-layout", verifyProjectAccess';

const startIndex = content.indexOf(startMarker);
if (startIndex !== -1) {
  const endIndex = content.indexOf(endMarker, startIndex);
  if (endIndex !== -1) {
    const chunk = content.substring(startIndex, endIndex);
    
    // We will write this chunk to a new file server/routes/project.routes.ts
    const newRouteFile = `import express from "express";
import crypto from "crypto";
import mysqlPool from "../../src/lib/db";
import { authenticateJWT } from "../middleware/auth";
import { verifyProjectAccess } from "../middleware/rbac";
import { createAuditLog } from "../services/audit.service";
import { broadcastProjectNotification, sendProjectActivityNotification } from "../services/notification.service";
import { GoogleGenAI, Type } from "@google/genai";

const router = express.Router();

` + chunk.replace(/app\.get\(/g, "router.get(").replace(/app\.post\(/g, "router.post(") + `

export default router;
`;

    fs.writeFileSync('server/routes/project.routes.ts', newRouteFile);

    // Replace in server.ts
    const newCodeInServerTs = `  const { default: projectRoutes } = await import('./server/routes/project.routes.ts');\n  app.use(projectRoutes);\n\n`;
    content = content.substring(0, startIndex) + newCodeInServerTs + content.substring(endIndex);
    fs.writeFileSync('server.ts', content);
    console.log("Chunk 1 extracted successfully!");
  } else {
    console.log("Could not find end marker");
  }
} else {
  console.log("Could not find start marker");
}
