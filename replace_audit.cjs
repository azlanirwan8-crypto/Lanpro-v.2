const fs = require('fs');

let content = fs.readFileSync('server.ts', 'utf8');

const startMarker = "// Audit Log Helper (Enterprise-Ready) & Data Masking Middleware";
const endMarker = "  const createAutomatedNotification = async";

const startIndex = content.indexOf(startMarker);
if (startIndex !== -1) {
  const endIndex = content.indexOf(endMarker, startIndex);
  if (endIndex !== -1) {
    const oldCode = content.substring(startIndex, endIndex);
    
    const newCode = `// Audit Log Helper (Enterprise-Ready) & Data Masking Middleware
  const createAuditLog = async (userId: string, projectId: string | null, actionType: 'CREATE' | 'UPDATE' | 'DELETE', entityName: string, entityId: string, oldValues: any, newValues: any) => {
    const { createAuditLog: _createAuditLog } = await import('./server/services/audit.service.js');
    return _createAuditLog(io, userId, projectId, actionType, entityName, entityId, oldValues, newValues);
  };\n\n`;

    content = content.substring(0, startIndex) + newCode + content.substring(endIndex);
    fs.writeFileSync('server.ts', content);
    console.log("Replaced successfully!");
  } else {
    console.log("Could not find end marker");
  }
} else {
  console.log("Could not find start marker");
}
