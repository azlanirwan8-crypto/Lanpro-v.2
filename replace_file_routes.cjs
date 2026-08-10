const fs = require('fs');

let content = fs.readFileSync('server.ts', 'utf8');

const startMarker = "  // 🛡️ SECURE UPLOAD DOCUMENT ENDPOINT (Magic Bytes, Whitelist & Private Storage)";
const endMarker = "  // --- PROMETHEUS METRICS ENDPOINT ---";

const startIndex = content.indexOf(startMarker);
if (startIndex !== -1) {
  const endIndex = content.indexOf(endMarker, startIndex);
  if (endIndex !== -1) {
    const newCode = `  const { default: fileRoutes } = await import('./server/routes/file.routes.ts');\n  app.use(fileRoutes);\n\n`;
    content = content.substring(0, startIndex) + newCode + content.substring(endIndex);
    fs.writeFileSync('server.ts', content);
    console.log("Replaced successfully!");
  } else {
    console.log("Could not find end marker");
  }
} else {
  console.log("Could not find start marker");
}
