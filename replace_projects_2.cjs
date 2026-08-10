const fs = require('fs');

let serverContent = fs.readFileSync('server.ts', 'utf8');
let projectRouteContent = fs.readFileSync('server/routes/project.routes.ts', 'utf8');

const startMarker = '  app.put("/api/projects/:projectId/dashboard-layout", verifyProjectAccess';
const endMarker = '  app.get("/api/projects/:projectId/sprints", verifyProjectAccess';

const startIndex = serverContent.indexOf(startMarker);
if (startIndex !== -1) {
  const endIndex = serverContent.indexOf(endMarker, startIndex);
  if (endIndex !== -1) {
    let chunk = serverContent.substring(startIndex, endIndex);
    
    // Remove chunk from server.ts
    serverContent = serverContent.substring(0, startIndex) + serverContent.substring(endIndex);
    fs.writeFileSync('server.ts', serverContent);
    
    // Replace app. with router.
    chunk = chunk.replace(/app\.get\(/g, "router.get(").replace(/app\.post\(/g, "router.post(").replace(/app\.put\(/g, "router.put(").replace(/app\.delete\(/g, "router.delete(");
    
    // Insert into project.routes.ts before 'export default router;'
    const exportIndex = projectRouteContent.indexOf('export default router;');
    projectRouteContent = projectRouteContent.substring(0, exportIndex) + chunk + '\n' + projectRouteContent.substring(exportIndex);
    
    fs.writeFileSync('server/routes/project.routes.ts', projectRouteContent);
    console.log("Chunk 2 extracted successfully!");
  } else {
    console.log("Could not find end marker");
  }
} else {
  console.log("Could not find start marker");
}
