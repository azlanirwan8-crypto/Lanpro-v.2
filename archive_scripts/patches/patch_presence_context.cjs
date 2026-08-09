const fs = require('fs');
let code = `import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { UserProfile } from '../types';

interface PresenceContextType {
  onlineUsers: UserProfile[];
  onlineUserIds: string[];
  isConnected: boolean;
}

const PresenceContext = createContext<PresenceContextType>({
  onlineUsers: [],
  onlineUserIds: [],
  isConnected: false,
});

export const usePresence = () => useContext(PresenceContext);

export const PresenceProvider: React.FC<{
  children: React.ReactNode;
  currentUser: UserProfile | null;
  socket: any;
}> = ({ children, currentUser, socket }) => {
  const [onlineUsers, setOnlineUsers] = useState<UserProfile[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!socket) return;

    const onConnect = () => {
      setIsConnected(true);
      if (currentUser) {
        socket.emit("join_presence", currentUser);
      }
    };

    const onDisconnect = () => {
      setIsConnected(false);
      setOnlineUsers([]);
    };

    const onPresenceSync = (users: UserProfile[]) => {
      setOnlineUsers(users);
    };

    if (socket.connected) {
      onConnect();
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('presence_sync', onPresenceSync);

    if (socket.connected && currentUser) {
      socket.emit("join_presence", currentUser);
    }

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('presence_sync', onPresenceSync);
    };
  }, [socket, currentUser]);

  const value = useMemo(() => {
    // Bring current user to the front if they exist
    let sortedUsers = [...onlineUsers];
    if (currentUser) {
      const activeUserUid = currentUser.uid || (currentUser as any).id;
      // Make sure currentUser is in the list just in case
      if (!sortedUsers.some(u => (u.uid || u.id) === activeUserUid)) {
        sortedUsers = [currentUser, ...sortedUsers];
      } else {
        const cuIndex = sortedUsers.findIndex(u => (u.uid || u.id) === activeUserUid);
        if (cuIndex > 0) {
          const cu = sortedUsers.splice(cuIndex, 1)[0];
          sortedUsers.unshift(cu);
        }
      }
    }

    // Optional: deduplicate users by ID
    const uniqueUsersMap = new Map();
    sortedUsers.forEach(u => {
      const id = u.uid || u.id;
      if (!uniqueUsersMap.has(id)) {
        uniqueUsersMap.set(id, u);
      }
    });
    sortedUsers = Array.from(uniqueUsersMap.values());

    return {
      onlineUsers: sortedUsers,
      onlineUserIds: sortedUsers.map(u => u.uid || u.id),
      isConnected
    };
  }, [onlineUsers, isConnected, currentUser]);

  return (
    <PresenceContext.Provider value={value}>
      {children}
    </PresenceContext.Provider>
  );
};
`;
fs.writeFileSync('src/contexts/PresenceContext.tsx', code);
console.log("Patched PresenceContext.tsx to pure Realtime.");
