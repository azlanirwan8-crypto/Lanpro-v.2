import React from "react";
import { DashboardView } from "../features/dashboard";
import { IssueListView } from "../features/issues";
import { PlanningView } from "../features/planning";
import { BoardView } from "../features/kanban/index";
import { TestQAPanel } from "../features/qa/TestQAPanel";
import { WikiView } from "../features/wiki";
import { MeetingNotes } from "../features/meeting-notes/MeetingNotes";
import { NotebookLM } from "../features/notebook-lm";
import { FlowchartView } from "../features/flowchart";
import { MasterDataPanel } from "../features/master/MasterDataPanel";
import { ConnectPanel } from "../features/connect/ConnectPanel";
import { EnterpriseAuditDashboard } from "../features/enterprise-audit/EnterpriseAuditDashboard";
import { ActivityLogPanel } from "../features/activity/ActivityLogPanel";
import { TimelinePanel } from "../features/timeline/index";
import { TeamManagementPanel } from "../features/team/TeamManagementPanel";
import { DbExplorerPanel } from "../features/explorer/DbExplorerPanel";
import { SettingsPage } from "../features/settings/SettingsPage";
import { ShieldAlert, FolderKanban } from "lucide-react";

export interface AppRoutesProps {
  currentView: string;
  setCurrentView: (view: any) => void;
  selectedProject: any;
  effectiveRole: string;
  currentUser: any;
  currentUserProfile: any;
  projectMembers: any[];
  masterData: any[];
  tasks: any[];
  sprints: any[];
  allUsers: any[];
  activityLogs: any[];
  selectedTaskForDetail: any;
  expandedSprintId: string | null;
  hasPermission: (role: string, feature: string, action: string, isOwner?: boolean, permissions?: any) => boolean;
  updateTaskField: (id: string, field: string, value: any) => any;
  updateTaskStatus?: (id: string, status: string) => void;
  handleQuickCreate: (title: string, parentId?: string) => void;
  setSelectedTaskForDetail: (task: any) => void;
  setIsTaskDetailModalOpen: (open: boolean) => void;
  setIsNewTaskModalOpen: (open: boolean) => void;
  deleteTask: (id: string) => void;
  bulkDeleteTasks: (ids: string[]) => void;
  fetchTasks: () => Promise<void>;
  setExpandedSprintId: (id: string | null) => void;
  setIsNewSprintModalOpen: (open: boolean) => void;
  setIsEditSprintModalOpen: (open: boolean) => void;
  setEditingSprint: (sprint: any) => void;
  handleStartSprint: (sprintId: string) => void;
  handleCompleteSprint: (sprintId: string) => void;
  handleDeleteSprint: (sprintId: string) => void;
  handleDragEndPlanning: (result: any) => void;
  fetchMasterData: () => void;
  fetchProjects: () => void;
  setTasks: (tasks: any[]) => void;
  socket?: any;
  qaInitialStatusFilter?: "ALL" | "Pending" | "Failed" | "Passed" | "Retest" | "Blocked";
  exportTasksToCSV: () => void;
  safeFormat: (date: any, formatStr: string) => string;
  StyledDropdown?: any;
  updateProjectRole?: (memberId: string, newRole: string) => void;
  removeProjectMember?: (memberId: string) => any;
}

export const AppRoutes: React.FC<AppRoutesProps> = (props) => {
  const {
    currentView,
    setCurrentView,
    selectedProject,
    effectiveRole,
    currentUser,
    currentUserProfile,
    projectMembers,
    masterData,
    tasks,
    sprints,
    allUsers,
    activityLogs,
    hasPermission,
    updateTaskField,
    updateTaskStatus,
    handleQuickCreate,
    setSelectedTaskForDetail,
    setIsTaskDetailModalOpen,
    setIsNewTaskModalOpen,
    deleteTask,
    bulkDeleteTasks,
    fetchTasks,
    expandedSprintId,
    setExpandedSprintId,
    setIsNewSprintModalOpen,
    setIsEditSprintModalOpen,
    setEditingSprint,
    handleStartSprint,
    handleCompleteSprint,
    handleDeleteSprint,
    handleDragEndPlanning,
    setTasks,
    socket,
    qaInitialStatusFilter,
    exportTasksToCSV,
    safeFormat,
    fetchMasterData,
    fetchProjects,
    StyledDropdown,
    updateProjectRole,
    removeProjectMember
  } = props;

  if (!selectedProject && !["master", "users", "activity", "connect", "enterprise-audit"].includes(currentView)) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-slate-50/50 p-8 text-center">
        <div className="w-16 h-16 rounded-xl bg-indigo-100/80 border border-indigo-200 flex items-center justify-center text-indigo-600 mb-4 shadow-sm">
          <FolderKanban className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-bold text-slate-800 mb-2">Pilih atau Buat Proyek Baru</h3>
        <p className="text-slate-500 text-sm max-w-sm">
          Silakan pilih proyek dari dropdown di bagian atas atau buat proyek baru untuk mulai mengelola tugas.
        </p>
      </div>
    );
  }

  switch (currentView) {
    case "dashboard":
      return (
        <div className="flex-1 flex flex-col overflow-auto bg-slate-50 dark:bg-slate-950 min-h-screen pb-16 transition-colors duration-200">
          <DashboardView
            tasks={tasks || []}
            sprints={sprints || []}
            projectMembers={projectMembers || []}
            activityLogs={activityLogs || []}
            selectedProject={selectedProject}
            setCurrentView={setCurrentView}
            setSelectedTaskForDetail={setSelectedTaskForDetail}
            setIsTaskDetailModalOpen={setIsTaskDetailModalOpen}
            userRole={effectiveRole}
            currentUser={currentUser}
            fetchTasks={fetchTasks}
          />
        </div>
      );

    case "meetingNotes":
      return (
        <div className="flex-1 flex flex-col min-h-0 bg-slate-50">
          <MeetingNotes
            projectId={selectedProject?.id}
            userRole={effectiveRole}
            currentUser={currentUserProfile || currentUser}
            projectMembers={projectMembers}
            masterData={masterData || []}
            permissions={currentUserProfile?.permissions}
          />
        </div>
      );

    case "wiki":
      return (
        <div className="flex-1 flex flex-col min-h-0 bg-slate-50">
          <WikiView
            projectId={selectedProject?.id}
            users={allUsers}
            currentUser={currentUserProfile}
            masterData={masterData}
          />
        </div>
      );

    case "notebooklm":
      return (
        <div className="flex-1 flex flex-col min-h-0 p-4 bg-slate-50 dark:bg-slate-950">
          {hasPermission(effectiveRole, "notebooklm", "read", false, currentUserProfile?.permissions) ? (
            <NotebookLM
              project={selectedProject}
              userRole={effectiveRole}
              currentUser={currentUserProfile}
            />
          ) : (
            <div className="flex flex-col items-center justify-center w-full h-full p-8 text-center bg-slate-50 dark:bg-slate-900 rounded-xl min-h-[500px]">
              <ShieldAlert className="w-16 h-16 text-rose-500 mb-4 animate-bounce" />
              <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">403 Forbidden</h2>
              <p className="text-slate-500 dark:text-slate-400 max-w-md text-sm">
                Anda tidak memiliki izin untuk mengakses modul NotebookLM.
                Silakan hubungi Administrator untuk memperbarui hak akses Anda.
              </p>
            </div>
          )}
        </div>
      );

    case "list":
      return (
        <IssueListView
          projectRole={
            selectedProject && currentUser?.uid
              ? selectedProject.memberRoles?.[currentUser.uid]
              : undefined
          }
          tasks={tasks || []}
          roots={(tasks || []).filter((t) => !t.parentId || !(tasks || []).some((p) => p.id === t.parentId))}
          sprints={sprints || []}
          projectMembers={projectMembers || []}
          allUsers={allUsers || []}
          masterData={masterData || []}
          userRole={effectiveRole}
          user={currentUser}
          currentUserProfile={currentUserProfile!}
          hasPermission={hasPermission}
          updateTaskField={updateTaskField}
          handleQuickCreate={handleQuickCreate}
          setSelectedTaskForDetail={setSelectedTaskForDetail}
          setIsTaskDetailModalOpen={setIsTaskDetailModalOpen}
          setIsNewTaskModalOpen={setIsNewTaskModalOpen}
          deleteTask={deleteTask}
          bulkDeleteTasks={bulkDeleteTasks}
          selectedProject={selectedProject}
          fetchTasks={fetchTasks}
        />
      );

    case "sprints":
      return (
        <PlanningView
          tasks={tasks || []}
          sprints={sprints || []}
          masterData={masterData || []}
          userRole={effectiveRole}
          currentUserProfile={currentUserProfile}
          projectMembers={projectMembers || []}
          expandedSprintId={expandedSprintId}
          setExpandedSprintId={setExpandedSprintId}
          setSelectedTaskForDetail={setSelectedTaskForDetail}
          setIsTaskDetailModalOpen={setIsTaskDetailModalOpen}
          setIsNewSprintModalOpen={setIsNewSprintModalOpen}
          setIsEditSprintModalOpen={setIsEditSprintModalOpen}
          setEditingSprint={setEditingSprint}
          handleStartSprint={handleStartSprint}
          handleCompleteSprint={handleCompleteSprint}
          handleDeleteSprint={handleDeleteSprint}
          handleDragEndPlanning={handleDragEndPlanning}
        />
      );

    case "board":
      return (
        <div className="flex-1 flex flex-col min-h-0 p-6 bg-slate-50 dark:bg-slate-950">
          <BoardView
            tasks={tasks || []}
            masterData={masterData || []}
            projectMembers={projectMembers || []}
            setSelectedTaskForDetail={setSelectedTaskForDetail}
            setIsTaskDetailModalOpen={setIsTaskDetailModalOpen}
            userRole={effectiveRole}
            user={currentUser}
            selectedProject={selectedProject}
            refreshTasks={fetchTasks}
            setTasks={setTasks}
          />
        </div>
      );

    case "qa":
      return (
        <div className="flex-1 overflow-auto bg-slate-50 relative custom-scrollbar p-6">
          <TestQAPanel
            tasks={tasks || []}
            projectMembers={projectMembers || []}
            selectedProject={selectedProject}
            setSelectedTaskForDetail={setSelectedTaskForDetail}
            setIsTaskDetailModalOpen={setIsTaskDetailModalOpen}
            updateTaskField={updateTaskField}
            updateTaskStatus={updateTaskStatus}
            user={currentUser}
            socket={socket}
            initialStatusFilter={qaInitialStatusFilter}
          />
        </div>
      );

    case "timeline":
      return (
        <TimelinePanel
          tasks={tasks || []}
          selectedProject={selectedProject}
          updateTaskField={updateTaskField}
          setSelectedTaskForDetail={setSelectedTaskForDetail}
          setIsTaskDetailModalOpen={setIsTaskDetailModalOpen}
        />
      );

    case "access":
    case "team":
      return (
        <TeamManagementPanel
          projectMembers={projectMembers || []}
          selectedProject={selectedProject!}
          tasks={tasks || []}
          currentUserProfile={currentUserProfile!}
          userRole={effectiveRole}
          masterData={masterData || []}
          StyledDropdown={StyledDropdown}
          updateProjectRole={updateProjectRole || (() => {})}
          removeProjectMember={removeProjectMember || (async () => {})}
          hasPermission={hasPermission}
          onRefreshProjects={fetchProjects}
        />
      );

    case "flowchart":
      return (
        <div className="flex-1 flex flex-col min-h-0 bg-slate-50">
          <FlowchartView
            selectedProject={selectedProject}
            tasks={tasks || []}
            projectMembers={projectMembers || []}
            setSelectedTaskForDetail={setSelectedTaskForDetail}
            setIsTaskDetailModalOpen={setIsTaskDetailModalOpen}
            currentUserProfile={currentUserProfile}
          />
        </div>
      );

    case "master":
      return (
        <MasterDataPanel
          projects={[]}
          tasks={tasks || []}
          masterData={masterData || []}
          userRole={effectiveRole}
          currentUserProfile={currentUserProfile}
          hasPermission={hasPermission}
          onRefresh={fetchMasterData}
        />
      );

    case "connect":
      return <ConnectPanel />;

    case "enterprise-audit":
    case "auditLog":
      return (
        <div className="flex-1 flex flex-col min-h-0">
          <EnterpriseAuditDashboard
            selectedProject={selectedProject}
            currentUser={currentUser}
          />
        </div>
      );

    case "activity":
      return (
        <ActivityLogPanel
          activityLogs={activityLogs || []}
          exportTasksToCSV={exportTasksToCSV}
          projectMembers={projectMembers || []}
          safeFormat={safeFormat}
        />
      );

    case "dbExplorer":
      return (
        <DbExplorerPanel
          selectedProject={selectedProject}
          tasks={tasks || []}
          sprints={sprints || []}
          projectMembers={projectMembers}
          activityLogs={activityLogs}
          masterData={masterData}
        />
      );

    case "settingsIntegration":
      return (
        (() => {
          const explicitRead = currentUserProfile?.permissions?.settings?.read;
          const hasAccess = explicitRead !== undefined 
            ? explicitRead === true
            : hasPermission(effectiveRole, "settings", "read", false, currentUserProfile?.permissions);
            
          if (!hasAccess) {
            return (
              <div className="flex flex-col items-center justify-center w-full h-full p-8 text-center bg-slate-50 min-h-[calc(100vh-theme(spacing.16))]">
                 <ShieldAlert className="w-16 h-16 text-rose-500 mb-4" />
                 <h2 className="text-2xl font-bold text-slate-800 mb-2">403 Forbidden</h2>
                 <p className="text-slate-500 max-w-md">
                   You do not have permission to view Integration Settings. 
                   Please contact your administrator if you need access.
                 </p>
              </div>
            );
          }
          
          return <SettingsPage />;
        })()
      );

    default:
      return null;
  }
};
