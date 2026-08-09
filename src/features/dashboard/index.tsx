import React, { useEffect, useState, useMemo } from "react";
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
  LayoutGrid,
  PieChartIcon,
  Users,
  Globe,
  ArrowRight,
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
        "flex flex-col rounded-[2.5rem] transition-all duration-300 relative w-full bg-slate-900 border border-slate-800 text-white shadow-2xl pb-8 overflow-y-auto no-scrollbar"
      );
    }
    if (id === "sidebar-widgets-stack") {
      return cn(
        heightClass,
        "flex flex-col rounded-[2.5rem] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 shadow-sm p-6 transition-all duration-300 relative overflow-hidden"
      );
    }
    if (id === "sprint-banner") {
      return cn(
        heightClass,
        "flex flex-col rounded-[2.5rem] transition-all duration-300 relative bg-transparent overflow-hidden"
      );
    }
    if (id === "velocity-bar" || id === "velocity-line") {
      return cn(
        heightClass,
        "flex flex-col rounded-[2.5rem] bg-slate-900 border border-slate-800 text-white shadow-xl p-5 hover:border-slate-700 transition-all duration-300 relative overflow-hidden"
      );
    }
    return cn(
      heightClass,
      "flex flex-col rounded-[2.5rem] transition-all duration-300 relative border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 shadow-sm p-6 overflow-hidden"
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
      { approved: boolean; approvedBy: string; approvedAt: string }
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
      alert(
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

    // Fetch meetings
    apiRequest(`/api/projects/${selectedProject.id}/meetings`, {
      headers: { "x-user-id": effectiveUserId }
    })
      .then((data) => {
        if (data.status === "success") {
          setMeetings(data.data.slice(0, 3));
        }
      })
      .catch(console.error);

    // Fetch documents
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

  return (
    <div className={styles.container}>
      <div className={styles.wrapper}>
        {/* Row 1: Welcome & Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6 items-stretch">
          {/* Welcome Card */}
          <div className="lg:col-span-7 bg-white rounded-2xl p-5 border border-slate-100/80 shadow-sm flex items-center justify-between h-full">
            <div>
              <h2 className="text-xl font-bold text-slate-800">Good morning 👋, Welcome back, {currentUser?.displayName || "User"}!</h2>
              <p className="text-sm text-slate-500 mt-1">Here is your productivity overview for today.</p>
            </div>
          </div>
          
          {/* Today's Task Summary */}
          <div className="lg:col-span-5 h-full">
            <TodayTaskSummary statusData={formattedStatusData} />
          </div>
        </div>

        {/* Metric Cards Row (5 Columns) */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <MetricCard title="My Completion" value={`${myPersonalMetrics.completionPercentage}%`} icon={<CheckCircle2 className="w-4 h-4 text-emerald-500" />} />
          <MetricCard title="My In Progress" value={myPersonalMetrics.inProgress.toString()} icon={<Activity className="w-4 h-4 text-blue-500" />} />
          <MetricCard title="My Overdue" value={myPersonalMetrics.overdue.toString()} icon={<AlertCircle className="w-4 h-4 text-rose-500" />} />
          <MetricCard title="Velocity" value={weeklyVelocity.toString()} icon={<TrendingUp className="w-4 h-4 text-amber-500" />} />
          <MetricCard title="Members" value={projectMembers.length.toString()} icon={<Users className="w-4 h-4 text-indigo-500" />} />
        </div>

        {/* Dashboard Panels Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Main Column: Left Area */}
          <div className="lg:col-span-9 space-y-6">
            {activeSprint ? (
              <SprintBanner
                activeSprint={activeSprint}
                sprintCompletedTasks={sprintCompletedTasks}
                sprintTotalTasks={sprintTotalTasks}
                sprintProgress={sprintProgress}
              />
            ) : (
              <div className="w-full bg-slate-50 border border-slate-200 border-dashed rounded-[2rem] p-6 relative overflow-hidden flex flex-col items-center justify-center text-center">
                <Calendar className="w-8 h-8 text-indigo-400 mb-2 animate-bounce" />
                <span className="text-xs font-bold text-slate-700">Tidak Ada Sprint Aktif</span>
                <span className="text-[10px] text-slate-400 mt-1 max-w-xs font-sans">Aktifkan sprint melalui menu Planning untuk melihat goal sprint di sini.</span>
              </div>
            )}

            <SdlcBoard
              waterfallGates={waterfallGates}
              activeWaterfallTab={activeWaterfallTab}
              setActiveWaterfallTab={setActiveWaterfallTab}
              waterfallPhaseTaskCounts={waterfallPhaseTaskCounts}
              handleToggleGate={handleToggleGate}
            />

            {/* Middle widgets distribution */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <DashboardDonutChart 
                  title="Priority Distribution" 
                  data={priorityData} 
                  colors={COLORS} 
                  totalTasks={totalTasks} 
              />
              <DashboardDonutChart 
                  title="Status Distribution" 
                  data={statusData} 
                  colors={COLORS.map((_, i) => COLORS[(i + 1) % COLORS.length])} 
                  totalTasks={totalTasks} 
              />
            </div>

            {/* Phase Analyses charts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* sprint-user-tasks */}
              {activeSprint && (
                  <div className={cardStyleClass("sprint-user-tasks")}>
                    <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100 dark:border-slate-800 select-none shrink-0">
                      <div className="flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-indigo-500" />
                        <span className="text-[10px] font-black tracking-widest text-slate-800 dark:text-slate-200 uppercase">
                          Sprint Tasks per User
                        </span>
                      </div>
                    </div>
                    <div className="flex-1 overflow-y-auto pr-1 no-scrollbar space-y-3 max-h-[180px]">
                      {sprintWorkloadData.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-6 text-slate-400 text-xs">
                          <UserCircle className="w-8 h-8 text-slate-300 mb-1" />
                          <p className="italic">Tidak ada data.</p>
                        </div>
                      ) : (
                        sprintWorkloadData.map((user: any, idx: number) => {
                          const total = user.Done + user.Active;
                          return (
                            <div key={idx} className="flex items-center justify-between gap-2 p-2 rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="w-7 h-7 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-extrabold text-[9px] shrink-0 uppercase">
                                  {user.name.slice(0, 2)}
                                </div>
                                <span className="text-[10px] font-bold text-slate-800 truncate">{user.name}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-[9px] font-black text-emerald-600">{user.Done}D</span>
                                <span className="text-[9px] font-black text-amber-600">{user.Active}A</span>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
              )}
              
              {/* team-tasks */}
              <div className={cardStyleClass("team-tasks")}>
                <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100 dark:border-slate-800 select-none shrink-0">
                  <div className="flex items-center gap-1.5">
                    <UserCircle className="w-4 h-4 text-indigo-500" />
                    <span className="text-[10px] font-black tracking-widest text-slate-800 dark:text-slate-200 uppercase">
                      Tasks per User (Team)
                    </span>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto pr-1 no-scrollbar space-y-3 max-h-[180px]">
                   {/* Team tasks logic would go here. I'll use a placeholder structure similar to sprint one for now as I don't have team data */}
                    <div className="text-slate-400 text-xs text-center py-4 italic">Feature in progress...</div>
                </div>
              </div>
            </div>



            {/* Burndown chart & team workload */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* sprint-burndown */}
              <div className={cardStyleClass("sprint-burndown")}>
                <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100 dark:border-slate-800 select-none shrink-0">
                  <div className="flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-violet-500" />
                    <span className="text-[10px] font-black tracking-widest text-slate-800 dark:text-slate-200 uppercase">
                      Sprint Burndown Chart
                    </span>
                  </div>
                </div>
                <div className="flex-1 w-full h-[220px] min-h-[200px]">
                  {burndownData.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-6 text-slate-400 text-xs text-center h-full">
                      <Database className="w-8 h-8 text-slate-300 mb-1 animate-pulse" />
                      <p className="italic">Tidak ada data burndown.</p>
                      <p className="text-[9px] mt-0.5 max-w-[140px] text-slate-400 leading-relaxed">Aktifkan sprint dan pastikan tugas memiliki tanggal pengerjaan.</p>
                    </div>
                  ) : (
                    <motion.div
                      className="w-full h-full"
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, ease: "easeOut", delay: 0.2 }}
                    >
                    {burndownData.length === 0 ? (
                      <div className="flex items-center justify-center h-full text-slate-500 text-xs italic">No burndown data.</div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={burndownData} margin={{ top: 5, right: 10, left: -40, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorIdeal" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                              <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                            </linearGradient>
                            <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="date" tick={{ fontSize: 8, fill: "#64748b", fontWeight: 700 }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fontSize: 8, fill: "#64748b" }} axisLine={false} tickLine={false} />
                          <Tooltip contentStyle={{ borderRadius: "0.75rem", border: "none" }} />
                          <Legend wrapperStyle={{ fontSize: "8px", fontWeight: 700 }} height={15} />
                          <Area type="monotone" dataKey="Ideal" stroke="#6366f1" strokeWidth={1.5} fillOpacity={1} fill="url(#colorIdeal)" />
                          <Area type="monotone" dataKey="Actual" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorActual)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    )}
                    </motion.div>
                  )}
                </div>
              </div>

              {/* team-workload */}
              <div className={cardStyleClass("team-workload")}>
                <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100 dark:border-slate-800 select-none shrink-0">
                  <div className="flex items-center gap-1.5">
                    <Database className="w-4 h-4 text-emerald-500" />
                    <span className="text-[10px] font-black tracking-widest text-slate-800 dark:text-slate-200 uppercase">
                      Workload by Department
                    </span>
                  </div>
                </div>
                <div className="flex-1 w-full h-[220px] min-h-[200px]">
                  {teamWorkloadData.length === 0 ? (
                    <div className="flex items-center justify-center py-10 text-slate-400 italic text-xs">No team workload data.</div>
                  ) : (
                    <motion.div
                      className="w-full h-full"
                      initial={{ opacity: 0, x: -15 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.5, ease: "easeOut", delay: 0.25 }}
                    >
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={teamWorkloadData} layout="vertical" margin={{ top: 5, right: 10, left: -25, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                          <XAxis type="number" tick={{ fontSize: 8, fill: "#64748b" }} axisLine={false} tickLine={false} />
                          <YAxis dataKey="name" type="category" tick={{ fontSize: 8, fill: "#64748b", fontWeight: 700 }} axisLine={false} tickLine={false} width={80} />
                          <Tooltip contentStyle={{ borderRadius: "0.75rem", border: "none" }} />
                          <Legend wrapperStyle={{ fontSize: "8px", fontWeight: 700 }} />
                          <Bar dataKey="Active" stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]} maxBarSize={15} />
                          <Bar dataKey="Done" stackId="a" fill="#10b981" radius={[0, 4, 4, 0]} maxBarSize={15} />
                        </BarChart>
                      </ResponsiveContainer>
                    </motion.div>
                  )}
                </div>
              </div>
            </div>

            {/* estimation-accuracy */}
            <div className={cardStyleClass("estimation-accuracy")}>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-100 dark:border-slate-800 select-none">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 shrink-0" />
                    <span className="text-[10px] font-black tracking-widest text-slate-800 dark:text-slate-200 uppercase">
                      Akurasi Estimasi: Story Points vs Waktu Riil
                    </span>
                  </div>
                  <h3 className="text-sm font-black text-slate-700 dark:text-slate-300 mt-1">
                    Feedback Perencanaan & Akurasi Estimasi Backlog
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-2xl text-[10px] font-black bg-indigo-50 text-indigo-600 border border-indigo-100 leading-none">
                    <Target className="w-3 h-3" />
                    Skor Akurasi: {estimationStats.accuracyRate}%
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Chart Area */}
                <div className="lg:col-span-2 space-y-4">
                  <div className="h-[280px] w-full min-h-[250px]">
                    {estimationAccuracyData.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-slate-400 text-xs text-center">
                        <Database className="w-8 h-8 text-slate-300 mb-1" />
                        <p className="italic">Tidak ada data estimasi.</p>
                        <p className="text-[9px] mt-0.5 text-slate-400">Atur Story Points dan Logged Hours pada tugas untuk membandingkannya.</p>
                      </div>
                    ) : (
                      <motion.div
                        className="w-full h-full"
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, ease: "easeOut", delay: 0.3 }}
                      >
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                              data={estimationAccuracyData}
                              margin={{ top: 10, right: 10, left: -25, bottom: 5 }}
                            >
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                              <XAxis 
                                dataKey="key" 
                                tick={{ fontSize: 9, fill: "#64748b", fontWeight: 700 }}
                                axisLine={false}
                                tickLine={false}
                              />
                              <YAxis 
                                tick={{ fontSize: 9, fill: "#64748b" }}
                                axisLine={false}
                                tickLine={false}
                              />
                              <Tooltip 
                                contentStyle={{ 
                                  borderRadius: "0.75rem", 
                                  border: "none",
                                  boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)"
                                }}
                                formatter={(value, name) => [
                                  `${value} ${name === "estimated" ? "SP" : "Jam"}`,
                                  name === "estimated" ? "Estimasi Story Points" : "Waktu Riil (Jam)"
                                ]}
                                labelFormatter={(label) => {
                                  const task = estimationAccuracyData.find(t => t.key === label);
                                  return task ? `${task.key}: ${task.title}` : label;
                                }}
                              />
                              <Legend 
                                verticalAlign="top" 
                                height={36}
                                iconType="circle"
                                formatter={(value) => (
                                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                    {value === "estimated" ? "Estimasi Story Points (SP)" : "Waktu Kerja Riil (Jam)"}
                                  </span>
                                )}
                              />
                              <Bar 
                                dataKey="estimated" 
                                name="estimated" 
                                fill="#6366f1" 
                                radius={[4, 4, 0, 0]} 
                                maxBarSize={16} 
                              />
                              <Bar 
                                dataKey="actual" 
                                name="actual" 
                                fill="#10b981" 
                                radius={[4, 4, 0, 0]} 
                                maxBarSize={16} 
                              />
                            </BarChart>
                          </ResponsiveContainer>
                        </motion.div>
                      )}
                  </div>
                </div>

                {/* Insight & Recommendation Sidebar */}
                <div className="bg-slate-50/50 rounded-[1.5rem] p-5 border border-slate-100 flex flex-col justify-between">
                  <div className="space-y-4">
                    <span className="text-[9px] font-black tracking-widest text-slate-400 uppercase block">
                      Analisis & Rekomendasi
                    </span>

                    {/* Quick Stats Grid */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">Total Estimasi</span>
                        <span className="text-sm font-black text-slate-700">{estimationStats.totalEstimated} SP</span>
                      </div>
                      <div className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">Total Waktu Kerja</span>
                        <span className="text-sm font-black text-slate-700">{estimationStats.totalActual} Jam</span>
                      </div>
                    </div>

                    {/* Insight Badges */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 p-2 rounded-xl bg-amber-50/70 border border-amber-100">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        <span className="text-[10px] font-medium text-amber-800 leading-tight">
                          <strong className="font-bold">{estimationStats.underEstimatedCount} Tugas</strong> Under-estimated (Waktu Riil &gt; SP)
                        </span>
                      </div>
                      <div className="flex items-center gap-2 p-2 rounded-xl bg-blue-50/70 border border-blue-100">
                        <TrendingUp className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                        <span className="text-[10px] font-medium text-blue-800 leading-tight">
                          <strong className="font-bold">{estimationStats.overEstimatedCount} Tugas</strong> Over-estimated (SP &gt; Waktu Riil)
                        </span>
                      </div>
                      <div className="flex items-center gap-2 p-2 rounded-xl bg-emerald-50/70 border border-emerald-100">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span className="text-[10px] font-medium text-emerald-800 leading-tight">
                          <strong className="font-bold">{estimationStats.perfectCount} Tugas</strong> Terestimasi dengan Sempurna!
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Feedback Action Items */}
                  <div className="mt-4 pt-4 border-t border-slate-100 space-y-2.5">
                    <span className="text-[8px] font-black tracking-widest text-slate-400 uppercase block">Rekomendasi Sprint Depan</span>
                    <ul className="space-y-1.5 text-[9px] font-medium text-slate-500">
                      <li className="flex items-start gap-1.5">
                        <span className="text-indigo-500 font-extrabold select-none">•</span>
                        <span>Pecah tugas bernilai &gt; 5 Story Points menjadi subtask agar estimasi lebih akurat.</span>
                      </li>
                      <li className="flex items-start gap-1.5">
                        <span className="text-indigo-500 font-extrabold select-none">•</span>
                        <span>Disiplinkan pengisian Logged Hours setiap hari untuk visibilitas tim yang real-time.</span>
                      </li>
                      <li className="flex items-start gap-1.5">
                        <span className="text-indigo-500 font-extrabold select-none">•</span>
                        <span>Gunakan baseline tugas serupa sebelumnya sebagai acuan nilai story points baru.</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Actionable Sidebar & Velocity info */}
          <div className="lg:col-span-3 space-y-6">
            {/* Sidebar widgets */}
            <SidebarWidgetsStack
              myActiveTasks={myActiveTasks}
              blockedTasks={blockedTasks}
              overdueTasks={overdueTasks}
              dueSoonTasks={dueSoonTasks}
              meetings={meetings}
              documents={documents}
              activityLogs={activityLogs}
              projectMembers={projectMembers}
              setSelectedTaskForDetail={setSelectedTaskForDetail}
              setIsTaskDetailModalOpen={setIsTaskDetailModalOpen}
              setCurrentView={setCurrentView}
            />

            {/* velocity-bar */}
            <div className={cardStyleClass("velocity-bar")}>
              <div className="flex justify-between items-center select-none shrink-0 mb-2">
                <span className="text-[10px] font-black tracking-widest text-slate-300 uppercase">
                  Velocity (Bar)
                </span>
              </div>
              <div className="flex-1 w-full h-[180px] min-h-[150px]">
                {velocityData.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-slate-500 text-xs italic">No velocity data.</div>
                ) : (
                <motion.div
                  className="w-full h-full"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, ease: "easeOut", delay: 0.35 }}
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={velocityData} margin={{ top: 5, right: 5, left: -35, bottom: 0 }}>
                      <XAxis dataKey="name" tick={{ fontSize: 7, fill: "#94a3b8", fontWeight: 700 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 7, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ background: "#1e293b", borderRadius: "0.5rem", border: "none", fontSize: "9px", color: "#fff" }} />
                      <Bar dataKey="Planned" fill="#475569" radius={[2, 2, 0, 0]} maxBarSize={10} />
                      <Bar dataKey="Completed" fill="#fbbf24" radius={[2, 2, 0, 0]} maxBarSize={10} />
                    </BarChart>
                  </ResponsiveContainer>
                </motion.div>
                )}
              </div>
              <div className="flex justify-between items-center text-[8px] text-slate-500 mt-1 uppercase select-none font-bold">
                <span>Planned vs Done</span>
                <span>Stable</span>
              </div>
            </div>

            {/* velocity-line */}
            <div className={cardStyleClass("velocity-line")}>
              <div className="flex justify-between items-center select-none shrink-0 mb-2">
                <span className="text-[10px] font-black tracking-widest text-slate-300 uppercase">
                  Velocity (Line)
                </span>
              </div>
              <div className="flex-1 w-full h-[180px] min-h-[150px]">
                {velocityData.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-slate-500 text-xs italic">No velocity data.</div>
                ) : (
                <motion.div
                  className="w-full h-full"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, ease: "easeOut", delay: 0.4 }}
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={velocityData} margin={{ top: 5, right: 10, left: -35, bottom: 5 }}>
                      <XAxis dataKey="name" tick={{ fontSize: 7, fill: "#94a3b8", fontWeight: 700 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 7, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ background: "#1e293b", borderRadius: "0.5rem", border: "none", fontSize: "9px", color: "#fff" }} />
                      <Line type="monotone" dataKey="Completed" stroke="#10b981" strokeWidth={3} dot={{ fill: "#10b981", r: 3 }} activeDot={{ r: 5 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </motion.div>
                )}
              </div>
              <div className="flex justify-between items-center text-[8px] text-slate-500 mt-1 uppercase select-none font-bold">
                <span>Velocity Trend</span>
                <span>Active</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DashboardView;
