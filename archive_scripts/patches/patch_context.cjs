const fs = require('fs');
let code = fs.readFileSync('src/contexts/PresenceContext.tsx', 'utf8');

code = code.replace(
  'selectedProject: Project | null;',
  'selectedProject: Project | null;\n  socketOnlineUsers?: UserProfile[];'
);

code = code.replace(
  '({ children, allUsers, currentUser, selectedProject })',
  '({ children, allUsers, currentUser, selectedProject, socketOnlineUsers = [] })'
);

const oldLogic = `let online = allUsers.filter(u => {
      // Current user is always online
      if (u.uid === activeUserUid || u.id === activeUserUid) return true;
      
      // Check lastSeen
      if (u.lastSeen) {
        try {
          const lastSeenTime = new Date(u.lastSeen).getTime();
          if (lastSeenTime > twoMinsAgo) return true;
        } catch (e) {
          // ignore
        }
      }
      return false;
    });`;

const newLogic = `
    const socketOnlineUserIds = socketOnlineUsers.map(u => u.id || u.uid);

    let online = allUsers.filter(u => {
      // Current user is always online
      if (u.uid === activeUserUid || u.id === activeUserUid) return true;
      
      // If user is in socket's online list, they are online
      if (socketOnlineUserIds.includes(u.uid) || socketOnlineUserIds.includes(u.id)) return true;

      // Check lastSeen fallback
      if (u.lastSeen) {
        try {
          const lastSeenTime = new Date(u.lastSeen).getTime();
          if (lastSeenTime > twoMinsAgo) return true;
        } catch (e) {
          // ignore
        }
      }
      return false;
    });`;

code = code.replace(oldLogic, newLogic);

code = code.replace(
  '[allUsers, currentUser, selectedProject?.id, selectedProject?.members?.length]',
  '[allUsers, currentUser, selectedProject?.id, selectedProject?.members?.length, socketOnlineUsers]'
);

fs.writeFileSync('src/contexts/PresenceContext.tsx', code);
console.log("Patched PresenceContext to use socketOnlineUsers.");
