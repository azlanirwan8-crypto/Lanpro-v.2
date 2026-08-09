const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// 1. Add column
code = code.replace(
  'await addCol("Users", "phone", "VARCHAR(50)");',
  'await addCol("Users", "phone", "VARCHAR(50)");\n      await addCol("Users", "lastSeen", "VARCHAR(50)");'
);

// 2. Add API
const apiCode = `
  // Users Heartbeat API (Fallback for Vercel Serverless)
  app.post("/api/users/heartbeat", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) return res.status(401).json({ status: "error" });
      const token = authHeader.split(" ")[1];
      const decoded = jwt.verify(token, JWT_SECRET);
      const userId = decoded.id;
      
      const connection = await mysqlPool.getConnection();
      await connection.query(
        "UPDATE Users SET lastSeen = ? WHERE id = ?",
        [new Date().toISOString(), userId]
      );
      connection.release();
      res.json({ status: "success" });
    } catch (e) {
      // Ignore errors for heartbeat
      res.json({ status: "error", message: "Silent error" });
    }
  });

  // Users API
`;

code = code.replace(
  '// Users API',
  apiCode
);

fs.writeFileSync('server.ts', code);
console.log("Heartbeat API added.");
