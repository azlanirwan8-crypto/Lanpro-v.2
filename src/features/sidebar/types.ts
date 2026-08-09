import { Project, AppRole, UserProfile } from '../../types';

export interface SidebarProps {
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (open: boolean) => void;
  isSidebarCollapsed: boolean;
  setIsSidebarCollapsed: (collapsed: boolean) => void;
  userRole: AppRole | null;
  currentUserProfile: UserProfile | null;
  setIsNewProjectModalOpen: (open: boolean) => void;
  projects: Project[];
  selectedProject: Project | null;
  setSelectedProject: (project: Project) => void;
  currentView: string;
  setCurrentView: (view: any) => void;
  hasPermission: (role: any, module: any, action: any, isOwner: boolean, permissions: any) => boolean;
  currentUser: any;
  user: any;
  setIsProfileModalOpen: (open: boolean) => void;
  handleLogout: () => void;
}
