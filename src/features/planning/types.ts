import { Task, Sprint, UserProfile, MasterData } from '../../types';

export interface PlanningViewProps {
  tasks: Task[];
  sprints: Sprint[];
  masterData: MasterData[];
  userRole: string;
  currentUserProfile: UserProfile | null;
  projectMembers: UserProfile[];
  expandedSprintId: string | null;
  setExpandedSprintId: (id: string | null) => void;
  setSelectedTaskForDetail: (task: Task) => void;
  setIsTaskDetailModalOpen: (isOpen: boolean) => void;
  setIsNewSprintModalOpen: (isOpen: boolean) => void;
  setIsEditSprintModalOpen: (isOpen: boolean) => void;
  setEditingSprint: (sprint: Sprint) => void;
  handleStartSprint: (sprintId: string) => void;
  handleCompleteSprint: (sprintId: string) => void;
  handleDeleteSprint: (sprintId: string) => void;
  handleDragEndPlanning: (result: any) => void;
}
