const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
  '<PresenceProvider currentUser={currentUser} socket={socket}>',
  '<PresenceProvider currentUser={currentUser} socket={socket} allUsers={allUsers}>'
);

fs.writeFileSync('src/App.tsx', code);
console.log("Patched App.tsx for PresenceProvider allUsers.");
