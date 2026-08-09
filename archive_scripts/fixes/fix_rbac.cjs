const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const replaceRoute = (search, replace) => {
  if (code.includes(search)) {
    code = code.replace(search, replace);
  }
}

replaceRoute('app.get("/api/projects/:projectId/tasks", async (req, res) => {', 'app.get("/api/projects/:projectId/tasks", verifyProjectAccess([\'*\']), async (req, res) => {');
replaceRoute('app.get("/api/projects/:projectId/tasks/:taskId/comments", async (req, res) => {', 'app.get("/api/projects/:projectId/tasks/:taskId/comments", verifyProjectAccess([\'*\']), async (req, res) => {');
replaceRoute('app.post("/api/projects/:projectId/tasks/:taskId/comments", async (req, res) => {', 'app.post("/api/projects/:projectId/tasks/:taskId/comments", verifyProjectAccess([\'*\']), async (req, res) => {');
replaceRoute('app.get("/api/projects/:projectId/activity", async (req, res) => {', 'app.get("/api/projects/:projectId/activity", verifyProjectAccess([\'*\']), async (req, res) => {');
replaceRoute('app.post("/api/projects/:projectId/activity", async (req, res) => {', 'app.post("/api/projects/:projectId/activity", verifyProjectAccess([\'*\']), async (req, res) => {');
replaceRoute('app.get("/api/projects/:projectId/sprints", async (req, res) => {', 'app.get("/api/projects/:projectId/sprints", verifyProjectAccess([\'*\']), async (req, res) => {');
replaceRoute('app.get("/api/projects/:projectId/qa-test-suites", async (req, res) => {', 'app.get("/api/projects/:projectId/qa-test-suites", verifyProjectAccess([\'*\']), async (req, res) => {');
replaceRoute('app.get("/api/projects/:projectId/qa-test-cases", async (req, res) => {', 'app.get("/api/projects/:projectId/qa-test-cases", verifyProjectAccess([\'*\']), async (req, res) => {');
replaceRoute('app.get("/api/projects/:projectId/meetings", async (req, res) => {', 'app.get("/api/projects/:projectId/meetings", verifyProjectAccess([\'*\']), async (req, res) => {');
replaceRoute('app.get("/api/projects/:projectId/documents", async (req, res) => {', 'app.get("/api/projects/:projectId/documents", verifyProjectAccess([\'*\']), async (req, res) => {');

fs.writeFileSync('server.ts', code);
console.log("RBAC for project GET routes fixed");
