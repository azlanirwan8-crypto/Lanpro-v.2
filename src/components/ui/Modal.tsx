import React from 'react';
import { motion } from 'motion/react';
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
    }
    return () => {
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;
  return (
    <Portal>
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        onClick={(e) => {
          if (closeOnBackdropClick && e.target === e.currentTarget) {
            onClose();
          }
        }}
      >
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`bg-white rounded-xl shadow-xl w-full ${maxWidth} overflow-hidden max-h-[90vh] flex flex-col`}
        >
          <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center shrink-0">
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <Plus className="rotate-45 w-6 h-6" />
            </button>
          </div>
          <div className="p-6 overflow-y-auto">{children}</div>
        </motion.div>
      </div>
    </Portal>
  );
};

