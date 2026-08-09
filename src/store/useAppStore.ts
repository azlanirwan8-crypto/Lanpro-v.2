import { create } from 'zustand';
import { Project, Task, Sprint, ActivityLog, MasterData, UserProfile } from '../types';
import { CacheManager } from '../lib/cache';

export type AppRole = 'admin' | 'manager' | 'member' | 'viewer';

type SetStateAction<S> = S | ((prevState: S) => S);

interface AppState {
  currentView: 'dashboard' | 'board' | 'list' | 'timeline' | 'master' | 'access' | 'activity' | 'sprints' | 'users' | 'meetingNotes' | 'backup' | 'planning' | 'issueList' | 'connect' | 'dbExplorer' | 'wiki' | 'notebooklm' | 'flowchart' | 'auditLog' | 'qa' | 'settingsIntegration' | 'issueDetail' | 'userDetail';
  setCurrentView: (view: SetStateAction<'dashboard' | 'board' | 'list' | 'timeline' | 'master' | 'access' | 'activity' | 'sprints' | 'users' | 'meetingNotes' | 'backup' | 'planning' | 'issueList' | 'connect' | 'dbExplorer' | 'wiki' | 'notebooklm' | 'flowchart' | 'auditLog' | 'qa' | 'settingsIntegration' | 'issueDetail' | 'userDetail'>) => void;

  projects: Project[];
  setProjects: (projects: SetStateAction<Project[]>) => void;
  
  selectedProject: Project | null;
  setSelectedProject: (project: SetStateAction<Project | null>) => void;

  tasks: Task[];
  setTasks: (tasks: SetStateAction<Task[]>) => void;
  updateTask: (taskId: string, updatedTask: Partial<Task>) => void;

  sprints: Sprint[];
  setSprints: (sprints: SetStateAction<Sprint[]>) => void;

  activityLogs: ActivityLog[];
  setActivityLogs: (logs: SetStateAction<ActivityLog[]>) => void;

  masterData: MasterData[];
  setMasterData: (data: SetStateAction<MasterData[]>) => void;

  allUsers: UserProfile[];
  setAllUsers: (users: SetStateAction<UserProfile[]>) => void;

  density: 'comfortable' | 'compact';
  setDensity: (density: 'comfortable' | 'compact') => void;
}

// Snappy-load preloaded states from Client-Side Cache
const preloadedProjects = CacheManager.get<Project[]>('projects') || [];
const preloadedSelectedProj = CacheManager.get<Project>('selectedProject') || (preloadedProjects.length > 0 ? preloadedProjects[0] : null);
const preloadedMasterData = CacheManager.get<MasterData[]>('masterData') || [];
const preloadedAllUsers = CacheManager.get<UserProfile[]>('allUsers') || [];

// If there was a selected project preloaded, we can also preload its specific tasks, sprints, and activity logs
const preloadedTasks = preloadedSelectedProj ? (CacheManager.get<Task[]>(`tasks_${preloadedSelectedProj.id}`) || []) : [];
const preloadedSprints = preloadedSelectedProj ? (CacheManager.get<Sprint[]>(`sprints_${preloadedSelectedProj.id}`) || []) : [];
const preloadedLogs = preloadedSelectedProj ? (CacheManager.get<ActivityLog[]>(`activityLogs_${preloadedSelectedProj.id}`) || []) : [];

export const useAppStore = create<AppState>((set) => ({
  currentView: 'dashboard',
  setCurrentView: (view) => set((state) => ({ currentView: typeof view === 'function' ? view(state.currentView) : view })),

  projects: preloadedProjects,
  setProjects: (projects) => set((state) => {
    const nextVal = typeof projects === 'function' ? projects(state.projects) : projects;
    CacheManager.save('projects', nextVal);
    return { projects: nextVal };
  }),

  selectedProject: preloadedSelectedProj,
  setSelectedProject: (selectedProject) => set((state) => {
    const nextVal = typeof selectedProject === 'function' ? selectedProject(state.selectedProject) : selectedProject;
    if (nextVal) {
      CacheManager.save('selectedProject', nextVal);
      // Let's also update tasks, sprints, and logs immediately from cache for the selected project
      const cachedTasks = CacheManager.get<Task[]>(`tasks_${nextVal.id}`) || [];
      const cachedSprints = CacheManager.get<Sprint[]>(`sprints_${nextVal.id}`) || [];
      const cachedLogs = CacheManager.get<ActivityLog[]>(`activityLogs_${nextVal.id}`) || [];
      return { 
        selectedProject: nextVal,
        tasks: cachedTasks,
        sprints: cachedSprints,
        activityLogs: cachedLogs
      };
    }
    CacheManager.clear('selectedProject');
    return { selectedProject: nextVal };
  }),

  tasks: preloadedTasks,
  setTasks: (tasks) => set((state) => {
    const nextVal = typeof tasks === 'function' ? (tasks as any)(state.tasks) : tasks;
    if (state.selectedProject) {
      CacheManager.save(`tasks_${state.selectedProject.id}`, nextVal);
    }
    return { tasks: nextVal };
  }),

  updateTask: (taskId, updatedTask) => set((state) => {
    const nextTasks = state.tasks.map(t => t.id === taskId ? { ...t, ...updatedTask } : t);
    if (state.selectedProject) {
      CacheManager.save(`tasks_${state.selectedProject.id}`, nextTasks);
    }
    return { tasks: nextTasks };
  }),

  sprints: preloadedSprints,
  setSprints: (sprints) => set((state) => {
    const nextVal = typeof sprints === 'function' ? (sprints as any)(state.sprints) : sprints;
    if (state.selectedProject) {
      CacheManager.save(`sprints_${state.selectedProject.id}`, nextVal);
    }
    return { sprints: nextVal };
  }),

  activityLogs: preloadedLogs,
  setActivityLogs: (activityLogs) => set((state) => {
    const nextVal = typeof activityLogs === 'function' ? (activityLogs as any)(state.activityLogs) : activityLogs;
    if (state.selectedProject) {
      CacheManager.save(`activityLogs_${state.selectedProject.id}`, nextVal);
    }
    return { activityLogs: nextVal };
  }),

  masterData: preloadedMasterData,
  setMasterData: (masterData) => set((state) => {
    const nextVal = typeof masterData === 'function' ? (masterData as any)(state.masterData) : masterData;
    CacheManager.save('masterData', nextVal);
    return { masterData: nextVal };
  }),

  allUsers: preloadedAllUsers,
  setAllUsers: (allUsers) => set((state) => {
    const nextVal = typeof allUsers === 'function' ? (allUsers as any)(state.allUsers) : allUsers;
    CacheManager.save('allUsers', nextVal);
    return { allUsers: nextVal };
  }),

  density: (localStorage.getItem('view_density') as 'comfortable' | 'compact') || 'comfortable',
  setDensity: (density) => {
    localStorage.setItem('view_density', density);
    set({ density });
  },
}));
