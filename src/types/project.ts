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
