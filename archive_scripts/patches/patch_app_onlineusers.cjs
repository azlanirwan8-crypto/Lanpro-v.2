const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
  '    socket.on("PRESENCE_UPDATE", (users: any[]) => {\n       setOnlineUsers(users);\n    });',
  '    socket.on("PRESENCE_UPDATE", (users: any[]) => {\n       // Deprecated in favor of global presence_sync\n    });'
);

fs.writeFileSync('src/App.tsx', code);
console.log("Patched App.tsx PRESENCE_UPDATE.");
