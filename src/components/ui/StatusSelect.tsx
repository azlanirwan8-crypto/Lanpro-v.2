import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';
import { RenderIcon } from '../RenderIcon';
import { Portal } from './Portal';

interface StatusSelectProps {
  value: string;
  onChange: (val: string) => void;
  statuses: any[];
  disabled?: boolean;
  className?: string;
}

export const StatusSelect = ({ value, onChange, statuses, disabled, className }: StatusSelectProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });

  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width
      });
    }
  }, [isOpen]);

  const current = statuses.find(s => s.label === value);

  return (
    <div className={cn("relative", className)}>
      <button 
        ref={buttonRef}
        onClick={(e) => { e.stopPropagation(); !disabled && setIsOpen(!isOpen); }}
        disabled={disabled}
        className={cn(
          "flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg transition-all w-full justify-between text-left",
          disabled ? "bg-gray-50 border-gray-100 cursor-not-allowed opacity-75" : "hover:border-blue-400 cursor-pointer shadow-sm hover:shadow-md"
        )}
      >
        <div className="flex items-center gap-2 truncate">
          {current?.icon ? (
            <RenderIcon iconName={current.icon} className="w-4 h-4 saturate-150 shrink-0" style={{ color: current.color || '#CBD5E1' }} />
          ) : (
            <div className="w-2.5 h-2.5 rounded-full shadow-inner border border-black/10 shrink-0" style={{ backgroundColor: current?.color || '#CBD5E1' }} />
          )}
          <span className="text-sm font-bold uppercase text-gray-700 tracking-tight truncate">{value || 'Select Status'}</span>
        </div>
        <ChevronDown className="w-3.5 h-3.5 text-gray-400 shrink-0" />
      </button>
      
      {isOpen && (
        <Portal>
          <div className="fixed inset-0 z-[60]" onClick={(e) => { e.stopPropagation(); setIsOpen(false); }} />
          <div 
            className="fixed z-[70] bg-white rounded-lg shadow-xl border border-gray-100 p-1 min-w-[160px]"
            style={{ 
              top: `${dropdownPosition.top + 4}px`, 
              left: `${dropdownPosition.left}px`,
              width: `${dropdownPosition.width}px` 
            }}
          >
            {statuses.map((s, index) => (
              <button
                key={`${s.id || s.label}-${index}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onChange(s.label);
                  setIsOpen(false);
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 rounded-md transition-colors text-sm font-bold text-gray-700 uppercase"
              >
                {s.icon ? (
                    <RenderIcon iconName={s.icon} className="w-4 h-4 saturate-150 shrink-0" style={{ color: s.color }} />
                ) : (
                    <div className="w-2.5 h-2.5 rounded-full shadow-inner border border-black/10 shrink-0" style={{ backgroundColor: s.color }} />
                )}
                {s.label}
              </button>
            ))}
          </div>
        </Portal>
      )}
    </div>
  );
};

export const PrioritySelect = ({ value, onChange, masterData, disabled, className }: { value: string; onChange: (val: string) => void; masterData: any[]; disabled?: boolean; className?: string }) => {
  const priorities = masterData.filter(d => d.type === 'priority');
  return <StatusSelect value={value} onChange={onChange} statuses={priorities} disabled={disabled} className={className} />;
};
