import React from 'react';
import { 
  LayoutDashboard, ListTodo, Target, Video, 
  Book, Trello, Clock, Users, Database, History, UserCog, Workflow, Beaker, Settings2, Sparkles, FolderKanban
} from 'lucide-react';

export interface SidebarSubItemConfig {
  id: string;
  label: string;
  module: string;
}

export interface SidebarItemConfig {
  id: string;
  label: string;
  icon: React.ReactNode;
  module: string;
  action?: 'read' | 'create' | 'update' | 'delete';
  badge?: string;
  badgeColor?: 'orange' | 'emerald' | 'blue' | 'purple';
  children?: SidebarSubItemConfig[];
}

export interface SidebarSectionConfig {
  id: string;
  title: string;
  items: SidebarItemConfig[];
}

export const sidebarSections: SidebarSectionConfig[] = [
  {
    id: 'menu',
    title: 'MENU',
    items: [
      { 
        id: 'dashboard', 
        label: 'Dashboard', 
        icon: <LayoutDashboard className="w-4 h-4" />, 
        module: 'dashboard' 
      }
    ]
  },
  {
    id: 'projects',
    title: 'MANAJEMEN PROYEK',
    items: [
      { 
        id: 'list', 
        label: 'Issue List', 
        icon: <ListTodo className="w-4 h-4" />, 
        module: 'list' 
      },
      { 
        id: 'sprints', 
        label: 'Planning & Sprints', 
        icon: <Target className="w-4 h-4" />, 
        module: 'sprints' 
      },
      { 
        id: 'board', 
        label: 'Kanban Board', 
        icon: <Trello className="w-4 h-4" />, 
        module: 'board' 
      },
      { 
        id: 'qa', 
        label: 'QA Testing', 
        icon: <Beaker className="w-4 h-4" />, 
        module: 'qa' 
      },
      { 
        id: 'timeline', 
        label: 'Roadmap & Timeline', 
        icon: <Clock className="w-4 h-4" />, 
        module: 'timeline' 
      }
    ]
  },
  {
    id: 'collaboration',
    title: 'KOLABORASI & AI',
    items: [
      { 
        id: 'meetingNotes', 
        label: 'Meeting Notes', 
        icon: <Video className="w-4 h-4" />, 
        module: 'meetingNotes' 
      },
      { 
        id: 'wiki', 
        label: 'Dokumentasi', 
        icon: <Book className="w-4 h-4" />, 
        module: 'wiki' 
      },
      { 
        id: 'notebooklm', 
        label: 'NotebookLM AI', 
        icon: <Sparkles className="w-4 h-4 text-purple-300" />, 
        module: 'notebooklm',
        badge: 'Hot',
        badgeColor: 'orange'
      },
      { 
        id: 'flowchart', 
        label: 'Flowchart Editor', 
        icon: <Workflow className="w-4 h-4" />, 
        module: 'flowchartEditor',
        badge: 'New',
        badgeColor: 'emerald'
      }
    ]
  },
  {
    id: 'system',
    title: 'ADMINISTRASI & SISTEM',
    items: [
      { 
        id: 'access', 
        label: 'Team & Users', 
        icon: <Users className="w-4 h-4" />, 
        module: 'access' 
      },
      { 
        id: 'master', 
        label: 'Master Data', 
        icon: <Database className="w-4 h-4" />, 
        module: 'masterData' 
      },
      { 
        id: 'users', 
        label: 'User Management', 
        icon: <UserCog className="w-4 h-4" />, 
        module: 'userManagement' 
      },
      { 
        id: 'auditLog', 
        label: 'Enterprise Audit', 
        icon: <History className="w-4 h-4" />, 
        module: 'auditLog' 
      },
      { 
        id: 'dbExplorer', 
        label: 'DB Explorer', 
        icon: <Database className="w-4 h-4" />, 
        module: 'dbExplorer' 
      },
      { 
        id: 'settingsIntegration', 
        label: 'Settings Integration', 
        icon: <Settings2 className="w-4 h-4" />, 
        module: 'settings' 
      }
    ]
  }
];

