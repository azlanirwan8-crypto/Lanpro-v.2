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

export interface Project {
  id: string;
  name: string;
  key: string; // e.g. "KAN"
  description?: string;
  ownerId: string;
  category?: string;
  status?: 'Active' | 'On Hold' | 'Completed' | 'Archived';
  members: string[]; // Keep this for querying
  memberRoles: Record<string, string>;
  pendingInvites?: string[]; // Emails of invited users who haven't registered
  dashboardLayout?: any;
  dashboard_layout?: any;
  createdAt: any;
  taskCounter: number; // To generate sequential keys like KAN-1, KAN-2
}

export interface Attachment {
  id: string;
  name: string;
  url: string;
  type: string; // 'link' | 'image' | 'pdf' | 'doc' | 'file'
  fileRef?: string; // Optional path in storage if it's an uploaded file
  createdAt: any;
  uploadedByUserId?: string;
  uploadedByName?: string;
}

export interface Sprint {
  id: string;
  projectId: string;
  name: string;
  goal?: string;
  startDate: any;
  endDate: any;
  status: 'planned' | 'active' | 'completed';
  createdAt: any;
}

export interface LinkedTask {
  id: string;
  targetTaskId: string;
  relationType: 'blocks' | 'is_blocked_by' | 'relates_to' | 'clones' | 'is_cloned_by';
  createdAt: any;
}

export interface Task {
  id: string;
  projectId: string;
  sprintId?: string; // Link task to a sprint
  key: string; // e.g. "KAN-29"
  title: string;
  description?: string;
  acceptanceCriteria?: string; // Add Acceptance Criteria
  labels?: string[]; // Add Labels
  storyPoints?: number; // Add Story Points
  figmaUrl?: string;
  isBlocked?: boolean;
  externalLinks?: { id: string; title: string; url: string; createdAt: any }[];
  attachments?: Attachment[];
  linkedTasks?: LinkedTask[];
  status: string;
  type: 'epic' | 'task' | 'subtask' | 'bug' | 'meeting' | 'document' | 'approval';
  parentId?: string; // ID of the parent task/epic (Epic Link)
  assigneeId?: string;
  assignees?: string[];
  assigneeEmail?: string;
  reporterId?: string;
  priority: string; // Now dynamic from master data
  category?: string;
  release?: string;
  resolution?: string;
  businessValue?: string;
  projectRisk?: string;
  environment?: string;
  startDate?: any;
  endDate?: any;
  dueDate?: string;
  estimatedHours?: number;
  loggedHours?: number;
  customFields?: CustomFieldValue[];
  createdAt: any;
  updatedAt: any;
  _editingDescription?: boolean;
  _editingAcceptanceCriteria?: boolean;
  _showHistory?: boolean;
}

export interface Comment {
  id: string;
  taskId: string;
  text: string;
  authorId: string;
  createdAt: any;
}

export interface ActivityLog {
  id: string;
  projectId: string;
  userId: string;
  action: string;
  details: string;
  createdAt: any;
}

export interface AuditLog {
  id: string;
  userId: string;
  projectId: string | null;
  actionType: 'CREATE' | 'UPDATE' | 'DELETE';
  entityName: string;
  entityId: string;
  oldValues: any;
  newValues: any;
  createdAt: any;
  userName?: string;
}

export interface MasterData {
  id: string;
  type: string; // Dynamic type
  label: string;
  color?: string;
  icon?: string;
  order: number;
  description?: string;
  fieldType?: 'text' | 'number' | 'date' | 'dropdown';
  dropdownOptions?: string[];
  roleType?: 'PROJECT' | 'SYSTEM';
  role_type?: 'PROJECT' | 'SYSTEM';
  is_system_default?: boolean;
  is_system_reserved?: boolean;
}

export interface CustomFieldValue {
  fieldId: string;
  value: any;
}

export interface DiscussionPoint {
  id?: string;
  meetingId?: string;
  parentPointId?: string;
  parent_point_id?: string;
  parentpointid?: string;
  authorId?: string;
  assignTo?: string;
  assignee_id?: string;
  concern: string;
  comment?: string;
  fitur?: string;
  feature_id?: string;
  system?: string;
  system_id?: string;
  surrounding?: string;
  surrounding_id?: string;
  keterangan?: string;
  next_action?: string;
  tindakanLanjut?: string;
  tindakan_lanjut?: string;
  status: 'pending' | 'completed';
  targetDate?: string;
  target_date?: string;
  tanggalUpdateStatus?: string;
  createdAt?: any;
  commentsCount?: number;
}

export interface DiscussionPointComment {
  id: string;
  pointId: string;
  userId?: string;
  userName?: string;
  commentText: string;
  createdAt: string;
}

export interface AppNotification {
  id: string;
  recipientId: string;
  senderId?: string;
  title: string;
  message: string;
  type: string;
  relatedId?: string;
  read: boolean;
  createdAt: any;
}

export interface Meeting {
  id?: string;
  projectId: string;
  title: string;
  description?: string;
  meetingLink?: string;
  authorId: string; // The user who created the meeting
  createdAt: any;
  updatedAt?: any;
  transcript?: string;
  aiSummary?: string | any;
  recording_url?: string;
  file_size?: number;
  upload_status?: string;
}
