const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// Add xss import if not there
if (!code.includes("import xss from")) {
    code = code.replace('import bcrypt from "bcryptjs";', 'import bcrypt from "bcryptjs";\nimport xss from "xss";');
}

// 1. Fix IDOR in Task Fetching for Delete
code = code.replace(
    /SELECT assigneeId, reporterId FROM Tasks WHERE id = \?"/g,
    'SELECT assigneeId, reporterId FROM Tasks WHERE id = ? AND projectId = ?"'
);
code = code.replace(
    /await connection\.query\("SELECT assigneeId, reporterId FROM Tasks WHERE id = \? AND projectId = \?", \[id\]\);/g,
    'await connection.query("SELECT assigneeId, reporterId FROM Tasks WHERE id = ? AND projectId = ?", [id, projectId]);'
);

// Delete task IDOR
code = code.replace(
    /DELETE FROM Tasks WHERE id = \?"/g,
    'DELETE FROM Tasks WHERE id = ? AND projectId = ?"'
);
code = code.replace(
    /await connection\.query\("DELETE FROM Tasks WHERE id = \? AND projectId = \?", \[id\]\);/g,
    'await connection.query("DELETE FROM Tasks WHERE id = ? AND projectId = ?", [id, projectId]);'
);

// Update task IDOR
code = code.replace(
    /SELECT t\.\*, p\.category as projectCategory FROM Tasks t JOIN Projects p ON t\.projectId = p\.id WHERE t\.id = \?"/g,
    'SELECT t.*, p.category as projectCategory FROM Tasks t JOIN Projects p ON t.projectId = p.id WHERE t.id = ? AND t.projectId = ?"'
);
code = code.replace(
    /await connection\.query\("SELECT t\.\*, p\.category as projectCategory FROM Tasks t JOIN Projects p ON t\.projectId = p\.id WHERE t\.id = \? AND t\.projectId = \?", \[id\]\);/g,
    'await connection.query("SELECT t.*, p.category as projectCategory FROM Tasks t JOIN Projects p ON t.projectId = p.id WHERE t.id = ? AND t.projectId = ?", [id, projectId]);'
);

// Sprints IDOR
code = code.replace(
    /DELETE FROM Sprints WHERE id = \?", \[id\]/g,
    'DELETE FROM Sprints WHERE id = ? AND projectId = ?", [id, projectId]'
);

// XSS Sanitization in Task Post
const taskPostTarget = `      const { title, description, status, type, priority, assigneeId, sprintId, parentId, dueDate, storyPoints, startDate, endDate, estimatedHours, loggedHours, acceptanceCriteria, isBlocked } = req.body;`;
const taskPostReplacement = `      const { status, type, priority, assigneeId, sprintId, parentId, dueDate, storyPoints, startDate, endDate, estimatedHours, loggedHours, acceptanceCriteria, isBlocked } = req.body;
      const title = xss(req.body.title || "");
      const description = xss(req.body.description || "");`;

code = code.replace(taskPostTarget, taskPostReplacement);

const taskPutTarget = `      const { title, description, status, type, priority, assigneeId, sprintId, parentId, dueDate, storyPoints, startDate, endDate, estimatedHours, loggedHours, acceptanceCriteria, version, isBlocked } = req.body;`;
const taskPutReplacement = `      const { status, type, priority, assigneeId, sprintId, parentId, dueDate, storyPoints, startDate, endDate, estimatedHours, loggedHours, acceptanceCriteria, version, isBlocked } = req.body;
      const title = xss(req.body.title || "");
      const description = xss(req.body.description || "");`;

code = code.replace(taskPutTarget, taskPutReplacement);


fs.writeFileSync('server.ts', code);
console.log("Security fixes applied");
