import { UserProfile, Project, Task, MasterData, AppRole, UserPermissions } from '../../types';

export interface AdminUserPanelProps {
  onAddUser: () => void;
  projects: Project[];
  tasks: Task[];
  masterData: MasterData[];
  userRole: AppRole | null;
  currentUserId?: string;
  onRefreshProjects?: () => void;
}

export const DEFAULT_PERMISSIONS: UserPermissions = {
  dashboard: { create: false, read: true, update: false, delete: false },
  meetingNotes: { create: true, read: true, update: true, delete: false },
  wiki: { create: true, read: true, update: true, delete: false },
  notebooklm: { create: true, read: true, update: true, delete: false },
  flowchart: { create: true, read: true, update: true, delete: false },
  list: { create: true, read: true, update: true, delete: false },
  sprints: { create: false, read: true, update: false, delete: false },
  board: { create: false, read: true, update: true, delete: false },
  qa: { create: true, read: true, update: true, delete: false },
  timeline: { create: false, read: true, update: false, delete: false },
  access: { create: false, read: true, update: false, delete: false },
  userManagement: { create: false, read: false, update: false, delete: false },
  masterData: { create: false, read: false, update: false, delete: false },
  auditLog: { create: false, read: false, update: false, delete: false },
  dbExplorer: { create: false, read: false, update: false, delete: false },
  settings: { create: false, read: false, update: false, delete: false },
};
