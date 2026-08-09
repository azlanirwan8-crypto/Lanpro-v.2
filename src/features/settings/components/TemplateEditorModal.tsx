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
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50 shrink-0">
          <h3 className="font-bold text-slate-800 text-lg">
            Broadcast Message Template - {mode === 'email' ? 'Email' : 'WhatsApp'}
          </h3>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto space-y-6">
          <div className="space-y-3">
            <label className="text-sm font-bold text-slate-700">Available Variables</label>
            <div className="flex flex-wrap gap-2">
              {VARIABLES.map(variable => (
                <button
                  key={variable}
                  onClick={() => insertAtCursor(variable)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all shadow-sm border ${
                    mode === 'whatsapp' 
                      ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-100' 
                      : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-100'
                  }`}
                  title={`Insert ${variable}`}
                >
                  {variable}
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-500">Click a variable to insert it at your cursor position.</p>
          </div>

          {mode === 'email' && (
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-700">Email Subject</label>
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl shadow-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-mono text-sm"
                placeholder="Subject line..."
              />
            </div>
          )}

          <div className="space-y-1.5 border border-slate-200 rounded-xl overflow-hidden shadow-sm focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500 transition-all">
            <div className="flex items-center gap-1 p-2 bg-slate-50 border-b border-slate-200 flex-wrap">
              <button onClick={() => handleFormat('bold')} className="p-1.5 text-slate-600 hover:bg-slate-200 hover:text-slate-900 rounded transition-colors" title="Bold"><Bold size={16} /></button>
              <button onClick={() => handleFormat('italic')} className="p-1.5 text-slate-600 hover:bg-slate-200 hover:text-slate-900 rounded transition-colors" title="Italic"><Italic size={16} /></button>
              {mode === 'email' && <button onClick={() => handleFormat('underline')} className="p-1.5 text-slate-600 hover:bg-slate-200 hover:text-slate-900 rounded transition-colors" title="Underline"><Underline size={16} /></button>}
              <div className="w-px h-5 bg-slate-300 mx-1"></div>
              {mode === 'email' && (
                <>
                  <button onClick={() => handleFormat('align-left')} className="p-1.5 text-slate-600 hover:bg-slate-200 hover:text-slate-900 rounded transition-colors" title="Align Left"><AlignLeft size={16} /></button>
                  <button onClick={() => handleFormat('align-center')} className="p-1.5 text-slate-600 hover:bg-slate-200 hover:text-slate-900 rounded transition-colors" title="Align Center"><AlignCenter size={16} /></button>
                  <button onClick={() => handleFormat('align-right')} className="p-1.5 text-slate-600 hover:bg-slate-200 hover:text-slate-900 rounded transition-colors" title="Align Right"><AlignRight size={16} /></button>
                  <div className="w-px h-5 bg-slate-300 mx-1"></div>
                  <button onClick={() => handleFormat('list')} className="p-1.5 text-slate-600 hover:bg-slate-200 hover:text-slate-900 rounded transition-colors" title="Bulleted List"><List size={16} /></button>
                </>
              )}
              {mode === 'whatsapp' && (
                 <span className="text-xs text-slate-500 ml-2">Supports *bold*, _italic_</span>
              )}
            </div>
            <textarea
              ref={textareaRef}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={8}
              className="w-full p-4 outline-none resize-none font-mono text-sm leading-relaxed"
              placeholder={mode === 'email' ? "Type your email content here (supports HTML)..." : "Type your WhatsApp message here..."}
            />
          </div>
        </div>
        
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50 shrink-0">
          <button 
            onClick={onClose} 
            className="px-5 py-2.5 rounded-xl text-slate-600 font-bold hover:bg-slate-200 transition-colors"
          >
            Batal
          </button>
          <button 
            onClick={() => onSave(subject, body)} 
            className={`px-5 py-2.5 rounded-xl text-white font-bold shadow-sm transition-colors ${
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
