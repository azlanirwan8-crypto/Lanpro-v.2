const fs = require('fs');

let routesCode = fs.readFileSync('server/routes/task.routes.ts', 'utf8');
routesCode = routesCode.replace(/\\n/g, '\n');
fs.writeFileSync('server/routes/task.routes.ts', routesCode);

let controllerCode = fs.readFileSync('server/controllers/task.controller.ts', 'utf8');
controllerCode = controllerCode.replace(/\\n/g, '\n');
fs.writeFileSync('server/controllers/task.controller.ts', controllerCode);

console.log("Fixed newlines!");
