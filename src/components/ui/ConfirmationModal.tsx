import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, Trash2, X, Info } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Portal } from './Portal';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  isLoading?: boolean;
  isAlert?: boolean;
  closeOnBackdropClick?: boolean;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Konfirmasi',
  cancelText = 'Batal',
  variant = 'warning',
  isLoading = false,
  isAlert = false,
  closeOnBackdropClick = true
}) => {
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) {
      // Focus lock automatically placed on Cancel button to prevent accidental confirmation
      const timer = setTimeout(() => {
        cancelButtonRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const accentColors = {
    danger: {
      bg: 'bg-rose-50 dark:bg-rose-950/40 border-rose-100 dark:border-rose-900/50',
      text: 'text-rose-900 dark:text-rose-200',
      icon: 'text-rose-600 dark:text-rose-400 bg-rose-100 dark:bg-rose-950/80',
      button: 'bg-rose-600 hover:bg-rose-700 text-white focus:ring-2 focus:ring-rose-500 shadow-rose-200 dark:shadow-none'
    },
    warning: {
      bg: 'bg-amber-50 dark:bg-amber-950/40 border-amber-100 dark:border-amber-900/50',
      text: 'text-amber-900 dark:text-amber-200',
      icon: 'text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/80',
      button: 'bg-amber-600 hover:bg-amber-700 text-white focus:ring-2 focus:ring-amber-500 shadow-amber-200 dark:shadow-none'
    },
    info: {
      bg: 'bg-blue-50 dark:bg-blue-950/40 border-blue-100 dark:border-blue-900/50',
      text: 'text-blue-900 dark:text-blue-200',
      icon: 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-950/80',
      button: 'bg-blue-600 hover:bg-blue-700 text-white focus:ring-2 focus:ring-blue-500 shadow-blue-200 dark:shadow-none'
    }
  };

  const colors = accentColors[variant];

  return (
    <AnimatePresence>
      {isOpen && (
        <Portal>
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            {/* Backdrop with transition - Center Viewport overlay with bg-slate-900/60 backdrop-blur-sm */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeOnBackdropClick ? onClose : undefined}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />

            {/* Modal Window with transition */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: 'spring', duration: 0.35 }}
              className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100 dark:border-slate-800 z-10 p-6 flex flex-col gap-4"
            >
              {/* Header & Icon */}
              <div className="flex items-start gap-4">
                <div className={cn("p-3 rounded-xl shrink-0", colors.icon)}>
                  {variant === 'danger' && <Trash2 className="w-5 h-5" />}
                  {variant === 'warning' && <AlertTriangle className="w-5 h-5" />}
                  {variant === 'info' && <Info className="w-5 h-5" />}
                </div>
                <div className="flex-1 min-w-0 pr-6">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight leading-snug">
                    {title}
                  </h3>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
                    {message}
                  </p>
                </div>

                {/* Close button */}
                <button 
                  onClick={onClose} 
                  className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 p-1.5 rounded-lg transition-colors"
                  aria-label="Tutup"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2.5 mt-2">
                {!isAlert && (
                  <button
                    ref={cancelButtonRef}
                    type="button"
                    disabled={isLoading}
                    onClick={onClose}
                    className="px-4 py-2.5 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-medium text-xs sm:text-sm rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-500/50 disabled:opacity-50"
                  >
                    {cancelText}
                  </button>
                )}
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={onConfirm}
                  className={cn(
                    "px-4 py-2.5 font-semibold text-xs sm:text-sm rounded-xl transition-all shadow-sm active:scale-[0.98] outline-none border border-transparent focus:ring-2 focus:ring-offset-2 disabled:opacity-50 flex items-center justify-center gap-1.5",
                    colors.button
                  )}
                >
                  {isLoading && (
                    <svg className="animate-spin h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  )}
                  {confirmText}
                </button>
              </div>
            </motion.div>
          </div>
        </Portal>
      )}
    </AnimatePresence>
  );
};
