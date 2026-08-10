const fs = require('fs');
let code = fs.readFileSync('server/routes/task.routes.ts', 'utf8');

let lines = code.split('\n');
let controllerExports = [];
let newRoutesLines = [];
let inRoute = false;
let braceCount = 0;
let currentRouteBuffer = [];
let routeName = '';
let routeMethod = '';
let routePath = '';

for (let i = 0; i < lines.length; i++) {
  let line = lines[i];
  
  if (!inRoute) {
    let match = line.match(/^  router\.(get|post|put|delete)\("([^"]+)"(.*), async \(req(?:, res|\: any, res)?\) => \{/);
    if (match) {
      inRoute = true;
      routeMethod = match[1];
      routePath = match[2];
      let middlewares = match[3];
      
      let nameParts = routePath.split('/').filter(p => p && !p.startsWith(':'));
      let camelName = nameParts.map(p => p.charAt(0).toUpperCase() + p.slice(1).replace(/-/g, '')).join('');
      routeName = routeMethod + camelName;
      
      let counter = 1;
      let origName = routeName;
      while (controllerExports.some(e => e.name === routeName)) {
        routeName = origName + counter;
        counter++;
      }
      
      newRoutesLines.push("  router." + routeMethod + "(\"" + routePath + "\"" + middlewares + ", TaskController." + routeName + ");");
      
      currentRouteBuffer.push("export const " + routeName + " = async (req: any, res: any) => {");
      braceCount = 1;
      let restOfLine = line.substring(line.indexOf('=> {') + 4);
      braceCount += (restOfLine.match(/\\{/g) || []).length;
      braceCount -= (restOfLine.match(/\\}/g) || []).length;
      if (restOfLine.trim()) currentRouteBuffer.push(restOfLine);
    } else {
      newRoutesLines.push(line);
    }
  } else {
    currentRouteBuffer.push(line);
    braceCount += (line.match(/\\{/g) || []).length;
    braceCount -= (line.match(/\\}/g) || []).length;
    
    if (braceCount === 0) {
      let lastLine = currentRouteBuffer[currentRouteBuffer.length - 1];
      if (lastLine.endsWith(');')) {
        currentRouteBuffer[currentRouteBuffer.length - 1] = lastLine.substring(0, lastLine.length - 2);
      }
      
      controllerExports.push({
        name: routeName,
        code: currentRouteBuffer.join('\\n')
      });
      
      inRoute = false;
      currentRouteBuffer = [];
      braceCount = 0;
    }
  }
}

let controllerCode = "import crypto from 'crypto';\\n" +
"import mysqlPool from '../../src/lib/db';\\n" +
"import { createAuditLog } from '../services/audit.service';\\n" +
"import { broadcastProjectNotification, sendProjectActivityNotification, checkUpcomingDueDates } from '../services/notification.service';\\n" +
"import { GoogleGenAI, Type } from '@google/genai';\\n\\n" +
controllerExports.map(e => e.code).join('\\n\\n');

if (!fs.existsSync('server/controllers')) {
  fs.mkdirSync('server/controllers');
}
fs.writeFileSync('server/controllers/task.controller.ts', controllerCode);

let newRoutesStr = newRoutesLines.join('\\n');
newRoutesStr = newRoutesStr.replace('import { GoogleGenAI, Type } from "@google/genai";', 'import * as TaskController from "../controllers/task.controller";');

fs.writeFileSync('server/routes/task.routes.ts', newRoutesStr);
console.log("Extraction to Controller completed!");
