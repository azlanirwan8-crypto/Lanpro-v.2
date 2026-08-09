import React from 'react';
import { cn } from '../../lib/utils';
import { UserProfile } from '../../types';

export const getUserAvatarColors = (uid: string) => {
  const colors = [
    { bg: 'bg-blue-100', text: 'text-blue-600', border: 'border-blue-200' },
    { bg: 'bg-emerald-100', text: 'text-emerald-600', border: 'border-emerald-200' },
    { bg: 'bg-violet-100', text: 'text-violet-600', border: 'border-violet-200' },
    { bg: 'bg-amber-100', text: 'text-amber-600', border: 'border-amber-200' },
    { bg: 'bg-rose-100', text: 'text-rose-600', border: 'border-rose-200' },
    { bg: 'bg-indigo-100', text: 'text-indigo-600', border: 'border-indigo-200' },
    { bg: 'bg-cyan-100', text: 'text-cyan-600', border: 'border-cyan-200' },
    { bg: 'bg-orange-100', text: 'text-orange-600', border: 'border-orange-200' },
    { bg: 'bg-fuchsia-100', text: 'text-fuchsia-600', border: 'border-fuchsia-200' },
  ];
  
  // Simple hash to select color
  let hash = 0;
  const targetUid = uid || '';
  for (let i = 0; i < targetUid.length; i++) {
    hash = targetUid.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;
  return colors[index];
};

export const UserAvatar: React.FC<{ name?: string; uid?: string; members?: UserProfile[]; user?: UserProfile | any; className?: string }> = ({ name, uid, members, user, className }) => {
  const [imgError, setImgError] = React.useState(false);
  const member = user || (members && uid ? members.find(m => m.uid === uid || (m as any).id === uid) : undefined);
  const displayName = name || user?.name || user?.displayName || member?.displayName || member?.email || 'User';
  const photo = user?.avatar || user?.photoURL || (member as any)?.avatar || member?.photoURL;
  const initials = displayName.charAt(0).toUpperCase();
  const colors = getUserAvatarColors(member?.uid || (member as any)?.id || uid || '');
  
  return (
    <div 
      className={cn(
        "rounded-full flex items-center justify-center text-[10px] font-black shadow-sm border overflow-hidden shrink-0", 
        colors.bg, 
        colors.text, 
        !className?.includes('border-') && colors.border,
        className || "w-6 h-6"
      )}
      title={displayName}
    >
      {photo && !imgError ? (
        <img 
          src={photo} 
          alt="" 
          className="w-full h-full object-cover" 
          referrerPolicy="no-referrer"
          onError={() => setImgError(true)}
        />
      ) : (
        <span>{initials}</span>
      )}
    </div>
  );
};
