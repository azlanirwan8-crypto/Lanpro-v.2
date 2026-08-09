const fs = require('fs');
let code = fs.readFileSync('src/contexts/PresenceContext.tsx', 'utf8');

code = code.replace(
  'if (socket.connected && currentUser) {',
  `if (socket.connected) {
      if (currentUser) {
        socket.emit("join_presence", currentUser);
      } else {
        socket.emit("leave_presence");
      }
    }

    if (socket.connected && currentUser) { // Just to match replace`
);

fs.writeFileSync('src/contexts/PresenceContext.tsx', code);
console.log("Patched PresenceContext.tsx with leave_presence on currentUser change");
