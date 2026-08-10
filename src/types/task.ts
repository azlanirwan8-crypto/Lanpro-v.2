export interface CustomFieldValue {
  fieldId: string;
  value: any;
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
