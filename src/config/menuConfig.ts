export type MenuSection = 'WORKSPACE' | 'SYSTEM & CONFIG';

export interface MenuConfig {
  id: string; // The Matrix/DB Key
  label: string; // The Display Name
  path: string;
  section: MenuSection;
}

export const MENU_CONFIG: MenuConfig[] = [
  { id: 'dashboard', label: 'Dashboard', path: '/dashboard', section: 'WORKSPACE' },
  { id: 'meetingNotes', label: 'Meeting Notes', path: '/meeting-notes', section: 'WORKSPACE' },
  { id: 'flowchartEditor', label: 'Dokumentasi', path: '/wiki', section: 'WORKSPACE' },
  { id: 'issueList', label: 'Issue List', path: '/issues', section: 'WORKSPACE' },
  { id: 'planning', label: 'Planning', path: '/planning', section: 'WORKSPACE' },
  { id: 'kanban', label: 'Kanban Board', path: '/kanban', section: 'WORKSPACE' },
  { id: 'qaTesting', label: 'QA Testing', path: '/qa', section: 'WORKSPACE' },
  { id: 'roadmap', label: 'Roadmap', path: '/roadmap', section: 'WORKSPACE' },
  { id: 'team', label: 'Team', path: '/team', section: 'WORKSPACE' },
  // System & Config
  { id: 'userManagement', label: 'User Management', path: '/users', section: 'SYSTEM & CONFIG' },
  { id: 'masterData', label: 'Master Data', path: '/master-data', section: 'SYSTEM & CONFIG' },
  { id: 'auditLogs', label: 'Enterprise Audit', path: '/audit', section: 'SYSTEM & CONFIG' },
  { id: 'dbExplorer', label: 'DB Explorer', path: '/db', section: 'SYSTEM & CONFIG' },
];
