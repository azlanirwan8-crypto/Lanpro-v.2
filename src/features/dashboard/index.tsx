import React, { useEffect, useState, useMemo } from "react";
import { toast } from "sonner";
import { format, formatDistanceToNow, isSameDay } from "date-fns";
import { id } from "date-fns/locale";
import {
  CheckCircle2,
  Activity,
  AlertCircle,
  Zap,
  PackageOpen,
  Clock,
  TrendingUp,
  TrendingDown,
  LayoutGrid,
  PieChartIcon,
  Users,
  Globe,
  ArrowRight,
  ArrowUpRight,
  ArrowDownRight,
  Video,
  FileText,
  GripHorizontal,
  GripVertical,
  Sparkles,
  ShieldAlert,
  Send,
  Check,
  HelpCircle,
  ChevronDown,
  BookOpen,
  Target,
  Calendar,
  UserCircle,
  FolderKanban,
  Database,
  Save,
  ShoppingBag,
  DollarSign,
  Wallet,
  Download,
  Plus,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from "recharts";
import { DashboardViewProps } from "./types";
import { useDashboard, COLORS } from "./hooks";
import { styles } from "./styles";
import { ensureDate } from "../../lib/utils";
import { cn } from "../../lib/utils";
import { apiRequest } from "../../lib/api";
import { motion } from "motion/react";


import { SdlcBoard } from "./components/SdlcBoard";
import { KpiMetricsRow } from "./components/KpiMetricsRow";
import { MetricCard } from "./components/MetricCard";
import { TodayTaskSummary } from "./components/TodayTaskSummary";
import { DashboardDonutChart } from "./components/DashboardCharts";
import { SprintBanner } from "./components/SprintBanner";
import { SprintPhaseAnalysis } from "./components/SprintPhaseAnalysis";
import { SidebarWidgetsStack } from "./components/SidebarWidgetsStack";

const defaultChartOrder = [
  "status-distribution",
  "priority-distribution",
  "user-workload-analytics",
  "team-workload-analytics",
  "tasks-per-user-list",
  "tasks-by-category",
  "sprint-velocity-history",
];

export function DashboardView(props: DashboardViewProps) {
  const {
    tasks,
    dueSoonTasks,
    overdueTasks,
    completedTasks,
    inProgressTasks,
    totalTasks,
    completionPercentage,
    activeSprint,
    sprintProgress,
    sprintTotalTasks,
    sprintCompletedTasks,
    sprintDaysLeft,
    blockedTasks,
    priorityData,
    statusData,
    categoryData,
    workloadData,
    teamWorkloadData,
    sprintWorkloadData,
    burndownData,
    last7DaysData,
    weeklyVelocity,
    velocityData,
    estimationAccuracyData,
    estimationStats,
  } = useDashboard(props);

  // 1. KODE REFACTOR AGREGASI DATA (REACT / HELPER FUNCTION)
  const myPersonalMetrics = useMemo(() => {
    const currentUser = props.currentUser;
    if (!currentUser) {
      return {
        myTasks: [],
        myTodayTasks: [],
        total: 0,
        completed: 0,
        inProgress: 0,
        overdue: 0,
        completionPercentage: 0,
        statusData: []
      };
    }

    const currentUserId = currentUser.uid || currentUser.id;
    const currentUserEmail = currentUser.email;

    // Filter STRICT ASSIGNEE
    const myTasks = tasks.filter(t => {
      // Handle array or single string for assigneeId if needed, but usually string
      const isAssignee = t.assigneeId === currentUserId || t.assigneeEmail === currentUserEmail;
      
      // Exclude Parent tasks (Epic/Story) if they are not explicitly assigned to this user
      // Assuming tasks have a type/issueType property or we rely strictly on assignee
      return isAssignee;
    });

    const now = new Date();
    
    // Total Denominator
    const total = myTasks.length;

    // Task categories
    const completedTasks = myTasks.filter(t => t.status?.toLowerCase() === 'done' || t.status?.toLowerCase() === 'selesai');
    const completed = completedTasks.length;
    
    const inProgressTasks = myTasks.filter(t => !['done', 'selesai', 'backlog'].includes(t.status?.toLowerCase() || ''));
    const inProgress = inProgressTasks.length;

    const overdueTasks = myTasks.filter(t => 
      !['done', 'selesai'].includes(t.status?.toLowerCase() || '') && 
      t.endDate && 
      ensureDate(t.endDate).getTime() < now.getTime()
    );
    const overdue = overdueTasks.length;

    const completionPercentage = total === 0 ? 0 : Math.round((completed / total) * 100);

    // Today's task logic
    const myTodayTasks = myTasks.filter(t => {
      let isDueToday = false;
      if (t.dueDate || t.endDate) {
        const dateToUse = t.dueDate ? ensureDate(t.dueDate) : ensureDate(t.endDate!);
        isDueToday = isSameDay(dateToUse, now);
      }
      const isActive = !["done", "archive", "closed", "canceled", "selesai"].includes(t.status?.toLowerCase() || "");
      return isDueToday || isActive;
    });

    const statusMap: Record<string, number> = {};
    myTodayTasks.forEach(t => {
      const s = t.status || 'To Do';
      statusMap[s] = (statusMap[s] || 0) + 1;
    });
    
    const todayTotal = myTodayTasks.length;
    
    const statusData = Object.entries(statusMap)
      .sort((a,b) => b[1] - a[1])
      .map(([name, count], i) => ({
        name,
        current_count: count,
        total_count: todayTotal,
        color_code: COLORS[i % COLORS.length]
      }));

    return {
      myTasks,
      myTodayTasks,
      total,
      completed,
      inProgress,
      overdue,
      completionPercentage,
      statusData
    };
  }, [tasks, props.currentUser]);

  const formattedStatusData = myPersonalMetrics.statusData;

  const [revenueFilter, setRevenueFilter] = useState<'ALL' | '1M' | '6M' | '1Y'>('ALL');
  const [productSort, setProductSort] = useState<string>('Today');

  const {
    selectedProject,
    setCurrentView,
    setSelectedTaskForDetail,
    setIsTaskDetailModalOpen,
    projectMembers,
    activityLogs,
    userRole,
    currentUser,
  } = props;

  const cardStyleClass = (id: string) => {
    const isStacked = ["sdlc", "sprint-banner", "sprint-user-tasks", "velocity-bar", "velocity-line", "sidebar-widgets-stack"].includes(id);
    const heightClass = isStacked ? "h-auto" : "h-full";

    if (id === "sdlc") {
      return cn(
        heightClass,
        "flex flex-col rounded-lg transition-all duration-300 relative w-full bg-slate-900 border border-slate-800 text-white shadow-2xl pb-8 overflow-y-auto no-scrollbar"
      );
    }
    if (id === "sidebar-widgets-stack") {
      return cn(
        heightClass,
        "flex flex-col rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 shadow-sm p-6 transition-all duration-300 relative overflow-hidden"
      );
    }
    if (id === "sprint-banner") {
      return cn(
        heightClass,
        "flex flex-col rounded-lg transition-all duration-300 relative bg-transparent overflow-hidden"
      );
    }
    if (id === "velocity-bar" || id === "velocity-line") {
      return cn(
        heightClass,
        "flex flex-col rounded-lg bg-slate-900 border border-slate-800 text-white shadow-xl p-5 hover:border-slate-700 transition-all duration-300 relative overflow-hidden"
      );
    }
    return cn(
      heightClass,
      "flex flex-col rounded-lg transition-all duration-300 relative border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 shadow-sm p-6 overflow-hidden"
    );
  };

  const myActiveTasks = useMemo(() => {
    if (!currentUser) return [];
    return tasks.filter(
      (t) =>
        t.assigneeId === currentUser.uid &&
        !["done", "archive", "closed", "canceled"].includes(
          t.status?.toLowerCase() || "",
        ),
    );
  }, [tasks, currentUser]);

  const [meetings, setMeetings] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);

  const [waterfallGates, setWaterfallGates] = useState<
    Record<
      string,
      { approved: boolean; approvedBy: boolean | string; approvedAt: string }
    >
  >(() => {
    try {
      const saved = localStorage.getItem(
        `waterfall_gates_${selectedProject?.id || "default"}`,
      );
      return saved
        ? JSON.parse(saved)
        : {
            requirements: { approved: false, approvedBy: "", approvedAt: "" },
            design: { approved: false, approvedBy: "", approvedAt: "" },
            coding: { approved: false, approvedBy: "", approvedAt: "" },
            sit: { approved: false, approvedBy: "", approvedAt: "" },
            uat: { approved: false, approvedBy: "", approvedAt: "" },
            golive: { approved: false, approvedBy: "", approvedAt: "" },
          };
    } catch {
      return {
        requirements: { approved: false, approvedBy: "", approvedAt: "" },
        design: { approved: false, approvedBy: "", approvedAt: "" },
        coding: { approved: false, approvedBy: "", approvedAt: "" },
        sit: { approved: false, approvedBy: "", approvedAt: "" },
        uat: { approved: false, approvedBy: "", approvedAt: "" },
        golive: { approved: false, approvedBy: "", approvedAt: "" },
      };
    }
  });

  const [activeWaterfallTab, setActiveWaterfallTab] =
    useState<string>("requirements");

  const waterfallPhaseTaskCounts = useMemo(() => {
    const phases = {
      requirements: { total: 0, done: 0 },
      design: { total: 0, done: 0 },
      coding: { total: 0, done: 0 },
      sit: { total: 0, done: 0 },
      uat: { total: 0, done: 0 },
      golive: { total: 0, done: 0 },
    };

    tasks.forEach((t) => {
      const cat = (t.category || "").toLowerCase();
      const status = (t.status || "").toLowerCase();
      const isDone = status === "done" || status === "closed";

      if (
        cat.includes("req") ||
        cat.includes("analis") ||
        cat.includes("kebutuhan") ||
        cat.includes("initiation")
      ) {
        phases.requirements.total++;
        if (isDone) phases.requirements.done++;
      } else if (
        cat.includes("design") ||
        cat.includes("desain") ||
        cat.includes("arsitektur") ||
        cat.includes("architecture")
      ) {
        phases.design.total++;
        if (isDone) phases.design.done++;
      } else if (
        cat.includes("code") ||
        cat.includes("dev") ||
        cat.includes("pengembangan") ||
        cat.includes("rekayasa")
      ) {
        phases.coding.total++;
        if (isDone) phases.coding.done++;
      } else if (
        cat.includes("sit") ||
        cat.includes("integras") ||
        cat.includes("system test") ||
        cat.includes("interoperab")
      ) {
        phases.sit.total++;
        if (isDone) phases.sit.done++;
      } else if (
        cat.includes("uat") ||
        cat.includes("acceptance") ||
        cat.includes("pengujian") ||
        cat.includes("user test")
      ) {
        phases.uat.total++;
        if (isDone) phases.uat.done++;
      } else if (
        cat.includes("deploy") ||
        cat.includes("live") ||
        cat.includes("implementas") ||
        cat.includes("release")
      ) {
        phases.golive.total++;
        if (isDone) phases.golive.done++;
      }
    });

    return phases;
  }, [tasks]);

  useEffect(() => {
    if (!selectedProject) return;
    try {
      const saved = localStorage.getItem(
        `waterfall_gates_${selectedProject.id}`,
      );
      if (saved) {
        setWaterfallGates(JSON.parse(saved));
      } else {
        setWaterfallGates({
          requirements: { approved: false, approvedBy: "", approvedAt: "" },
          design: { approved: false, approvedBy: "", approvedAt: "" },
          coding: { approved: false, approvedBy: "", approvedAt: "" },
          sit: { approved: false, approvedBy: "", approvedAt: "" },
          uat: { approved: false, approvedBy: "", approvedAt: "" },
          golive: { approved: false, approvedBy: "", approvedAt: "" },
        });
      }
    } catch (e) {
      console.error(e);
    }
  }, [selectedProject]);

  const handleToggleGate = (gateId: string) => {
    if (!selectedProject) return;
    const isAuthorized =
      userRole === "admin" || userRole === "manager" || userRole === "head";
    if (!isAuthorized) {
      toast.error(
        "Hanya Admin, Project Manager, atau Head yang dapat menyetujui gate ini.",
      );
      return;
    }

    const currentApproved = waterfallGates[gateId]?.approved;
    const updated = {
      ...waterfallGates,
      [gateId]: {
        approved: !currentApproved,
        approvedBy: !currentApproved
          ? currentUser?.displayName || currentUser?.username || "User Auth"
          : "",
        approvedAt: !currentApproved
          ? format(new Date(), "yyyy-MM-dd HH:mm")
          : "",
      },
    };

    setWaterfallGates(updated);
    localStorage.setItem(
      `waterfall_gates_${selectedProject.id}`,
      JSON.stringify(updated),
    );
  };

  useEffect(() => {
    if (!selectedProject) return;
    const effectiveUserId = currentUser?.uid || "guest";

    apiRequest(`/api/projects/${selectedProject.id}/meetings`, {
      headers: { "x-user-id": effectiveUserId }
    })
      .then((data) => {
        if (data.status === "success") {
          setMeetings(data.data.slice(0, 3));
        }
      })
      .catch(console.error);

    apiRequest(`/api/projects/${selectedProject.id}/documents`, {
      headers: { "x-user-id": effectiveUserId }
    })
      .then((data) => {
        if (data.status === "success") {
          setDocuments(data.data.slice(0, 3));
        }
      })
      .catch(console.error);
  }, [selectedProject, currentUser]);

  const taskTypeBreakdown = useMemo(() => {
    const counts: Record<string, number> = {
      epic: 0,
      story: 0,
      task: 0,
      bug: 0,
      subtask: 0,
    };
    tasks.forEach((t) => {
      const type = (t.type || 'task').toLowerCase();
      if (counts[type] !== undefined) counts[type]++;
      else counts['task']++;
    });
    return [
      { name: 'Epic', value: counts.epic || 0, color: '#8b5cf6', pct: totalTasks ? Math.round(((counts.epic || 0) / totalTasks) * 100) : 0 },
      { name: 'Story', value: counts.story || 0, color: '#10b981', pct: totalTasks ? Math.round(((counts.story || 0) / totalTasks) * 100) : 0 },
      { name: 'Task', value: counts.task || 0, color: '#3b82f6', pct: totalTasks ? Math.round(((counts.task || 0) / totalTasks) * 100) : 0 },
      { name: 'Bug', value: counts.bug || 0, color: '#ef4444', pct: totalTasks ? Math.round(((counts.bug || 0) / totalTasks) * 100) : 0 },
      { name: 'Subtask', value: counts.subtask || 0, color: '#06b6d4', pct: totalTasks ? Math.round(((counts.subtask || 0) / totalTasks) * 100) : 0 },
    ];
  }, [tasks, totalTasks]);

  const statusBreakdown = useMemo(() => {
    const statusMap: Record<string, number> = {
      'To Do': 0,
      'In Progress': 0,
      'In Review': 0,
      'Done': 0,
      'Blocked': 0
    };
    tasks.forEach(t => {
      const s = t.status || 'To Do';
      if (statusMap[s] !== undefined) statusMap[s]++;
      else statusMap[s] = (statusMap[s] || 0) + 1;
    });
    return Object.entries(statusMap).map(([name, value]) => ({
      name,
      value,
      pct: totalTasks ? Math.round((value / totalTasks) * 100) : 0,
      color: name === 'Done' || name === 'Selesai' ? '#10b981' :
             name === 'In Progress' ? '#3b82f6' :
             name === 'In Review' ? '#8b5cf6' :
             name === 'Blocked' ? '#ef4444' : '#64748b'
    }));
  }, [tasks, totalTasks]);

  const epicsList = useMemo(() => {
    const epicTasks = tasks.filter(t => (t.type?.toLowerCase() === 'epic') || (t.category?.toLowerCase() === 'epic'));
    return epicTasks.map(epic => {
      const childTasks = tasks.filter(t => t.parentId === epic.id);
      const childTotal = childTasks.length;
      const childCompleted = childTasks.filter(t => t.status === 'Done' || t.status === 'Selesai').length;
      const progress = childTotal === 0 ? (epic.status === 'Done' || epic.status === 'Selesai' ? 100 : 0) : Math.round((childCompleted / childTotal) * 100);
      return {
        id: epic.id,
        key: epic.key,
        title: epic.title,
        status: epic.status,
        endDate: epic.endDate,
        childTotal,
        childCompleted,
        progress
      };
    });
  }, [tasks]);

  const timeTrackingStats = useMemo(() => {
    let totalEst = 0;
    let totalLog = 0;
    tasks.forEach(t => {
      totalEst += Number(t.estimatedHours) || Number(t.storyPoints) || 0;
      totalLog += Number(t.loggedHours) || 0;
    });
    const diff = totalEst - totalLog;
    const accuracy = totalEst === 0 ? 100 : Math.min(100, Math.round((totalLog / (totalEst || 1)) * 100));
    return { totalEst, totalLog, diff, accuracy };
  }, [tasks]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  const realVelocityChartData = useMemo(() => {
    if (velocityData && velocityData.length > 0) return velocityData;
    if (activeSprint) {
      return [
        {
          name: activeSprint.name,
          Planned: sprintTotalTasks,
          Completed: sprintCompletedTasks
        }
      ];
    }
    return [
      {
        name: 'All Tasks',
        Planned: totalTasks,
        Completed: completedTasks.length
      }
    ];
  }, [velocityData, activeSprint, sprintTotalTasks, sprintCompletedTasks, totalTasks, completedTasks]);

  return (
    <div className={styles.container}>
      <div className={styles.wrapper}>
        {/* Velzon Agile Dashboard Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 bg-white dark:bg-slate-900 p-5 rounded-lg border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              {getGreeting()}, {currentUser?.displayName || "Administrator"}!
            </h2>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">
              Agile Project Analytics & Real-time Task Summary — <span className="font-semibold text-slate-700 dark:text-slate-300">{props.selectedProject?.name || 'All Active Projects'}</span>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-indigo-50/70 dark:bg-slate-800 px-3 py-2 rounded-lg border border-indigo-100 dark:border-slate-700 text-xs font-semibold text-indigo-700 dark:text-slate-300">
              <Zap className="w-3.5 h-3.5 text-indigo-500" />
              <span>Sprint: {activeSprint?.name || 'No Active Sprint'} ({sprintDaysLeft} days left)</span>
            </div>
          </div>
        </div>

        {/* Real-time Agile Top 4 KPI Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
          {/* Card 1: Total Tasks */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-lg border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col justify-between relative overflow-hidden">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Total Tasks</span>
                <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1">{totalTasks}</h3>
              </div>
              <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 border border-emerald-100">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between text-xs border-t border-slate-100 dark:border-slate-800 pt-3">
              <span className="flex items-center gap-1 font-semibold text-emerald-600">
                <ArrowUpRight className="w-3.5 h-3.5" /> {completionPercentage}% Completed
              </span>
              <button onClick={() => props.setCurrentView('kanban')} className="text-slate-400 hover:text-indigo-600 text-[11px] font-semibold underline transition">
                View all tasks
              </button>
            </div>
          </div>

          {/* Card 2: Pending & Active Tasks */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-lg border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col justify-between relative overflow-hidden">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Pending / Active Tasks</span>
                <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1">{inProgressTasks.length + tasks.filter(t => t.status === 'To Do' || t.status === 'Backlog').length}</h3>
              </div>
              <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 border border-blue-100">
                <Activity className="w-5 h-5 animate-pulse" />
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between text-xs border-t border-slate-100 dark:border-slate-800 pt-3">
              <span className="font-semibold text-blue-600">
                {inProgressTasks.length} In Progress
              </span>
              <button onClick={() => props.setCurrentView('kanban')} className="text-slate-400 hover:text-indigo-600 text-[11px] font-semibold underline transition">
                View active board
              </button>
            </div>
          </div>

          {/* Card 3: Done Tasks */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-lg border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col justify-between relative overflow-hidden">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Done / Selesai Tasks</span>
                <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1">{completedTasks.length}</h3>
              </div>
              <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 border border-indigo-100">
                <PackageOpen className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between text-xs border-t border-slate-100 dark:border-slate-800 pt-3">
              <span className="flex items-center gap-1 font-semibold text-emerald-600">
                <ArrowUpRight className="w-3.5 h-3.5" /> +{completionPercentage}% Rate
              </span>
              <button onClick={() => props.setCurrentView('kanban')} className="text-slate-400 hover:text-indigo-600 text-[11px] font-semibold underline transition">
                View done list
              </button>
            </div>
          </div>

          {/* Card 4: Blocked & Critical Issues */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-lg border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col justify-between relative overflow-hidden">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Blocked / Stoppers</span>
                <h3 className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-1">{blockedTasks.length + overdueTasks.length}</h3>
              </div>
              <div className="w-10 h-10 rounded-lg bg-rose-50 dark:bg-rose-950/50 flex items-center justify-center text-rose-600 border border-rose-100">
                <ShieldAlert className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between text-xs border-t border-slate-100 dark:border-slate-800 pt-3">
              <span className="font-semibold text-rose-600">
                {blockedTasks.length} Blocked • {overdueTasks.length} Overdue
              </span>
              <button onClick={() => props.setCurrentView('kanban')} className="text-slate-400 hover:text-indigo-600 text-[11px] font-semibold underline transition">
                Resolve issues
              </button>
            </div>
          </div>
        </div>

        {/* Real-time Dashboard Panels Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start text-left">
          {/* Main Column: Left Area */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Sprint Velocity & Progress Chart */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-lg border border-slate-200 dark:border-slate-800 shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
                <div>
                  <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-indigo-500" />
                    Sprint Progress & Velocity Overview
                  </h3>
                </div>
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-md">
                  {(['ALL', '1M', '6M', '1Y'] as const).map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setRevenueFilter(filter)}
                      className={cn(
                        "px-3 py-1 rounded text-[11px] font-semibold transition cursor-pointer",
                        revenueFilter === filter
                          ? "bg-indigo-600 text-white shadow-2xs"
                          : "text-slate-600 dark:text-slate-300 hover:text-slate-900"
                      )}
                    >
                      {filter}
                    </button>
                  ))}
                </div>
              </div>

              {/* Active Sprint Sub-metrics Bar */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200/60 dark:border-slate-800">
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase">Active Sprint</span>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-100 mt-0.5 truncate">{activeSprint?.name || 'No Sprint'}</p>
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase">Sprint Progress</span>
                  <p className="text-sm font-bold text-emerald-600 mt-0.5">{sprintProgress}% ({sprintCompletedTasks}/{sprintTotalTasks} tasks)</p>
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase">Weekly Velocity</span>
                  <p className="text-sm font-bold text-indigo-600 mt-0.5">{weeklyVelocity ? weeklyVelocity : '0.0'} pts/sprint</p>
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase">Days Left</span>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-100 mt-0.5">{sprintDaysLeft} days</p>
                </div>
              </div>

              {/* Sprint Velocity Chart */}
              <div className="h-[260px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={realVelocityChartData} 
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ borderRadius: '0.5rem', border: 'none', background: '#1e293b', color: '#fff', fontSize: '11px' }} />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                    <Bar dataKey="Completed" name="Completed Tasks / Points" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={24} />
                    <Bar dataKey="Planned" name="Total Planned Tasks / Points" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={24} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Task Breakdown Grid (Jenis Task & Status Breakdown) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Task Breakdown by Type (Epic, Story, Task, Bug, Subtask) */}
              <div className="bg-white dark:bg-slate-900 p-5 rounded-lg border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
                    <LayoutGrid className="w-4 h-4 text-purple-500" />
                    Task Breakdown by Type
                  </h3>
                  <span className="text-[11px] font-semibold text-slate-400">{totalTasks} Total</span>
                </div>

                <div className="space-y-3">
                  {taskTypeBreakdown.map((t, idx) => (
                    <div key={idx} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 font-medium text-slate-700 dark:text-slate-300">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: t.color }} />
                          <span>{t.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-800 dark:text-slate-100">{t.value}</span>
                          <span className="text-[11px] text-slate-400">({t.pct}%)</span>
                        </div>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${t.pct}%`, backgroundColor: t.color }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Task Breakdown by Status (To Do, In Progress, Review, Done, Blocked) */}
              <div className="bg-white dark:bg-slate-900 p-5 rounded-lg border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
                    <PieChartIcon className="w-4 h-4 text-emerald-500" />
                    Task Breakdown by Status
                  </h3>
                  <span className="text-[11px] font-semibold text-slate-400">{totalTasks} Total</span>
                </div>

                <div className="space-y-3">
                  {statusBreakdown.map((s, idx) => (
                    <div key={idx} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 font-medium text-slate-700 dark:text-slate-300">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                          <span>{s.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-800 dark:text-slate-100">{s.value}</span>
                          <span className="text-[11px] text-slate-400">({s.pct}%)</span>
                        </div>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${s.pct}%`, backgroundColor: s.color }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Task Allocation per Team Member (Workload per User) */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-lg border border-slate-200 dark:border-slate-800 shadow-2xs">
              <div className="flex items-center justify-between mb-4 border-b border-slate-100 dark:border-slate-800 pb-3">
                <div>
                  <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
                    <Users className="w-4 h-4 text-indigo-500" />
                    Task Workload Distribution per User
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5 font-medium">Alokasi & penyelesaian task tiap anggota tim</p>
                </div>
                <button onClick={() => props.setCurrentView('team')} className="text-xs font-semibold text-indigo-600 hover:underline">
                  Manage Team
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      <th className="py-2.5 px-2">Team Member</th>
                      <th className="py-2.5 px-2">Active Tasks</th>
                      <th className="py-2.5 px-2">Done Tasks</th>
                      <th className="py-2.5 px-2">Total Allocated</th>
                      <th className="py-2.5 px-2 text-right">Progress Bar</th>
                    </tr>
                  </thead>
                  <tbody className="text-xs divide-y divide-slate-100 dark:divide-slate-800 font-medium text-slate-700 dark:text-slate-300">
                    {workloadData.length > 0 ? (
                      workloadData.map((user, idx) => {
                        const totalUserTasks = user.Done + user.Active;
                        const pct = totalUserTasks ? Math.round((user.Done / totalUserTasks) * 100) : 0;
                        return (
                          <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                            <td className="py-3 px-2">
                              <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
                                  {user.name.slice(0, 2).toUpperCase()}
                                </div>
                                <span className="font-semibold text-slate-800 dark:text-slate-100">{user.name}</span>
                              </div>
                            </td>
                            <td className="py-3 px-2 font-semibold text-blue-600">{user.Active}</td>
                            <td className="py-3 px-2 font-semibold text-emerald-600">{user.Done}</td>
                            <td className="py-3 px-2 font-bold text-slate-800 dark:text-slate-100">{totalUserTasks}</td>
                            <td className="py-3 px-2 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <span className="text-[11px] font-semibold text-slate-500 w-9">{pct}%</span>
                                <div className="w-24 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pct}%` }} />
                                </div>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-slate-400 italic">No task allocations recorded yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Widget 4: Epic & Roadmap Delivery Status (Waterfall & Agile Milestone Tracker) */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-lg border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div>
                  <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
                    <Target className="w-4 h-4 text-purple-500" />
                    Epic & Roadmap Milestone Delivery Status
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5 font-medium">Progress pencapaian Epic & milestone utama proyek</p>
                </div>
                <button onClick={() => props.setCurrentView('roadmap')} className="text-xs font-semibold text-indigo-600 hover:underline">
                  View Roadmap
                </button>
              </div>

              <div className="space-y-3">
                {epicsList.length > 0 ? (
                  epicsList.slice(0, 4).map((epic, idx) => (
                    <div key={idx} className="p-3 bg-slate-50/70 dark:bg-slate-800/50 rounded-lg border border-slate-200/60 dark:border-slate-800 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-[10px] font-mono font-bold text-purple-600 bg-purple-50 px-1.5 py-0.2 rounded border border-purple-100">{epic.key || 'EPIC'}</span>
                          <span className="font-bold text-slate-800 dark:text-slate-100 truncate">{epic.title}</span>
                        </div>
                        <span className="text-[11px] font-semibold text-slate-500 shrink-0">
                          {epic.childCompleted}/{epic.childTotal} Child Tasks ({epic.progress}%)
                        </span>
                      </div>
                      <div className="w-full h-2 bg-slate-200/80 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div 
                          className={cn(
                            "h-full rounded-full transition-all duration-500",
                            epic.progress === 100 ? "bg-emerald-500" : "bg-purple-600"
                          )} 
                          style={{ width: `${epic.progress}%` }} 
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center bg-slate-50/50 rounded-lg border border-dashed border-slate-200 text-xs text-slate-400">
                    Belum ada Epic yang dikonfigurasi. Buat Epic baru di papan Kanban/Roadmap untuk melacak Milestone.
                  </div>
                )}
              </div>
            </div>

            {/* Widget 5: Sprint Time Tracking & Estimation Accuracy */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-lg border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div>
                  <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
                    <Clock className="w-4 h-4 text-blue-500" />
                    Time Tracking & Effort Estimation
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5 font-medium">Perbandingan estimasi jam pengerjaan vs jam terpakai</p>
                </div>
                <span className="text-[11px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                  {timeTrackingStats.accuracy}% Accuracy Rate
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200/60 dark:border-slate-800">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase">Estimated Hours</span>
                  <p className="text-lg font-bold text-slate-800 dark:text-slate-100 mt-0.5">{timeTrackingStats.totalEst} Hours</p>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200/60 dark:border-slate-800">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase">Logged Hours</span>
                  <p className="text-lg font-bold text-indigo-600 mt-0.5">{timeTrackingStats.totalLog} Hours</p>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200/60 dark:border-slate-800">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase">Remaining Variance</span>
                  <p className="text-lg font-bold text-emerald-600 mt-0.5">{timeTrackingStats.diff >= 0 ? `${timeTrackingStats.diff} Hours Left` : `${Math.abs(timeTrackingStats.diff)} Hours Over`}</p>
                </div>
              </div>
            </div>

            {/* Widget 6: 7-Day Activity Trend & Task Creation Rate */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-lg border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div>
                  <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
                    <Activity className="w-4 h-4 text-emerald-500" />
                    7-Day Activity & Task Completion Trend
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5 font-medium">Tren pembuatan vs penyelesaian task 7 hari terakhir</p>
                </div>
              </div>

              <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={last7DaysData && last7DaysData.length > 0 ? last7DaysData : [
                    { day: 'Mon', Created: 4, Completed: 3 },
                    { day: 'Tue', Created: 6, Completed: 5 },
                    { day: 'Wed', Created: 8, Completed: 7 },
                    { day: 'Thu', Created: 5, Completed: 6 },
                    { day: 'Fri', Created: 9, Completed: 8 },
                    { day: 'Sat', Created: 2, Completed: 4 },
                    { day: 'Sun', Created: 1, Completed: 2 },
                  ]} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ borderRadius: '0.5rem', border: 'none', background: '#1e293b', color: '#fff', fontSize: '11px' }} />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                    <Area type="monotone" dataKey="Completed" name="Tasks Selesai" stroke="#10b981" fill="#10b981" fillOpacity={0.15} strokeWidth={2} />
                    <Area type="monotone" dataKey="Created" name="Tasks Dibuat" stroke="#6366f1" fill="#6366f1" fillOpacity={0.15} strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Right Column: Priority Distribution & Watchlist */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Priority Breakdown */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-lg border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-500" />
                  Task Priority Breakdown
                </h3>
                <button onClick={() => props.setCurrentView('kanban')} className="text-xs font-semibold text-indigo-600 hover:underline">Filter</button>
              </div>

              <div className="space-y-3">
                {priorityData.map((p, idx) => {
                  const pct = totalTasks ? Math.round((p.value / totalTasks) * 100) : 0;
                  const color = p.name === 'Highest' || p.name === 'High' ? '#ef4444' :
                                p.name === 'Medium' ? '#f59e0b' : '#3b82f6';
                  return (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                          {p.name} Priority
                        </span>
                        <span className="text-slate-800 dark:text-slate-100 font-bold">{p.value} ({pct}%)</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Blocked & Overdue Watchlist */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-lg border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-rose-500" />
                  Blocked & Overdue Issues
                </h3>
                <span className="text-[10px] font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-100">
                  {blockedTasks.length + overdueTasks.length} Need Action
                </span>
              </div>

              <div className="space-y-2.5 max-h-[290px] overflow-y-auto custom-scrollbar pr-1">
                {[...blockedTasks, ...overdueTasks].map((issue, idx) => (
                  <div 
                    key={idx} 
                    onClick={() => {
                      props.setSelectedTaskForDetail(issue);
                      props.setIsTaskDetailModalOpen(true);
                    }}
                    className="p-3 rounded-lg border border-slate-200/70 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-white hover:border-indigo-200 transition cursor-pointer flex items-center justify-between gap-3 shadow-2xs group"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">{issue.key}</span>
                        {issue.isBlocked && <span className="text-[9px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.2 rounded border border-rose-100">BLOCKED</span>}
                      </div>
                      <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate mt-0.5 group-hover:text-indigo-600 transition">{issue.title}</p>
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition shrink-0" />
                  </div>
                ))}
                {blockedTasks.length === 0 && overdueTasks.length === 0 && (
                  <div className="py-4 text-center text-xs text-slate-400 italic">No blocked or overdue issues detected.</div>
                )}
              </div>
            </div>

            {/* Sidebar Widgets Stack for remaining tools */}
            <SidebarWidgetsStack
              myActiveTasks={inProgressTasks}
              blockedTasks={blockedTasks}
              overdueTasks={overdueTasks}
              dueSoonTasks={dueSoonTasks}
              meetings={props.activityLogs || []}
              documents={[]}
              activityLogs={props.activityLogs || []}
              projectMembers={props.projectMembers || []}
              setSelectedTaskForDetail={props.setSelectedTaskForDetail}
              setIsTaskDetailModalOpen={props.setIsTaskDetailModalOpen}
              setCurrentView={props.setCurrentView}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
export default DashboardView;