const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
  '<PresenceProvider allUsers={allUsers} currentUser={currentUser} selectedProject={selectedProject} socketOnlineUsers={onlineUsers}>',
  '<PresenceProvider currentUser={currentUser} socket={socket}>'
);

fs.writeFileSync('src/App.tsx', code);
console.log("Patched App.tsx PresenceProvider.");
