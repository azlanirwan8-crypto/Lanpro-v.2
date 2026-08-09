const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// Add version to Tasks table
code = code.replace(
  'projectRisk VARCHAR(50) DEFAULT \'Low\'',
  'projectRisk VARCHAR(50) DEFAULT \'Low\',\n            version INT DEFAULT 1'
);

// Add optimistic locking to PUT task API
const oldPutTask = `
  // Update task
  app.put("/api/projects/:projectId/tasks/:id", verifyProjectAccess(['*']), async (req, res) => {
    let connection;
    try {
      const { projectId, id } = req.params;
      const updates = req.body;
`;
const newPutTask = `
  // Update task
  app.put("/api/projects/:projectId/tasks/:id", verifyProjectAccess(['*']), async (req, res) => {
    let connection;
    try {
      const { projectId, id } = req.params;
      const updates = req.body;
      const clientVersion = updates.version; // from frontend
`;

// wait, the actual update logic dynamically sets values.
// I will just supply the code in the markdown report as requested!
