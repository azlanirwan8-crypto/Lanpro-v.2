const fs = require('fs');
let code = fs.readFileSync('src/components/DescriptionEditor.tsx', 'utf8');

const newCode = `import React, { useState, useEffect, useRef } from 'react';

interface Props {
  task: any;
  onSave: (value: string) => void;
  onCancel: () => void;
  onAutoSave?: (value: string) => void;
}

export const DescriptionEditor: React.FC<Props> = ({ task, onSave, onCancel, onAutoSave }) => {
  const [localDescription, setLocalDescription] = useState(task.description || '');
  const saveTimeout = useRef<any>(null);

  useEffect(() => {
    if (onAutoSave && localDescription !== (task.description || '')) {
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
      saveTimeout.current = setTimeout(() => {
        onAutoSave(localDescription);
      }, 1000);
    }
    return () => {
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
    };
  }, [localDescription, onAutoSave, task.description]);

  return (
    <div className="border border-indigo-500 rounded-2xl overflow-hidden bg-white shadow-lg ring-4 ring-indigo-500/10 transition-all">
      <textarea
        value={localDescription}
        onChange={(e) => setLocalDescription(e.target.value)}
        placeholder="Add descriptive details here... (Markdown supported)"
        rows={8}
        className="w-full p-6 text-sm focus:outline-none resize-y leading-relaxed font-medium text-slate-700"
        autoFocus
        onBlur={() => onSave(localDescription)}
        onKeyDown={(e) => {
            if (e.key === 'Escape') onCancel();
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                onSave(localDescription);
            }
        }}
      />
      <div className="bg-slate-50 border-t border-slate-100 px-4 py-3 flex justify-between items-center text-[10px] font-bold text-slate-400">
        <span>Markdown fully supported. Auto-saves as you type. Press Ctrl+Enter to save & close, or Escape to cancel.</span>
      </div>
    </div>
  );
};
`;

fs.writeFileSync('src/components/DescriptionEditor.tsx', newCode);
