const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

if (!code.includes('const verifyGlobalAdmin')) {
  code = code.replace(
    /const authenticateJWT = \(req: any, res: any, next: any\) => \{/,
    `const verifyGlobalAdmin = (req: any, res: any, next: any) => {
    if (req.user?.role === 'admin') {
      next();
    } else {
      res.status(403).json({ status: "error", message: "Akses ditolak: Hanya Global Admin yang memiliki izin." });
    }
  };\n\n  const authenticateJWT = (req: any, res: any, next: any) => {`
  );
}

// Remove test-db and migrate-db from publicRoutes
code = code.replace(
  /const publicRoutes = \['\/api\/auth', '\/api\/test-db', '\/api\/migrate-db', '\/api\/health-check'\];/,
  `const publicRoutes = ['/api/auth', '/api/health-check'];`
);

// Apply verifyGlobalAdmin to endpoints
const endpointsToProtect = [
  'app.get("/api/test-db", ',
  'app.post("/api/db-query", ',
  'app.get("/api/db-schema", ',
  'app.post("/api/migrate-db", ',
  'app.get("/api/system/backup", ',
  'app.post("/api/system/restore", ',
  'app.get("/api/system/db-config", ',
  'app.get("/api/system/db-status", ',
  'app.post("/api/system/db-status", ',
  'app.post("/api/system/db-config", ',
  'app.post("/api/system/db-config/save", '
];

endpointsToProtect.forEach(endpoint => {
  if (code.includes(endpoint) && !code.includes(endpoint.replace(', ', ', verifyGlobalAdmin, '))) {
     code = code.replace(endpoint, endpoint.replace(', ', ', verifyGlobalAdmin, '));
  }
});

fs.writeFileSync('server.ts', code);
console.log("Admin routes secured");
