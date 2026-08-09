const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(
  'socket.on("join_presence", (user) => {',
  `socket.on("leave_presence", () => {
      const globalUserId = globalPresenceSockets.get(socket.id);
      if (globalUserId) {
        globalPresenceSockets.delete(socket.id);
        let hasOtherSockets = false;
        for (const [sId, uId] of globalPresenceSockets.entries()) {
          if (uId === globalUserId) {
            hasOtherSockets = true;
            break;
          }
        }
        if (!hasOtherSockets) {
          globalPresence.delete(globalUserId);
          io.emit("presence_sync", Array.from(globalPresence.values()));
          console.log(\`[GLOBAL PRESENCE] User \${globalUserId} left via leave_presence. Total online: \${globalPresence.size}\`);
        }
      }
    });

    socket.on("join_presence", (user) => {`
);

fs.writeFileSync('server.ts', code);
console.log("Patched server.ts with leave_presence");
