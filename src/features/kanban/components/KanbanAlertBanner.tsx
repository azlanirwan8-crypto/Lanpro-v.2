import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { cn } from '../../../lib/utils';

interface AlertBannerProps {
  message: string;
  className?: string;
}

export const KanbanAlertBanner: React.FC<AlertBannerProps> = ({ message, className }) => {
  return (
    <div className={cn("flex items-center gap-2 p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg", className)}>
      <AlertTriangle className="w-4 h-4 flex-shrink-0" />
      <p>{message}</p>
    </div>
  );
};
