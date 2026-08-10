import React, { useState, useRef, useEffect } from 'react';
import { X, Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, List } from 'lucide-react';

interface TemplateEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'email' | 'whatsapp';
  initialSubject?: string;
  initialBody: string;
  onSave: (subject: string, body: string) => void;
}

const VARIABLES = ['{{user_name}}', '{{task_key}}', '{{task_title}}', '{{status}}', '{{project_name}}'];

export const TemplateEditorModal: React.FC<TemplateEditorModalProps> = ({ 
  isOpen, 
  onClose, 
  mode, 
  initialSubject = '', 
  initialBody, 
  onSave 
}) => {
  const [subject, setSubject] = useState(initialSubject);
  const [body, setBody] = useState(initialBody);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen) {
      setSubject(initialSubject);
      setBody(initialBody);
    }
  }, [isOpen, initialSubject, initialBody]);

  if (!isOpen) return null;

  const insertAtCursor = (textToInsert: string) => {
    if (!textareaRef.current) return;
    const { selectionStart, selectionEnd } = textareaRef.current;
    const newBody = body.substring(0, selectionStart) + textToInsert + body.substring(selectionEnd);
    setBody(newBody);
    
    // Set cursor position back after React re-renders
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(selectionStart + textToInsert.length, selectionStart + textToInsert.length);
      }
    }, 0);
  };

  const applyFormatting = (prefix: string, suffix: string = prefix) => {
    if (!textareaRef.current) return;
    const { selectionStart, selectionEnd } = textareaRef.current;
    const selectedText = body.substring(selectionStart, selectionEnd);
    const textToInsert = prefix + selectedText + suffix;
    
    const newBody = body.substring(0, selectionStart) + textToInsert + body.substring(selectionEnd);
    setBody(newBody);
    
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(selectionStart + prefix.length, selectionEnd + prefix.length);
      }
    }, 0);
  };

  const handleFormat = (type: string) => {
    if (mode === 'whatsapp') {
      switch (type) {
        case 'bold': applyFormatting('*'); break;
        case 'italic': applyFormatting('_'); break;
        case 'strikethrough': applyFormatting('~'); break;
      }
    } else {
      switch (type) {
        case 'bold': applyFormatting('<b>', '</b>'); break;
        case 'italic': applyFormatting('<i>', '</i>'); break;
        case 'underline': applyFormatting('<u>', '</u>'); break;
        case 'align-left': applyFormatting('<div style="text-align: left;">', '</div>'); break;
        case 'align-center': applyFormatting('<div style="text-align: center;">', '</div>'); break;
        case 'align-right': applyFormatting('<div style="text-align: right;">', '</div>'); break;
        case 'list': applyFormatting('<ul>\\n  <li>', '</li>\\n</ul>'); break;
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-[60]">
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 shrink-0">
          <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-sm">
            Broadcast Message Template - {mode === 'email' ? 'Email' : 'WhatsApp'}
          </h3>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors">
            <X size={18} />
          </button>
        </div>
        
        <div className="p-5 overflow-y-auto space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Available Variables</label>
            <div className="flex flex-wrap gap-1.5">
              {VARIABLES.map(variable => (
                <button
                  key={variable}
                  onClick={() => insertAtCursor(variable)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-mono font-semibold transition-all shadow-xs border ${
                    mode === 'whatsapp' 
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' 
                      : 'bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
                  }`}
                  title={`Insert ${variable}`}
                >
                  {variable}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-slate-400">Click a variable to insert it at your cursor position.</p>
          </div>

          {mode === 'email' && (
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Email Subject</label>
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-md shadow-xs outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-mono text-xs bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
                placeholder="Subject line..."
              />
            </div>
          )}

          <div className="space-y-1 border border-slate-200 dark:border-slate-700 rounded-md overflow-hidden shadow-xs focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500 transition-all">
            <div className="flex items-center gap-1 p-1.5 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex-wrap">
              <button onClick={() => handleFormat('bold')} className="p-1 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors" title="Bold"><Bold size={14} /></button>
              <button onClick={() => handleFormat('italic')} className="p-1 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors" title="Italic"><Italic size={14} /></button>
              {mode === 'email' && <button onClick={() => handleFormat('underline')} className="p-1 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors" title="Underline"><Underline size={14} /></button>}
              <div className="w-px h-4 bg-slate-300 dark:bg-slate-700 mx-1"></div>
              {mode === 'email' && (
                <>
                  <button onClick={() => handleFormat('align-left')} className="p-1 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors" title="Align Left"><AlignLeft size={14} /></button>
                  <button onClick={() => handleFormat('align-center')} className="p-1 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors" title="Align Center"><AlignCenter size={14} /></button>
                  <button onClick={() => handleFormat('align-right')} className="p-1 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors" title="Align Right"><AlignRight size={14} /></button>
                  <div className="w-px h-4 bg-slate-300 dark:bg-slate-700 mx-1"></div>
                  <button onClick={() => handleFormat('list')} className="p-1 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors" title="Bulleted List"><List size={14} /></button>
                </>
              )}
              {mode === 'whatsapp' && (
                 <span className="text-[11px] text-slate-400 ml-2">Supports *bold*, _italic_</span>
              )}
            </div>
            <textarea
              ref={textareaRef}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={7}
              className="w-full p-3 outline-none resize-none font-mono text-xs leading-relaxed bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
              placeholder={mode === 'email' ? "Type your email content here (supports HTML)..." : "Type your WhatsApp message here..."}
            />
          </div>
        </div>
        
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 shrink-0">
          <button 
            onClick={onClose} 
            className="px-3.5 py-1.5 rounded-md text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            Batal
          </button>
          <button 
            onClick={() => onSave(subject, body)} 
            className={`px-4 py-1.5 rounded-md text-white text-xs font-medium shadow-xs transition-colors ${
              mode === 'whatsapp' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-indigo-600 hover:bg-indigo-700'
            }`}
          >
            Simpan Template
          </button>
        </div>
      </div>
    </div>
  );
};
