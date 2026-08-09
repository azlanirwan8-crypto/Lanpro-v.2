import React, { useRef, useEffect, useState } from 'react';
import { ChevronDown, Zap } from 'lucide-react';
import { RenderIcon } from '../RenderIcon';
import { Portal } from './Portal';
import { cn } from '../../lib/utils';

interface IssueTypeDropdownProps {
  isOpen: boolean;
  onToggle: () => void;
  selectedType: string;
  onSelect: (type: string) => void;
  masterData: any[]; // Adjust type as needed
}

export const IssueTypeDropdown = ({ isOpen, onToggle, selectedType, onSelect, masterData }: IssueTypeDropdownProps) => {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });

  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: 192 // w-48
      });
    }
  }, [isOpen]);

  const typeData = masterData.find(d => d.type === 'issue_type' && d.label?.toLowerCase() === selectedType?.toLowerCase());



  return (
    <div className="relative">
      <button 
        ref={buttonRef}
        onClick={(e) => { e.stopPropagation(); onToggle(); }}
        className="flex items-center gap-1 p-1 hover:bg-slate-100 rounded transition-colors"
      >
        {typeData?.icon ? <RenderIcon iconName={typeData.icon} className="w-3.5 h-3.5" style={{ color: typeData.color }} /> : <Zap className="w-3.5 h-3.5 text-blue-600" />}
        <ChevronDown className="w-3 h-3 text-slate-400" />
      </button>
      
      {isOpen && (
        <Portal>
          <div className="fixed inset-0 z-[500]" onClick={(e) => { e.stopPropagation(); onToggle(); }} />
          <div 
            className="fixed z-[501] bg-white border border-slate-200 rounded-xl shadow-xl p-2 animate-in fade-in zoom-in duration-200"
            style={{ 
              top: `${dropdownPosition.top + 4}px`, 
              left: `${dropdownPosition.left}px`,
              width: `${dropdownPosition.width}px` 
            }}
          >
            {masterData
              .filter(d => d.type === 'issue_type')
              .map((type: any, index: number) => (
                <button
                  key={type.id ? `${type.id}-${index}` : `${type.label}-${index}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelect(type.label);
                    onToggle();
                  }}
                  className="w-full flex items-center gap-2 p-2 hover:bg-slate-50 rounded-lg text-sm text-slate-700"
                >
                  <RenderIcon iconName={type.icon} className="w-4 h-4" style={{ color: type.color }} />
                  {type.label}
                </button>
              ))}
          </div>
        </Portal>
      )}
    </div>
  );
};
