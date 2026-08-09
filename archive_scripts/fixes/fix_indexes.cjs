const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const indexQueries = `
          // Add essential indexes for performance
          await connection.query("CREATE INDEX IF NOT EXISTS idx_tasks_projectId ON Tasks(projectId)");
          await connection.query("CREATE INDEX IF NOT EXISTS idx_tasks_status ON Tasks(status)");
          await connection.query("CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON Tasks(assigneeId)");
          await connection.query("CREATE INDEX IF NOT EXISTS idx_activity_logs_projectId ON ActivityLogs(projectId)");
          await connection.query("CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON ActivityLogs(createdAt)");
          await connection.query("CREATE INDEX IF NOT EXISTS idx_discussion_points_meetingId ON DiscussionPoints(meetingId)");
          await connection.query("CREATE INDEX IF NOT EXISTS idx_users_email ON Users(email)");
`;

code = code.replace(
  'console.log("Database tables checked/created.");',
  indexQueries + '\n          console.log("Database tables checked/created.");'
);
fs.writeFileSync('server.ts', code);
