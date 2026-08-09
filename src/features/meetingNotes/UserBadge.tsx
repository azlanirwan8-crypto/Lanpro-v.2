import React from 'react';
import { cn } from '../../lib/utils';

interface UserBadgeProps {
  authorId: string;
  users: { uid: string; displayName?: string | null; username?: string | null; role?: string }[];
  className?: string;
  showRole?: boolean;
  showName?: boolean;
}

export const UserBadge = ({ authorId, users, className, showRole = false, showName = true }: UserBadgeProps) => {
  const getAuthorDisplay = (id: string, memberList: any[]) => {
    const user = memberList.find(u => u.uid === id);
    if (!user) {
      if (id === 'admin') return { name: 'Admin Manager', initial: 'AM', isSystem: true, role: 'admin' };
      return { name: id || 'Unknown', initial: 'U', isSystem: false, role: 'member' };
    }
    const name = user.role === 'admin' ? 'Admin' : (user?.displayName || user?.username || 'User');
    const initial = name.split(' ').filter(Boolean).map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() || 'U';
    return { name, initial, isSystem: false, role: user.role };
  };

  const { name, initial, role } = getAuthorDisplay(authorId, users);

  // Generate consistent color hash based on author ID
  const getAvatarColor = (id: string) => {
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      hash = id.charCodeAt(i) + ((hash << 5) - hash);
    }
    const colors = [
      "bg-indigo-55 bg-indigo-50/80 text-indigo-700 border-indigo-200/40",
      "bg-emerald-55 bg-emerald-50/80 text-emerald-700 border-emerald-200/40",
      "bg-sky-55 bg-sky-50/80 text-sky-700 border-sky-200/40",
      "bg-amber-55 bg-amber-50/80 text-amber-705 text-amber-800 border-amber-200/40",
      "bg-rose-55 bg-rose-50/80 text-rose-700 border-rose-200/40",
      "bg-purple-55 bg-purple-50/80 text-purple-700 border-purple-200/40",
      "bg-cyan-55 bg-cyan-50/80 text-cyan-700 border-cyan-200/40",
      "bg-teal-55 bg-teal-50/80 text-teal-700 border-teal-200/40"
    ];
    return colors[Math.abs(hash) % colors.length];
  };

  const colorClasses = getAvatarColor(authorId);

  return (
    <div 
      className={cn("inline-flex items-center gap-2 max-w-full text-left group/avatar relative cursor-pointer", className)}
      title={name}
    >
      <div className={cn(
        "w-6 h-6 rounded-md flex items-center justify-center text-[9px] font-extrabold border tracking-wider uppercase shrink-0 select-none shadow-sm/30 group-hover/avatar:scale-110 transition-transform",
        colorClasses
      )}>
        {initial}
      </div>
      {showName && (
        <div className="flex flex-col min-w-0">
          <span className="truncate text-xs font-semibold text-slate-700 leading-tight">
            {name}
          </span>
          {showRole && role && (
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider leading-none mt-0.5">
              {role}
            </span>
          )}
        </div>
      )}

      {/* Floating Hover Tooltip (NAME ONLY) */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover/avatar:flex flex-col items-center z-50 pointer-events-none animate-in fade-in zoom-in-95 duration-150">
        <div className="bg-slate-900 text-white px-2.5 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap shadow-xl border border-slate-800">
          <span>{name}</span>
        </div>
        <div className="w-2 h-2 bg-slate-900 rotate-45 -mt-1"></div>
      </div>
    </div>
  );
};
