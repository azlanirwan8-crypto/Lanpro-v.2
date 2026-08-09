const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const oldLocking = `      connection = await mysqlPool.getConnection();
      
      const [existing]: any = await connection.query("SELECT * FROM Tasks WHERE id = ? AND projectId = ?", [id, projectId]);
      if (existing.length === 0) {
        return res.status(404).json({ status: "error", message: "Task not found" });
      }`;

const newLocking = `      connection = await mysqlPool.getConnection();
      
      const [existing]: any = await connection.query("SELECT * FROM Tasks WHERE id = ? AND projectId = ?", [id, projectId]);
      if (existing.length === 0) {
        return res.status(404).json({ status: "error", message: "Task not found" });
      }
      
      const currentTask = existing[0];
      // Optimistic Locking Check
      if (version !== undefined && currentTask.version !== undefined && version < currentTask.version) {
        return res.status(409).json({ 
          status: "error", 
          code: "CONFLICT_OPTIMISTIC_LOCK", 
          message: "Data task ini telah diubah oleh pengguna lain. Harap refresh halaman untuk melihat versi terbaru."
        });
      }`;

code = code.replace(oldLocking, newLocking);

const oldUpdate = `await connection.query(
        \`UPDATE Tasks SET \${setQuery} WHERE id = ? AND projectId = ?\`,
        [...values, id, projectId]
      );`;

const newUpdate = `
      // Auto-increment version on every update
      if (setQuery.length > 0) {
        setQuery += ", version = version + 1";
      } else {
        setQuery = "version = version + 1";
      }
      
      await connection.query(
        \`UPDATE Tasks SET \${setQuery} WHERE id = ? AND projectId = ?\`,
        [...values, id, projectId]
      );`;
code = code.replace(oldUpdate, newUpdate);

fs.writeFileSync('server.ts', code);
console.log("Optimistic locking applied");
