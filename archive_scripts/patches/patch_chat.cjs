const fs = require('fs');
let code = fs.readFileSync('src/components/LiveChatWidget.tsx', 'utf8');

// 1. Add import
code = code.replace(
  'import { UserProfile } from "../types";',
  'import { UserProfile } from "../types";\nimport { usePresence } from "../contexts/PresenceContext";'
);

// 2. Remove useState for onlineUserIds
code = code.replace(
  'const [onlineUserIds, setOnlineUserIds] = useState<string[]>([]);',
  'const { onlineUserIds } = usePresence();'
);

// 3. Remove socket.emit("get_online_users") and socket.on events that mutate onlineUserIds
const getOnlineUsers = `    // Ask server for active online users list
    socket.emit("get_online_users", (users: string[]) => {
      setOnlineUserIds(users.filter(id => id !== currentUser.id));
    });`;
code = code.replace(getOnlineUsers, '');

const handleUserOnline = `    const handleUserOnline = (userId: string) => {
      if (userId !== currentUser.id) {
        setOnlineUserIds(prev => prev.includes(userId) ? prev : [...prev, userId]);
      }
    };`;
code = code.replace(handleUserOnline, '');

const handleUserOffline = `    const handleUserOffline = (userId: string) => {
      setOnlineUserIds(prev => prev.filter(id => id !== userId));
    };`;
code = code.replace(handleUserOffline, '');

code = code.replace('socket.on("user_online", handleUserOnline);', '');
code = code.replace('socket.on("user_offline", handleUserOffline);', '');
code = code.replace('socket.off("user_online", handleUserOnline);', '');
code = code.replace('socket.off("user_offline", handleUserOffline);', '');

fs.writeFileSync('src/components/LiveChatWidget.tsx', code);
console.log("LiveChatWidget patched to use Global Presence.");
