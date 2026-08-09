const fs = require('fs');
let code = fs.readFileSync('src/contexts/PresenceContext.tsx', 'utf8');

code = code.replace(
  /const now = Date\.now\(\);\s*const twoMinsAgo = now - \(2 \* 60 \* 1000\);\s*const socketUserIds = socketOnlineUsers\.map\(u => u\.uid \|\| u\.id\);\s*let online = allUsers\.filter\(u => {[\s\S]*?return false;\s*}\);/m,
  `const socketUserIds = socketOnlineUsers.map(u => u.uid || u.id);
    
    let online = allUsers.filter(u => {
      const uid = u.uid || u.id;
      // Diri sendiri selalu online
      if (uid === activeUserUid) return true;
      
      // Jika ada di daftar socket, pasti online (Realtime Murni)
      if (socketUserIds.includes(uid)) return true;
      
      return false;
    });`
);

fs.writeFileSync('src/contexts/PresenceContext.tsx', code);
console.log("Patched PresenceContext.tsx to be purely real-time");
