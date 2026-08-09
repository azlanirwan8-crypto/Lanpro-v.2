import React, { createContext, useContext, useEffect, useState, useMemo, useRef } from 'react';
import { UserProfile } from '../types';
import { apiRequest } from '../lib/api';
import { useAppStore } from '../store/useAppStore';

interface PresenceContextType {
  onlineUsers: UserProfile[];
  onlineUserIds: string[];
  isConnected: boolean;
  reconnectPresence: () => Promise<void>;
}

const PresenceContext = createContext<PresenceContextType>({
  onlineUsers: [],
  onlineUserIds: [],
  isConnected: false,
  reconnectPresence: async () => {},
});

export const usePresence = () => useContext(PresenceContext);

export const PresenceProvider: React.FC<{
  children: React.ReactNode;
  currentUser: UserProfile | null;
  socket: any;
  allUsers: UserProfile[];
}> = ({ children, currentUser, socket, allUsers }) => {
  const { setAllUsers } = useAppStore();
  const [socketOnlineUsers, setSocketOnlineUsers] = useState<UserProfile[]>([]);
  const [httpOnlineUsers, setHttpOnlineUsers] = useState<UserProfile[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  const currentUserUid = currentUser?.uid || currentUser?.id || '';
  const currentUserRef = useRef<UserProfile | null>(currentUser);

  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  // Retain last known successful state in local state + localStorage to prevent screen flashing/avatar resets
  const [retainedOnlineUsers, setRetainedOnlineUsers] = useState<UserProfile[]>(() => {
    try {
      const stored = localStorage.getItem('lanpro_last_online_users');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Dual-Engine sync endpoint ping
  const syncPresenceHTTP = async () => {
    const activeUser = currentUserRef.current;
    if (!activeUser) return;
    try {
      const data = await apiRequest('/api/presence/ping', { method: 'POST' });
      if (data.status === 'success') {
        const online = data.onlineUsers || [];
        const latestAllUsers = data.allUsers || [];
        setHttpOnlineUsers(online);
        setAllUsers(latestAllUsers);
        
        if (online.length > 0) {
          localStorage.setItem('lanpro_last_online_users', JSON.stringify(online));
          setRetainedOnlineUsers(online);
        }
      }
    } catch (err) {
      console.warn('[PRESENCEFALLBACK] HTTP presence fallback ping failed:', err);
    }
  };

  const syncPresenceRedis = async () => {
    const activeUser = currentUserRef.current;
    if (!activeUser) return;
    try {
      const data = await apiRequest('/api/presence/sync', { method: 'GET' });
      if (data.status === 'success') {
        const online = data.onlineUsers || [];
        setHttpOnlineUsers(online);
        
        if (online.length > 0) {
          localStorage.setItem('lanpro_last_online_users', JSON.stringify(online));
          setRetainedOnlineUsers(online);
        }
      }
    } catch (err) {
      console.warn('[PRESENCEFALLBACK] HTTP presence Redis sync failed, falling back to ping:', err);
      await syncPresenceHTTP();
    }
  };

  const reconnectPresence = async () => {
    console.log('[PRESENCE] Reconnecting presence...');
    const activeUser = currentUserRef.current;
    // Emit socket join if possible
    if (socket && socket.connected && activeUser) {
      socket.emit("join_presence", activeUser);
    }
    // Pull from Redis sync endpoint first, fallback to fallback ping
    await syncPresenceRedis();
  };

  // Socket connection listeners
  useEffect(() => {
    if (!socket) return;

    const onConnect = () => {
      setIsConnected(true);
      const activeUser = currentUserRef.current;
      if (activeUser) {
        socket.emit("join_presence", activeUser);
      }
    };

    const onDisconnect = () => {
      setIsConnected(false);
    };

    const onPresenceSync = (users: UserProfile[]) => {
      setSocketOnlineUsers(users);
      if (users.length > 0) {
        localStorage.setItem('lanpro_last_online_users', JSON.stringify(users));
        setRetainedOnlineUsers(users);
      }
    };

    if (socket.connected) {
      onConnect();
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('presence_sync', onPresenceSync);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('presence_sync', onPresenceSync);
    };
  }, [socket, currentUserUid]);

  // Tab visibility and window focus listeners
  useEffect(() => {
    if (!currentUserUid) return;

    const handleFocusAndVisibility = () => {
      if (document.visibilityState === 'visible') {
        reconnectPresence();
      }
    };

    window.addEventListener('focus', handleFocusAndVisibility);
    document.addEventListener('visibilitychange', handleFocusAndVisibility);

    return () => {
      window.removeEventListener('focus', handleFocusAndVisibility);
      document.removeEventListener('visibilitychange', handleFocusAndVisibility);
    };
  }, [currentUserUid, socket]);

  // Regular HTTP Heartbeat Fallback Polling Loop (Runs regardless of socket connection status for resilience)
  useEffect(() => {
    if (!currentUserUid) return;
    
    // Initial ping
    syncPresenceHTTP();

    // Loop every 12 seconds
    const intervalId = setInterval(syncPresenceHTTP, 12000);

    return () => clearInterval(intervalId);
  }, [currentUserUid]);

  const value = useMemo(() => {
    const activeUserUid = currentUser?.uid || currentUser?.id;
    
    // Combine socket real-time presence with DB presence
    const socketUserIds = socketOnlineUsers.map(u => u.uid || u.id);
    const httpUserIds = httpOnlineUsers.map(u => u.uid || u.id);

    let online = allUsers.filter(u => {
      const uid = u.uid || u.id;
      // Diri sendiri selalu online
      if (uid === activeUserUid) return true;
      
      // Realtime murni socket
      if (socketUserIds.includes(uid)) return true;

      // DB-based heartbeat fallback
      if (httpUserIds.includes(uid)) return true;

      // Check lastSeen in DB within last 30s
      if (u.lastSeen) {
        const lastSeenTime = new Date(u.lastSeen).getTime();
        const diffSeconds = (Date.now() - lastSeenTime) / 1000;
        if (diffSeconds < 30) return true;
      }
      
      return false;
    });

    // If online list is empty but we have retained users, use retained list to prevent flicker/empty avatar stack
    if (online.length <= 1 && retainedOnlineUsers.length > 0) {
      // Filter out any users not in allUsers to make sure profiles are accurate
      const retainedMapped = retainedOnlineUsers.map(ru => {
        const found = allUsers.find(au => (au.uid || au.id) === (ru.uid || ru.id));
        return found || ru;
      });
      online = retainedMapped;
    }

    // Bring current user to the front
    if (currentUser) {
      const currentId = currentUser.uid || currentUser.id;
      if (!online.some(u => (u.uid || u.id) === currentId)) {
        online = [currentUser, ...online];
      } else {
        const cuIndex = online.findIndex(u => (u.uid || u.id) === currentId);
        if (cuIndex > 0) {
          const cu = online.splice(cuIndex, 1)[0];
          online.unshift(cu);
        }
      }
    }

    // Deduplicate
    const uniqueUsersMap = new Map();
    online.forEach(u => {
      const id = u.uid || u.id;
      if (id) {
        uniqueUsersMap.set(id, u);
      }
    });
    const sortedUsers = Array.from(uniqueUsersMap.values());

    return {
      onlineUsers: sortedUsers,
      onlineUserIds: sortedUsers.map(u => u.uid || u.id),
      isConnected,
      reconnectPresence
    };
  }, [socketOnlineUsers, httpOnlineUsers, isConnected, currentUser, allUsers, retainedOnlineUsers]);

  return (
    <PresenceContext.Provider value={value}>
      {children}
    </PresenceContext.Provider>
  );
};
