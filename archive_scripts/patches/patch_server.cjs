const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf-8');

const targetMigration = `      await addCol("Users", "phone", "VARCHAR(50)");`;
const replaceMigration = `      await addCol("Users", "phone", "VARCHAR(50)");
      await addCol("Tasks", "orderIndex", "INT NOT NULL DEFAULT 0");`;

code = code.replace(targetMigration, replaceMigration);

const targetSelect = `        "SELECT * FROM Tasks WHERE projectId = ? ORDER BY createdAt DESC LIMIT 2000",`;
const replaceSelect = `        "SELECT * FROM Tasks WHERE projectId = ? ORDER BY orderIndex ASC, createdAt DESC LIMIT 2000",`;

code = code.replace(targetSelect, replaceSelect);

fs.writeFileSync('server.ts', code);
