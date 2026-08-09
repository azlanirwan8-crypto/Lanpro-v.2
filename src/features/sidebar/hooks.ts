import { SidebarProps } from './types';
import { hasPermission } from '../../lib/permissions';
import { AppRole } from '../../types';

export const useSidebar = (props: SidebarProps) => {
  const canCreateProject = hasPermission(props.userRole as AppRole, 'configuration', 'create', false, props.currentUserProfile?.permissions);

  return {
    canCreateProject
  };
};
