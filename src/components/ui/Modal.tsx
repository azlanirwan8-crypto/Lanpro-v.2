import React from 'react';
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { Portal } from './Portal';

export const Modal = ({ isOpen, onClose, title, children, maxWidth = 'max-w-lg', closeOnBackdropClick = true }: any) => {
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;
  return (
    <Portal>
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
        onClick={(e) => {
          if (closeOnBackdropClick && e.target === e.currentTarget) {
            onClose();
          }
        }}
      >
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`bg-white dark:bg-slate-900 rounded-lg shadow-xl w-full ${maxWidth} overflow-hidden max-h-[90vh] flex flex-col border border-slate-200 dark:border-slate-800`}
        >
          <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center shrink-0">
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
              <Plus className="rotate-45 w-5 h-5" />
            </button>
          </div>
          <div className="p-5 overflow-y-auto">{children}</div>
        </motion.div>
      </div>
    </Portal>
  );
};

