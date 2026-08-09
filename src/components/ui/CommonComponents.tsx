import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  ChevronDown, ChevronsUp, ChevronUp, Equal, ChevronDown as ChevronDownIcon, 
  ChevronsDown, MinusCircle, Zap, CheckCircle2, CircleDot, Bug, Users, FileText, 
  User as UserIcon
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { MasterData, UserProfile } from '../../types';
import { RenderIcon } from '../RenderIcon';

export const UserAvatar = ({ uid, members, className, size = 'md' }: { uid: string; members: UserProfile[]; className?: string; size?: 'sm' | 'md' | 'lg' }) => {
  const [imgError, setImgError] = useState(false);
  const member = members.find(m => m.uid === uid);
  const sizeClasses = {
    sm: 'w-6 h-6 text-[10px]',
    md: 'w-8 h-8 text-[12px]',
    lg: 'w-12 h-12 text-[16px]'
  };
  
  const initials = member?.displayName ? member.displayName.split(' ').map(n => n[0]).join('') : '?';
  
  return (
    <div className={cn(
      "flex items-center justify-center bg-slate-100 rounded-full text-slate-500 font-bold overflow-hidden shrink-0 border border-slate-200/50",
      sizeClasses[size],
      className
    )}>
      {member?.photoURL && !imgError ? (
        <img 
          src={member.photoURL} 
          alt="" 
          className="w-full h-full object-cover" 
          referrerPolicy="no-referrer" 
          onError={() => setImgError(true)}
        />
      ) : (
        <span className="select-none">{initials.substring(0, 2).toUpperCase()}</span>
      )}
    </div>
  );
};

export const UserBadge = ({ uid, members, onClick, className }: { uid: string; members: UserProfile[]; onClick?: () => void; className?: string }) => {
  const member = members.find(m => m.uid === uid);
  return (
    <div 
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 pr-3 pl-1 py-1 rounded-full bg-slate-100/50 hover:bg-slate-200/50 transition-all cursor-pointer border border-transparent hover:border-slate-200 group",
        className
      )}
    >
      <UserAvatar uid={uid} members={members} size="sm" />
      <span className="text-xs font-bold text-slate-600 group-hover:text-slate-900 truncate">
        {member?.displayName || member?.email?.split('@')[0] || 'Unknown'}
      </span>
    </div>
  );
};

export const PriorityIcon = ({ priority, className, masterData }: { priority: string; className?: string; masterData?: MasterData[] }) => {
  const p = masterData?.find(d => d.type === 'priority' && d.label?.toLowerCase() === priority?.toLowerCase());
  const iconProps = { className: cn("w-4 h-4", className) };
  
  if (p?.icon) {
    return <RenderIcon iconName={p.icon} className={iconProps.className} style={{ color: p.color }} />;
  }

  const pLowerCase = priority?.toLowerCase() || '';
  if (pLowerCase.includes('blocker') || pLowerCase.includes('highest')) return <ChevronsUp {...iconProps} className="text-red-600 font-black" />;
  if (pLowerCase.includes('critical') || pLowerCase.includes('high')) return <ChevronUp {...iconProps} className="text-orange-600 font-black" />;
  if (pLowerCase.includes('major') || pLowerCase.includes('medium')) return <Equal {...iconProps} className="text-amber-500" />;
  if (pLowerCase.includes('minor') || pLowerCase.includes('low')) return <ChevronDownIcon {...iconProps} className="text-blue-500" />;
  if (pLowerCase.includes('lowest')) return <ChevronsDown {...iconProps} className="text-sky-400" />;
  if (pLowerCase.includes('hold')) return <MinusCircle {...iconProps} className="text-slate-400" />;
  
  return <Equal {...iconProps} className="text-slate-300" />;
};

export const TypeIcon = ({ type, className, masterData }: { type: string; className?: string; masterData?: MasterData[] }) => {
  const t = masterData?.find(d => d.type === 'issue_type' && d.label?.toLowerCase() === type?.toLowerCase());
  const iconProps = { className: cn("w-4 h-4", className) };
  
  if (t?.icon) {
    return <RenderIcon iconName={t.icon} className={iconProps.className} style={{ color: t.color }} />;
  }

  const tLowerCase = type?.toLowerCase() || '';
  switch (true) {
    case tLowerCase === 'epic': return <Zap {...iconProps} className="text-purple-500" />;
    case tLowerCase === 'task': return <CheckCircle2 {...iconProps} className="text-blue-500" />;
    case tLowerCase === 'subtask': return <CircleDot {...iconProps} className="text-sky-500" />;
    case tLowerCase === 'bug': return <Bug {...iconProps} className="text-red-500" />;
    case tLowerCase === 'meeting': return <Users {...iconProps} className="text-amber-500" />;
    case tLowerCase === 'document': return <FileText {...iconProps} className="text-slate-500" />;
    default: return <CircleDot {...iconProps} className="text-slate-400" />;
  }
};

const getStatusClasses = (val: string) => {
  if (!val) return "bg-slate-50 text-slate-600 border-slate-200";
  const normalized = val.toLowerCase().trim();
  if (normalized.includes('to do') || normalized.includes('rencana') || normalized.includes('backlog')) {
    return "bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-100 dark:bg-sky-950/30 dark:text-sky-400 dark:border-sky-900";
  }
  if (normalized.includes('in progress') || normalized.includes('dikerjakan') || normalized.includes('doing') || normalized.includes('progress') || normalized.includes('uji')) {
    return "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900";
  }
  if (normalized.includes('done') || normalized.includes('selesai') || normalized.includes('completed') || normalized.includes('closed') || normalized.includes('ready')) {
    return "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900";
  }
  return "bg-violet-50 text-violet-700 border-violet-200 hover:bg-violet-100 dark:bg-violet-950/30 dark:text-violet-400 dark:border-violet-900";
};

const getPriorityClasses = (val: string) => {
  if (!val) return "bg-slate-50 text-slate-600 border-slate-200";
  const normalized = val.toLowerCase().trim();
  if (normalized.includes('high') || normalized.includes('critical') || normalized.includes('tinggi') || normalized.includes('mendesak')) {
    return "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-900";
  }
  if (normalized.includes('medium') || normalized.includes('sedang')) {
    return "bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100 dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-900";
  }
  if (normalized.includes('low') || normalized.includes('rendah')) {
    return "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700";
  }
  return "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700";
};

export const StyledDropdown = ({ value, onChange, options, type, masterData, className, buttonClassName, disabled, members = [], customButton }: { value: string; onChange: (val: string) => void; options: {id: string, label: string, color?: string, icon?: string}[]; type?: string; masterData: MasterData[]; className?: string; buttonClassName?: string; disabled?: boolean; members?: UserProfile[]; customButton?: (selected: any) => React.ReactNode }) => {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLDivElement>(null);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });
  
  // De-duplicate options to prevent duplicate key errors
  const safeOptions = Array.from(new Map((options || []).map(o => [o.id, o])).values());
  const selected = safeOptions.find(o => o.id === value);

  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const dropdownHeight = Math.min(safeOptions.length * 36 + 20, 300);
      const spaceBelow = viewportHeight - rect.bottom;
      
      let top = rect.bottom;
      if (spaceBelow < dropdownHeight && rect.top > dropdownHeight) {
        top = rect.top - dropdownHeight;
      }

      setDropdownPos({
        top: top + window.scrollY,
        left: rect.left + window.scrollX,
        width: Math.max(rect.width, 160)
      });
    }
  }, [isOpen, safeOptions.length]);

  const isStatus = type === 'status';
  const isPriority = type === 'priority';

  return (
    <div className={cn("relative", className)}>
      {customButton ? (
        <div 
          ref={buttonRef}
          onClick={(e) => { e.stopPropagation(); !disabled && setIsOpen(!isOpen); }}
          className="cursor-pointer"
        >
          {customButton(selected)}
        </div>
      ) : (
        <button 
          ref={buttonRef as any}
          onClick={(e) => { e.stopPropagation(); !disabled && setIsOpen(!isOpen); }}
          disabled={disabled}
          className={cn(
            "flex items-center gap-2 group/dd transition-all cursor-pointer w-full justify-between focus:ring-2 focus:ring-blue-100",
            isStatus ? cn("px-3 py-1 border rounded-full font-black text-[10px] tracking-wider uppercase shadow-sm transition-colors", getStatusClasses(selected?.label || value)) : 
            isPriority ? cn("px-2.5 py-1.5 border rounded-md font-extrabold text-[10px] tracking-wider uppercase shadow-sm transition-colors", getPriorityClasses(selected?.label || value)) :
            "px-2 py-1 bg-white border border-transparent hover:border-slate-200 rounded",
            disabled && "opacity-50 cursor-not-allowed",
            buttonClassName
          )}
        >
          <div className="flex items-center gap-2 overflow-hidden">
            {type === 'member' && selected?.id && selected.id !== 'Unassigned' && selected.id !== 'System' ? (
               <UserAvatar uid={selected.id} members={members} className="w-4 h-4 flex-shrink-0" />
            ) : type === 'member' && (!selected?.id || selected.id === 'Unassigned') ? (
               <div className="w-4 h-4 rounded-full bg-slate-100 border border-slate-200 border-dashed flex items-center justify-center flex-shrink-0">
                 <span className="text-[8px] text-slate-400 font-black">?</span>
               </div>
            ) : isStatus ? (
               selected?.icon ? <RenderIcon iconName={selected.icon} className="w-3.5 h-3.5 flex-shrink-0" style={{ color: selected?.color || '#cbd5e1' }} /> : <div className="w-2.5 h-2.5 rounded-full shrink-0 shadow-inner border border-black/10" style={{ backgroundColor: selected?.color || '#cbd5e1' }} />
            ) : isPriority ? (
               <PriorityIcon priority={selected?.label || value} className="w-3.5 h-3.5 flex-shrink-0" masterData={masterData} />
            ) : selected?.icon ? (
              <RenderIcon iconName={selected.icon} className="w-3.5 h-3.5 flex-shrink-0" style={{ color: selected.color }} />
            ) : null}
            <span className={cn(
              "text-[12px] capitalize tracking-tight truncate",
              (!selected?.label && !value) ? "text-slate-400 font-medium opacity-80" : 
              isStatus ? "font-black text-[10px] text-inherit tracking-wider uppercase" : 
              isPriority ? "font-extrabold text-[10px] text-inherit tracking-wider uppercase" :
              "font-bold text-slate-600"
            )}>
              {selected?.label || value || 'Select...'}
            </span>
          </div>
          {!disabled && <ChevronDown className="w-3 h-3 text-slate-300 group-hover/dd:text-slate-500 flex-shrink-0" />}
        </button>
      )}
      {isOpen && createPortal(
        <>
          <div className="fixed inset-0 z-[9999]" onClick={(e) => { e.stopPropagation(); setIsOpen(false); }} />
          <div 
            style={{ 
              position: 'fixed', 
              top: dropdownPos.top - window.scrollY, 
              left: dropdownPos.left, 
              width: dropdownPos.width,
              zIndex: 10000 
            }}
            className="mt-1 bg-white rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.2)] border border-slate-200 overflow-hidden ring-1 ring-black/5 flex flex-col max-h-[300px]"
          >
            <div className="overflow-y-auto p-1.5 custom-scrollbar">
              {safeOptions.map((opt, optIdx) => {
                const isActive = opt.id === value;
                return (
                  <button
                    key={opt.id ? `opt-${opt.id}-${optIdx}` : `opt-idx-${optIdx}`}
                    onClick={(e) => { e.stopPropagation(); onChange(opt.id); setIsOpen(false); }}
                    className={cn(
                      "w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg transition-all text-left group/opt",
                      isActive ? "bg-indigo-50 text-indigo-700" : "hover:bg-slate-50 text-slate-600"
                    )}
                  >
                    <div className="flex items-center gap-2 truncate">
                      {type === 'member' && opt.id && opt.id !== 'Unassigned' && opt.id !== 'System' ? (
                        <UserAvatar uid={opt.id} members={members} className="w-5 h-5 flex-shrink-0" />
                      ) : type === 'member' && (!opt.id || opt.id === 'Unassigned') ? (
                        <div className="w-5 h-5 rounded-full bg-slate-100 border border-slate-200 border-dashed flex items-center justify-center flex-shrink-0">
                          <span className="text-[10px] text-slate-400 font-black">?</span>
                        </div>
                      ) : isStatus ? (
                         opt.icon ? <RenderIcon iconName={opt.icon} className="w-4 h-4 flex-shrink-0" style={{ color: opt.color || '#cbd5e1' }} /> : <div className="w-2.5 h-2.5 rounded-full shrink-0 shadow-inner border border-black/5" style={{ backgroundColor: opt.color || '#cbd5e1' }} />
                      ) : isPriority ? (
                         <PriorityIcon priority={opt.label} className="w-4 h-4 flex-shrink-0" masterData={masterData} />
                      ) : opt.icon ? (
                        <RenderIcon iconName={opt.icon} className="w-4 h-4 flex-shrink-0" style={{ color: opt.color }} />
                      ) : null}
                      <span className="text-[11px] font-bold truncate uppercase tracking-tight">{opt.label}</span>
                    </div>
                    {isActive && <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />}
                  </button>
                );
              })}
              {safeOptions.length === 0 && <div className="p-4 text-center text-xs text-slate-400 italic font-medium">No options available</div>}
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  );
};

export const TableStatusBadge = ({ value, onChange, statuses }: { value: string; onChange: (val: string) => void; statuses: any[] }) => {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });
  const current = (statuses || []).find(s => s.label === value);

  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const dropdownHeight = (statuses || []).length * 36 + 20;
      const spaceBelow = viewportHeight - rect.bottom;
      
      let top = rect.bottom;
      if (spaceBelow < dropdownHeight && rect.top > dropdownHeight) {
        top = rect.top - dropdownHeight;
      }

      setDropdownPos({
        top: top + window.scrollY,
        left: rect.left + window.scrollX
      });
    }
  }, [isOpen, statuses?.length]);

  return (
    <div className="relative">
      <button 
        ref={buttonRef}
        onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
        className="flex items-center gap-1.5 px-1.5 py-0.5 bg-white hover:bg-slate-50 rounded border border-slate-200 transition-colors group shadow-sm"
      >
        {current?.icon ? (
          <RenderIcon iconName={current.icon} className="w-3 h-3" style={{ color: current.color }} />
        ) : (
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: current?.color || '#cbd5e1' }} />
        )}
        <span className="text-[10px] font-black uppercase text-slate-700 tracking-tight">{value}</span>
        <ChevronDown className="w-3 h-3 text-slate-400 group-hover:text-slate-600 transition-colors" />
      </button>
      {isOpen && createPortal(
        <>
          <div className="fixed inset-0 z-[9999]" onClick={(e) => { e.stopPropagation(); setIsOpen(false); }} />
          <div 
            style={{ 
              position: 'fixed', 
              top: dropdownPos.top - window.scrollY, 
              left: dropdownPos.left, 
              zIndex: 10000 
            }}
            className="mt-1 bg-white rounded-lg shadow-xl border border-slate-200 p-1 min-w-[140px]"
          >
            {(statuses || []).map((s, index) => (
              <button
                key={`${s.id || s.label}-${index}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onChange(s.label);
                  setIsOpen(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-50 rounded-md transition-colors text-[10px] font-black uppercase text-slate-700 text-left"
              >
                {s.icon ? (
                  <RenderIcon iconName={s.icon} className="w-3 h-3" style={{ color: s.color }} />
                ) : (
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                )}
                {s.label}
              </button>
            ))}
          </div>
        </>,
        document.body
      )}
    </div>
  );
};

export const UncontrolledInput = ({ initialValue, onSave, placeholder, className, disabled, type = "text", ...rest }: any) => {
  const [val, setVal] = React.useState(initialValue || "");
  const [isFocused, setIsFocused] = React.useState(false);
  React.useEffect(() => {
    if (!isFocused) setVal(initialValue || "");
  }, [initialValue, isFocused]);
  return (
    <input 
      type={type}
      className={className}
      placeholder={placeholder}
      value={val}
      onChange={(e) => setVal(e.target.value)}
      onFocus={() => setIsFocused(true)}
      onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
      onBlur={() => {
        setIsFocused(false);
        if (val !== initialValue) onSave(val);
      }}
      disabled={disabled}
      {...rest}
    />
  );
};
