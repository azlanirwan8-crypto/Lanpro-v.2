export interface KanbanBoardProps {
  tasks: any[];
  masterData: any[]; 
  projectMembers: any[];
  selectedProject: any;
  userRole: string;
  user: any;
  setSelectedTaskForDetail: (task: any) => void;
  setIsTaskDetailModalOpen: (open: boolean) => void;
  refreshTasks?: () => void;
  setTasks?: (tasks: any[]) => void;
}
