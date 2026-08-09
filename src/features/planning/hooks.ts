import { AppRole } from '../../types';
import { hasPermission } from '../../lib/permissions';
import { PlanningViewProps } from './types';

export const usePlanning = (props: PlanningViewProps) => {
  const { userRole, currentUserProfile } = props;

  const canEditPlanning = hasPermission(
    userRole as AppRole, 
    'planning', 
    'update', 
    false, 
    currentUserProfile?.permissions
  );

  const priorityColorMap: Record<string, string> = {
    'High': 'text-red-500 bg-red-50 border-red-100',
    'Highest': 'text-red-700 bg-red-100 border-red-200',
    'Medium': 'text-amber-500 bg-amber-50 border-amber-100',
    'Low': 'text-blue-500 bg-blue-50 border-blue-100',
    'Lowest': 'text-slate-500 bg-slate-100 border-slate-200'
  };

  return {
    canEditPlanning,
    priorityColorMap
  };
};
