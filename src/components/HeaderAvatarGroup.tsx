import React from 'react';
import { usePresence } from '../contexts/PresenceContext';
import { UserAvatar } from './ui/UserAvatar';
import { UserProfile } from '../types';

interface HeaderAvatarGroupProps {
  allUsers: UserProfile[];
  currentUserUid?: string;
}

export const HeaderAvatarGroup: React.FC<HeaderAvatarGroupProps> = ({ allUsers, currentUserUid }) => {
  const { onlineUsers } = usePresence();

  // Retain the last stable list of online users to prevent flashing/flickering back to 1 avatar
  const [stableOnlineUsers, setStableOnlineUsers] = React.useState<UserProfile[]>(() => {
    try {
      const cached = localStorage.getItem('lanpro_cached_header_online_users');
      return cached ? JSON.parse(cached) : onlineUsers;
    } catch {
      return onlineUsers;
    }
  });

  React.useEffect(() => {
    if (onlineUsers && onlineUsers.length > 1) {
      setStableOnlineUsers(onlineUsers);
      try {
        localStorage.setItem('lanpro_cached_header_online_users', JSON.stringify(onlineUsers));
      } catch (e) {
        console.warn('Failed to cache online users in localStorage:', e);
      }
    } else if (onlineUsers && onlineUsers.length === 1 && stableOnlineUsers.length > 1) {
      // If the list drops to just ourselves, hold the stable list for up to 10 seconds to let HTTP/socket reconnect finish
      const timer = setTimeout(() => {
        setStableOnlineUsers(onlineUsers);
        try {
          localStorage.setItem('lanpro_cached_header_online_users', JSON.stringify(onlineUsers));
        } catch (e) {}
      }, 10000);
      return () => clearTimeout(timer);
    } else {
      if (onlineUsers && onlineUsers.length > 0) {
        setStableOnlineUsers(onlineUsers);
        try {
          localStorage.setItem('lanpro_cached_header_online_users', JSON.stringify(onlineUsers));
        } catch (e) {}
      }
    }
  }, [onlineUsers]);

  const displayUsers = stableOnlineUsers.length > 0 ? stableOnlineUsers : onlineUsers;

  return (
    <div className="flex -space-x-2 overflow-hidden py-1 px-1">
      {displayUsers.slice(0, 5).map((member) => {
        const isCurrentUser = member.uid === currentUserUid || member.id === currentUserUid;
        
        return (
          <div key={member.uid || member.id} className="relative group shrink-0">
            <UserAvatar
              uid={member.uid || member.id}
              user={member}
              members={allUsers}
              className={`w-8 h-8 border-2 ${
                isCurrentUser 
                  ? 'border-indigo-400 ring-2 ring-indigo-100 z-10' 
                  : 'border-white ring-1 ring-slate-100'
              } relative group-hover:z-20 group-hover:scale-110 transition-all shadow-sm`}
            />
            {/* Indikator Online: Bullet hijau */}
            <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white absolute bottom-0 right-0 z-20"></span>
            
            {/* Tooltip Nama Pengguna */}
            <div className="absolute top-10 left-1/2 -translate-x-1/2 px-2.5 py-1.5 bg-slate-800 text-white text-[10px] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-30 flex flex-col items-center">
              <span className="font-semibold">
                {member.displayName || member.name || member.username || "Anggota Tim"} {isCurrentUser ? "(Anda)" : ""}
              </span>
              <span className="text-[8px] text-slate-300 capitalize mt-0.5">{member.role || "User"}</span>
            </div>
          </div>
        );
      })}
      
      {displayUsers.length > 5 && (
        <div className="w-8 h-8 rounded-full border-2 border-white bg-slate-50 flex items-center justify-center text-[10px] font-black text-slate-500 shadow-sm ring-1 ring-slate-200 z-0 relative hover:z-10 hover:bg-slate-100 transition-all cursor-default shrink-0">
          +{displayUsers.length - 5}
        </div>
      )}
    </div>
  );
};
