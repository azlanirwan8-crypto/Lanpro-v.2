import { AppRole, UserPermissions, ModulePermission } from '../types';

const FULL_ACCESS: ModulePermission = { create: true, read: true, update: true, delete: true };
const READ_DELETE: ModulePermission = { create: false, read: true, update: false, delete: true };
const READ_ONLY: ModulePermission = { create: false, read: true, update: false, delete: false };
const NO_ACCESS: ModulePermission = { create: false, read: false, update: false, delete: false };

export const DEFAULT_PERMISSIONS: Record<AppRole, UserPermissions> = {
  admin: {
    dashboard: FULL_ACCESS,
    meetingNotes: FULL_ACCESS,
    wiki: FULL_ACCESS,
    notebooklm: FULL_ACCESS,
    list: FULL_ACCESS,
    sprints: FULL_ACCESS,
    board: FULL_ACCESS,
    qa: FULL_ACCESS,
    timeline: FULL_ACCESS,
    access: FULL_ACCESS,
    userManagement: FULL_ACCESS,
    masterData: FULL_ACCESS,
    auditLog: FULL_ACCESS,
    dbExplorer: FULL_ACCESS,
    settings: FULL_ACCESS,
    flowchart: FULL_ACCESS,
  },
  head: {
    dashboard: READ_ONLY,
    meetingNotes: FULL_ACCESS,
    wiki: READ_ONLY,
    notebooklm: FULL_ACCESS,
    list: NO_ACCESS,
    sprints: READ_ONLY,
    board: NO_ACCESS,
    qa: READ_ONLY,
    timeline: READ_ONLY,
    access: READ_ONLY,
    userManagement: NO_ACCESS,
    masterData: NO_ACCESS,
    auditLog: READ_ONLY,
    dbExplorer: NO_ACCESS,
    settings: READ_ONLY,
    flowchart: READ_ONLY,
  },
  manager: {
    dashboard: READ_ONLY,
    meetingNotes: FULL_ACCESS,
    wiki: FULL_ACCESS,
    notebooklm: FULL_ACCESS,
    list: FULL_ACCESS,
    sprints: FULL_ACCESS,
    board: FULL_ACCESS,
    qa: FULL_ACCESS,
    timeline: READ_ONLY,
    access: READ_ONLY,
    userManagement: NO_ACCESS,
    masterData: NO_ACCESS,
    auditLog: READ_ONLY,
    dbExplorer: NO_ACCESS,
    settings: READ_ONLY,
    flowchart: FULL_ACCESS,
  },
  user: {
    dashboard: READ_ONLY,
    meetingNotes: { create: true, read: true, update: true, delete: false },
    wiki: READ_ONLY,
    notebooklm: { create: true, read: true, update: true, delete: false },
    list: { create: true, read: true, update: true, delete: false },
    sprints: READ_ONLY,
    board: { create: false, read: true, update: true, delete: false },
    qa: READ_ONLY,
    timeline: READ_ONLY,
    access: NO_ACCESS,
    userManagement: NO_ACCESS,
    masterData: NO_ACCESS,
    auditLog: NO_ACCESS,
    dbExplorer: NO_ACCESS,
    settings: NO_ACCESS,
    flowchart: READ_ONLY,
  },
  viewer: {
    dashboard: READ_ONLY,
    meetingNotes: NO_ACCESS,
    wiki: READ_ONLY,
    notebooklm: READ_ONLY,
    list: NO_ACCESS,
    sprints: READ_ONLY,
    board: READ_ONLY,
    qa: READ_ONLY,
    timeline: READ_ONLY,
    access: NO_ACCESS,
    userManagement: NO_ACCESS,
    masterData: NO_ACCESS,
    auditLog: NO_ACCESS,
    dbExplorer: NO_ACCESS,
    settings: NO_ACCESS,
    flowchart: READ_ONLY,
  },
};

export const KEY_MAP: Record<string, string> = {
  flowchartEditor: 'flowchart',
  issueList: 'list',
  issues: 'list',
  Kanban: 'board',
  kanban: 'board',
  planning: 'sprints',
  qaTesting: 'qa',
  roadmap: 'timeline',
  team: 'access',
  users: 'userManagement',
  master: 'masterData',
  explorer: 'dbExplorer',
  'enterprise-audit': 'auditLog',
  auditLogs: 'auditLog',
  configuration: 'masterData'
};

export function normalizeModuleKey(key: string): string {
  return KEY_MAP[key] || key;
}

export function cleanUserPermissions(custom: any): any {
  if (!custom) return {};
  let parsedCustom = custom;
  if (typeof custom === 'string') {
    try {
      parsedCustom = JSON.parse(custom);
    } catch {
      return {};
    }
  }
  if (!parsedCustom || typeof parsedCustom !== 'object') return {};
  const cleaned: any = {};
  Object.keys(parsedCustom).forEach((key) => {
    const normKey = KEY_MAP[key] || key;
    if (DEFAULT_PERMISSIONS.admin[normKey as keyof UserPermissions] !== undefined) {
      if (key !== normKey && parsedCustom[normKey] !== undefined) {
        return;
      }
      cleaned[normKey] = parsedCustom[key];
    }
  });
  return cleaned;
}

export function getUserPermissions(role: AppRole, custom?: Partial<UserPermissions>): UserPermissions {
  const normRole = (role ? String(role).toLowerCase().trim() : 'viewer') as AppRole;
  const isAdmin = normRole === 'admin' || normRole === 'administrator' || normRole === 'superadmin';
  if (isAdmin) {
    return DEFAULT_PERMISSIONS.admin;
  }

  const defaults = DEFAULT_PERMISSIONS[normRole] || DEFAULT_PERMISSIONS.viewer;
  
  // Deep copy and normalize defaults
  const merged: any = {};
  Object.keys(defaults).forEach((key) => {
    const normKey = KEY_MAP[key] || key;
    merged[normKey] = { ...defaults[key as keyof UserPermissions] };
  });

  let parsedCustom: any = custom;
  if (typeof custom === 'string') {
    try {
      parsedCustom = JSON.parse(custom);
    } catch {
      parsedCustom = {};
    }
  }

  if (parsedCustom && typeof parsedCustom === 'object') {
    Object.keys(parsedCustom).forEach((key) => {
      const normKey = KEY_MAP[key] || key;
      const customVal = parsedCustom[key as keyof UserPermissions];
      if (customVal) {
        let valToMerge: ModulePermission;
        if (typeof customVal === 'string') {
          // Handle legacy data
          if (customVal === 'full') valToMerge = FULL_ACCESS;
          else if (customVal === 'view') valToMerge = READ_ONLY;
          else valToMerge = NO_ACCESS;
        } else {
          valToMerge = { ...customVal };
        }

        // Check if this key is a deprecated key, and if the standard normalized key exists as a sibling in custom
        if (key !== normKey && parsedCustom[normKey as keyof UserPermissions] !== undefined) {
          // Do not merge this deprecated key! The standard key has higher priority.
          return;
        }

        merged[normKey] = {
          ...(merged[normKey] || NO_ACCESS),
          ...valToMerge
        };
      }
    });
  }
  return merged as UserPermissions;
}

export function hasPermission(
    userRole: AppRole,
    module: keyof UserPermissions | string,
    action: 'create' | 'read' | 'update' | 'delete' | string,
    isOwner: boolean = false,
    customPermissions?: Partial<UserPermissions>
): boolean {
    const normRole = (userRole ? String(userRole).toLowerCase().trim() : 'viewer') as AppRole;
    const isAdmin = normRole === 'admin' || normRole === 'administrator' || normRole === 'superadmin';
    if (isAdmin) {
        return true;
    }

    const normModule = (KEY_MAP[module as string] || module) as keyof UserPermissions;
    
    // Normalize action: map add -> create
    let normalizedAction = action.toLowerCase();
    if (normalizedAction === 'add') normalizedAction = 'create';
    
    // Validate action
    if (!['create', 'read', 'update', 'delete'].includes(normalizedAction)) {
      console.warn(`[PERM_MISMATCH] Module: ${module}, Invalid Action: ${action}`);
      return false;
    }
    
    const actionKey = normalizedAction as 'create' | 'read' | 'update' | 'delete';
    
    const perms = getUserPermissions(userRole, customPermissions);
    const modulePerm = perms[normModule];
    
    const hasActionPerm = Boolean(modulePerm?.[actionKey]);

    // Logging if permission check fails in development
    if (!hasActionPerm) {
        console.warn(`[PERM_MISMATCH] Module: ${module}, Action: ${action} - Denied`);
    }

    // Owners have access if permission allows
    if (isOwner && actionKey !== 'create' && hasActionPerm) {
        return true;
    }

    if (!hasActionPerm) {
        return false;
    }

    // Role-specific ownership logic (unless custom permissions explicitly grant access)
    // Managers bypass ownership checks for project-related modules unless overridden
    if (userRole === 'manager' && !customPermissions?.[normModule] && 
        ['list', 'sprints', 'board', 'meetingNotes', 'qa', 'flowchart'].includes(normModule as string)) {
        return true;
    }

    // General users can only update or delete data they own (Reporter or Assignee), unless custom permissions bypass it
    const isProjectModuleUpdate = actionKey === "update" && ["list", "board", "sprints", "qa"].includes(normModule as string);
    if (userRole === "user" && (actionKey === "delete" || (actionKey === "update" && !isProjectModuleUpdate)) && !isOwner) {
        if (customPermissions && (customPermissions[normModule] || customPermissions[module as keyof UserPermissions])) {
            const customVal = customPermissions[normModule] || customPermissions[module as keyof UserPermissions];
            if (typeof customVal === 'string') {
                if (customVal === 'full') return true;
            } else {
                const hasCustomAction = Boolean((customVal as any)?.[actionKey]);
                if (hasCustomAction) {
                    return true;
                }
            }
        }
        return false;
    }

    return true;
}
