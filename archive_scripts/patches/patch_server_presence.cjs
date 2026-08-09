const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const globalMaps = `  // Socket.io Real-time implementation
  const projectPresence: Record<string, any[]> = {};
  const chatSockets = new Map<string, Set<string>>(); // userId -> Set of socketIds

  // NEW: Global Presence Map (userId -> userProfile)
  const globalPresence = new Map<string, any>();
  const globalPresenceSockets = new Map<string, string>(); // socketId -> userId`;

code = code.replace(
  '  // Socket.io Real-time implementation\n  const projectPresence: Record<string, any[]> = {};\n  const chatSockets = new Map<string, Set<string>>(); // userId -> Set of socketIds',
  globalMaps
);

const globalJoin = `    // Live Chat Socket Handlers
    
    // NEW: Global Presence Join
    socket.on("join_presence", (user) => {
      if (user && (user.id || user.uid)) {
        const userId = user.uid || user.id;
        
        // Add or update user in global presence map
        globalPresence.set(userId, user);
        globalPresenceSockets.set(socket.id, userId);
        
        // Broadcast the full list of online users to everyone
        io.emit("presence_sync", Array.from(globalPresence.values()));
        console.log(\`[GLOBAL PRESENCE] User \${user.displayName || user.username || userId} joined. Total online: \${globalPresence.size}\`);
      }
    });`;

code = code.replace('    // Live Chat Socket Handlers', globalJoin);

const globalDisconnect = `    socket.on("disconnect", () => {
      socketActiveConnections.dec();
      
      // NEW: Remove from global presence
      const globalUserId = globalPresenceSockets.get(socket.id);
      if (globalUserId) {
        globalPresenceSockets.delete(socket.id);
        
        // Check if user has other active sockets
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
          console.log(\`[GLOBAL PRESENCE] User \${globalUserId} disconnected completely. Total online: \${globalPresence.size}\`);
        }
      }`;

code = code.replace('    socket.on("disconnect", () => {\n      socketActiveConnections.dec();', globalDisconnect);

fs.writeFileSync('server.ts', code);
console.log("Patched server.ts with Global Presence.");
