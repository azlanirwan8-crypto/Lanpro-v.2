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
    title: 'Menu',
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
    id: 'collaboration',
    title: 'Collaboration',
    items: [
      { 
        id: 'meetingNotes', 
        label: 'Meeting Notes', 
        icon: <Video className="w-4 h-4" />, 
        module: 'meetingNotes' 
      },
      { 
        id: 'wiki', 
        label: 'Documentation', 
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
    id: 'projects',
    title: 'Management Project',
    items: [
      { 
        id: 'list', 
        label: 'Issue List', 
        icon: <ListTodo className="w-4 h-4" />, 
        module: 'list' 
      },
      { 
        id: 'sprints', 
        label: 'Planning & Sprint', 
        icon: <Target className="w-4 h-4" />, 
        module: 'sprints' 
      },
      { 
        id: 'board', 
        label: 'Kanban board', 
        icon: <Trello className="w-4 h-4" />, 
        module: 'board' 
      },
      { 
        id: 'qa', 
        label: 'Quality Assessment', 
        icon: <Beaker className="w-4 h-4" />, 
        module: 'qa' 
      },
      { 
        id: 'timeline', 
        label: 'Roadmap & Timeline', 
        icon: <Clock className="w-4 h-4" />, 
        module: 'timeline' 
      },
      { 
        id: 'team', 
        label: 'Team', 
        icon: <Users className="w-4 h-4" />, 
        module: 'access' 
      }
    ]
  },
  {
    id: 'administration',
    title: 'Administration',
    items: [
      { 
        id: 'master', 
        label: 'Master Data', 
        icon: <Database className="w-4 h-4" />, 
        module: 'masterData' 
      },
      { 
        id: 'users', 
        label: 'User management', 
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
        label: 'DB EXplorer', 
        icon: <Database className="w-4 h-4" />, 
        module: 'dbExplorer' 
      },
      { 
        id: 'settingsIntegration', 
        label: 'Setting integration', 
        icon: <Settings2 className="w-4 h-4" />, 
        module: 'settings' 
      }
    ]
  }
];


