const fs = require('fs');

let content = fs.readFileSync('server.ts', 'utf8');

const regex = /\/\/ Audit Log Helper \(Enterprise-Ready\) & Data Masking Middleware[\s\S]*?const createAuditLog = async \([\s\S]*?\}\);\n  \};/m;

const newCode = `// Audit Log Helper (Enterprise-Ready) & Data Masking Middleware
  const createAuditLog = async (userId: string, projectId: string | null, actionType: 'CREATE' | 'UPDATE' | 'DELETE', entityName: string, entityId: string, oldValues: any, newValues: any) => {
    const { createAuditLog: _createAuditLog } = require('./server/services/audit.service.ts');
    return _createAuditLog(io, userId, projectId, actionType, entityName, entityId, oldValues, newValues);
  };`;

const match = content.match(regex);
if (!match) {
  console.log("Could not match the regex.");
} else {
  content = content.replace(regex, newCode);
  fs.writeFileSync('server.ts', content);
  console.log("Replaced successfully!");
}
