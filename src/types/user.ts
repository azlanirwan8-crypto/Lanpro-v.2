export type AppRole = 'admin' | 'head' | 'manager' | 'user' | 'viewer' | string;

export interface ModulePermission {
  create: boolean;
  read: boolean;
  update: boolean;
  delete: boolean;
}

export interface UserPermissions {
  dashboard?: ModulePermission;
  meetingNotes?: ModulePermission;
  wiki?: ModulePermission;
  notebooklm?: ModulePermission;
  list?: ModulePermission;
  sprints?: ModulePermission;
  board?: ModulePermission;
  timeline?: ModulePermission;
  access?: ModulePermission;
  flowchart?: ModulePermission;
  qa?: ModulePermission;
  userManagement?: ModulePermission;
  masterData?: ModulePermission;
  auditLog?: ModulePermission;
  dbExplorer?: ModulePermission;
  settings?: ModulePermission;
  
  // New unified keys
  flowchartEditor?: ModulePermission;
  issueList?: ModulePermission;
  planning?: ModulePermission;
  kanban?: ModulePermission;
  qaTesting?: ModulePermission;
  roadmap?: ModulePermission;
  team?: ModulePermission;
  auditLogs?: ModulePermission;
  configuration?: ModulePermission;
}

export interface UserProfile {
  id: string;
  uid: string;
  username: string;
  lastSeen?: string;
  name?: string;
  email?: string;
  displayName?: string;
  photoURL?: string;
  phone?: string;
  position?: string;
  department?: string;
  status: 'pending' | 'approved' | 'rejected';
  role: AppRole;
  permissions?: Partial<UserPermissions>;
  passwordHash: string;
}
