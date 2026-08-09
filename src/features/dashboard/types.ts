import { Task, Sprint, UserProfile, ActivityLog, Project } from '../../types';

export interface DashboardViewProps {
  tasks: Task[];
  sprints: Sprint[];
  projectMembers: UserProfile[];
  activityLogs: ActivityLog[];
  selectedProject: Project | null;
  setCurrentView: (view: any) => void;
  setSelectedTaskForDetail: (task: Task) => void;
  setIsTaskDetailModalOpen: (isOpen: boolean) => void;
  userRole?: string | null;
  currentUser?: UserProfile | null;
  fetchTasks?: () => Promise<void>;
}
