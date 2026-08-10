const fs = require('fs');

let content = fs.readFileSync('server.ts', 'utf8');

const startMarker = "  // RBAC Middleware";
const endMarker = "  // Audit Log Helper (Enterprise-Ready) & Data Masking Middleware";

const startIndex = content.indexOf(startMarker);
if (startIndex !== -1) {
  const endIndex = content.indexOf(endMarker, startIndex);
  if (endIndex !== -1) {
    const newCode = `  // RBAC Middleware (Moved to server/middleware/rbac.ts)\n  const { verifyProjectAccess } = await import('./server/middleware/rbac.ts');\n\n`;
    content = content.substring(0, startIndex) + newCode + content.substring(endIndex);
    fs.writeFileSync('server.ts', content);
    console.log("Replaced successfully!");
  } else {
    console.log("Could not find end marker");
  }
} else {
  console.log("Could not find start marker");
}
