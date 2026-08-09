const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const oldPatchRoute = `  // Dedicated status update endpoint (Instant)
  app.patch("/api/projects/:projectId/qa-test-cases/:id/status", async (req, res) => {
    let connection;
    try {
      const { projectId, id } = req.params;
      const { status } = req.body;
      if (!status) {
        return res.status(400).json({ status: "error", message: "Status required" });
      }

      connection = await mysqlPool.getConnection();
      await connection.query(
        "UPDATE QATestCases SET status = ? WHERE id = ? AND projectId = ?",
        [status, id, projectId]
      );

      res.json({ status: "success", message: "Status updated successfully", statusValue: status });
    } catch (error: any) {
      console.error("PATCH /api/projects/:projectId/qa-test-cases/:id/status error:", error);
      res.status(500).json({ status: "error", message: error.message });
    } finally {
      if (connection) connection.release();
    }
  });`;

const newPatchRoute = `  // Dedicated status update endpoint (Instant)
  app.patch("/api/projects/:projectId/qa-test-cases/:id/status", async (req, res) => {
    let connection;
    try {
      const { projectId, id } = req.params;
      const { status } = req.body;
      if (!status) {
        return res.status(400).json({ status: "error", message: "Status required" });
      }

      connection = await mysqlPool.getConnection();
      
      // Get current TC data to check if we should auto-create a bug
      const [tcRows]: any = await connection.query(
        "SELECT * FROM QATestCases WHERE id = ? AND projectId = ?",
        [id, projectId]
      );
      
      let createdBugKey = null;

      if (tcRows.length > 0) {
        const tc = tcRows[0];
        
        // Auto-create Bug if status is Failed and bug hasn't been created yet
        if (status.toLowerCase() === 'failed' && !tc.linkedBugKey) {
          // Generate new Task Key
          const [keyResult]: any = await connection.query(
             "SELECT taskKey FROM Tasks WHERE projectId = ? ORDER BY createdAt DESC LIMIT 1",
             [projectId]
          );
          
          let nextKeyNum = 1;
          let projCode = "PRJ";
          if (keyResult.length > 0 && keyResult[0].taskKey) {
             const keyParts = keyResult[0].taskKey.split('-');
             if (keyParts.length > 1) {
                projCode = keyParts[0];
                nextKeyNum = parseInt(keyParts[1], 10) + 1;
             }
          } else {
             // Try to get prefix from project
             const [projRes]: any = await connection.query("SELECT prefix FROM Projects WHERE id = ?", [projectId]);
             if (projRes.length > 0 && projRes[0].prefix) {
                projCode = projRes[0].prefix;
             }
          }
          const taskKey = \`\${projCode}-\${nextKeyNum}\`;
          const bugId = crypto.randomUUID();
          const userIdStr = (req as any).user?.uid || (req as any).user?.id || req.headers['x-user-id'] || 'guest';
          
          await connection.query(
            \`INSERT INTO Tasks (id, projectId, taskKey, title, description, status, priority, type, reporterId, projectRisk) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)\`,
            [bugId, projectId, taskKey, \`Bug: \${tc.title}\`, \`This bug was automatically generated from Failed QA Test Case: \${tc.testCaseId}.\\\\n\\\\n**Test Case Description:**\\\\n\${tc.description}\`, 'To Do', 'High', 'bug', userIdStr, 'High']
          );
          
          createdBugKey = taskKey;
          
          await connection.query(
            "UPDATE QATestCases SET status = ?, linkedBugKey = ? WHERE id = ? AND projectId = ?",
            [status, createdBugKey, id, projectId]
          );
          
          // Try to log activity
          try {
             const { createAuditLog } = await import('./src/lib/audit');
             await createAuditLog(userIdStr as string, projectId, 'CREATE', 'Tasks', bugId, null, { title: \`Bug: \${tc.title}\` });
          } catch(e) {}
        } else {
          await connection.query(
            "UPDATE QATestCases SET status = ? WHERE id = ? AND projectId = ?",
            [status, id, projectId]
          );
        }
      }

      res.json({ status: "success", message: "Status updated successfully", statusValue: status, bugKey: createdBugKey });
    } catch (error: any) {
      console.error("PATCH /api/projects/:projectId/qa-test-cases/:id/status error:", error);
      res.status(500).json({ status: "error", message: error.message });
    } finally {
      if (connection) connection.release();
    }
  });`;

code = code.replace(oldPatchRoute, newPatchRoute);
fs.writeFileSync('server.ts', code);
console.log("Auto-create QA Bug logic injected into QA PATCH endpoint.");
