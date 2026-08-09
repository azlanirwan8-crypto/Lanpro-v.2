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

  return (
    <div className={styles.container}>
      <div className={styles.wrapper}>
        {/* Velzon Dashboard Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 bg-white dark:bg-slate-900 p-5 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
          <div>
            <h2 className="text-xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
              Good Morning, {currentUser?.displayName || "Anna"}!
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Here's what's happening with your store today.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300">
              <Calendar className="w-3.5 h-3.5 text-indigo-500" />
              <span>01 Jan, 2022 to 31 Jan, 2022</span>
            </div>
            <button className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-sm">
              <Plus className="w-3.5 h-3.5" />
              <span>Add Product</span>
            </button>
            <button className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition">
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Velzon Top 4 Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          {/* Card 1: Total Earnings */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between relative overflow-hidden">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Earnings</span>
                <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-1">$559.25k</h3>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between text-xs">
              <span className="flex items-center gap-1 font-bold text-emerald-600">
                <ArrowUpRight className="w-3.5 h-3.5" /> +16.24%
              </span>
              <button onClick={() => setCurrentView('reports')} className="text-slate-400 hover:text-indigo-600 text-[11px] font-bold underline transition">
                View net earnings
              </button>
            </div>
          </div>

          {/* Card 2: Orders */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between relative overflow-hidden">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Orders</span>
                <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-1">36,894</h3>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600">
                <ShoppingBag className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between text-xs">
              <span className="flex items-center gap-1 font-bold text-rose-500">
                <ArrowDownRight className="w-3.5 h-3.5" /> -3.57%
              </span>
              <button onClick={() => setCurrentView('kanban')} className="text-slate-400 hover:text-indigo-600 text-[11px] font-bold underline transition">
                View all orders
              </button>
            </div>
          </div>

          {/* Card 3: Customers */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between relative overflow-hidden">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Customers</span>
                <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-1">183.35M</h3>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center text-amber-600">
                <Users className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between text-xs">
              <span className="flex items-center gap-1 font-bold text-emerald-600">
                <ArrowUpRight className="w-3.5 h-3.5" /> +29.08%
              </span>
              <button onClick={() => setCurrentView('team')} className="text-slate-400 hover:text-indigo-600 text-[11px] font-bold underline transition">
                See details
              </button>
            </div>
          </div>

          {/* Card 4: My Balance */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between relative overflow-hidden">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">My Balance</span>
                <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-1">$165.89k</h3>
              </div>
              <div className="w-10 h-10 rounded-xl bg-cyan-50 dark:bg-cyan-950/50 flex items-center justify-center text-cyan-600">
                <Wallet className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between text-xs">
              <span className="flex items-center gap-1 font-bold text-slate-500">
                +0.00%
              </span>
              <button onClick={() => alert("Withdraw modal opened")} className="text-slate-400 hover:text-indigo-600 text-[11px] font-bold underline transition">
                Withdraw money
              </button>
            </div>
          </div>
        </div>

        {/* Dashboard Panels Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Main Column: Left Area */}
          <div className="lg:col-span-8 space-y-6">
            {/* Revenue Section with Velzon Filter & Chart */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                  <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider">Revenue</h3>
                </div>
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                  {(['ALL', '1M', '6M', '1Y'] as const).map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setRevenueFilter(filter)}
                      className={cn(
                        "px-3 py-1 rounded-lg text-[10px] font-black transition",
                        revenueFilter === filter
                          ? "bg-indigo-600 text-white shadow-sm"
                          : "text-slate-600 dark:text-slate-300 hover:text-slate-900"
                      )}
                    >
                      {filter}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sub-metrics bar */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-800">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Orders</span>
                  <p className="text-base font-black text-slate-800 dark:text-slate-100 mt-0.5">7,585</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Earnings</span>
                  <p className="text-base font-black text-slate-800 dark:text-slate-100 mt-0.5">$22.89k</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Refunds</span>
                  <p className="text-base font-black text-slate-800 dark:text-slate-100 mt-0.5">358</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Conversion Ratio</span>
                  <p className="text-base font-black text-slate-800 dark:text-slate-100 mt-0.5">18.92%</p>
                </div>
              </div>

              {/* Revenue Chart */}
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={[
                    { name: 'Jan', Orders: 65, Earnings: 45, Refunds: 12 },
                    { name: 'Feb', Orders: 59, Earnings: 52, Refunds: 8 },
                    { name: 'Mar', Orders: 80, Earnings: 68, Refunds: 15 },
                    { name: 'Apr', Orders: 81, Earnings: 75, Refunds: 10 },
                    { name: 'May', Orders: 56, Earnings: 48, Refunds: 14 },
                    { name: 'Jun', Orders: 55, Earnings: 60, Refunds: 9 },
                    { name: 'Jul', Orders: 40, Earnings: 38, Refunds: 7 },
                    { name: 'Aug', Orders: 45, Earnings: 42, Refunds: 11 },
                    { name: 'Sep', Orders: 70, Earnings: 85, Refunds: 13 },
                    { name: 'Oct', Orders: 50, Earnings: 48, Refunds: 8 },
                    { name: 'Nov', Orders: 75, Earnings: 72, Refunds: 10 },
                    { name: 'Dec', Orders: 60, Earnings: 55, Refunds: 12 },
                  ]} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ borderRadius: '0.75rem', border: 'none', background: '#1e293b', color: '#fff', fontSize: '11px' }} />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                    <Bar dataKey="Orders" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={16} />
                    <Bar dataKey="Earnings" fill="#06b6d4" radius={[4, 4, 0, 0]} maxBarSize={16} />
                    <Bar dataKey="Refunds" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={16} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Best Selling Products Table */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider">Best Selling Products</h3>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">SORT BY:</span>
                  <select
                    value={productSort}
                    onChange={(e) => setProductSort(e.target.value)}
                    className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1 text-xs font-bold text-slate-700 dark:text-slate-300 outline-none"
                  >
                    <option value="Today">Today</option>
                    <option value="Weekly">Weekly</option>
                    <option value="Monthly">Monthly</option>
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] font-black uppercase tracking-wider text-slate-400">
                      <th className="py-3 px-2">Product</th>
                      <th className="py-3 px-2">Price</th>
                      <th className="py-3 px-2">Orders</th>
                      <th className="py-3 px-2">Stock</th>
                      <th className="py-3 px-2 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="text-xs divide-y divide-slate-100 dark:divide-slate-800 font-medium text-slate-700 dark:text-slate-300">
                    {[
                      { name: "Branded T-Shirts", date: "24 Apr 2021", price: "$29.00", orders: "62 Orders", stock: "510 Stock", amount: "$1,798" },
                      { name: "Bentwood Chair", date: "19 Mar 2021", price: "$85.20", orders: "35 Orders", stock: "Out of stock", amount: "$2,982", badge: true },
                      { name: "Borosil Paper Cup", date: "01 Mar 2021", price: "$14.00", orders: "80 Orders", stock: "749 Stock", amount: "$1,120" },
                      { name: "One Seater Sofa", date: "11 Feb 2021", price: "$127.50", orders: "56 Orders", stock: "Out of stock", amount: "$7,140", badge: true },
                      { name: "Stillbird Helmet", date: "17 Jan 2021", price: "$54", orders: "74 Orders", stock: "805 Stock", amount: "$3,996" },
                    ].map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                        <td className="py-3 px-2">
                          <p className="font-bold text-slate-800 dark:text-slate-100">{item.name}</p>
                          <span className="text-[10px] text-slate-400">{item.date}</span>
                        </td>
                        <td className="py-3 px-2 font-bold">{item.price}</td>
                        <td className="py-3 px-2">{item.orders}</td>
                        <td className="py-3 px-2">
                          {item.badge ? (
                            <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-600 text-[10px] font-bold">Out of stock</span>
                          ) : (
                            item.stock
                          )}
                        </td>
                        <td className="py-3 px-2 text-right font-black text-slate-800 dark:text-slate-100">{item.amount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right Column: Sales by Locations & Top Sellers */}
          <div className="lg:col-span-4 space-y-6">
            {/* Sales by Locations */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider">Sales by Locations</h3>
                <button className="text-xs font-bold text-indigo-600 hover:underline">Export Report</button>
              </div>

              {/* Map Illustration / Visual Placeholder */}
              <div className="h-40 bg-slate-100 dark:bg-slate-800 rounded-xl mb-4 flex items-center justify-center relative overflow-hidden">
                <Globe className="w-16 h-16 text-slate-300 dark:text-slate-700 animate-pulse" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/10 to-transparent pointer-events-none" />
              </div>

              {/* Location progress bars */}
              <div className="space-y-3">
                {[
                  { country: "Canada", val: 75 },
                  { country: "Greenland", val: 47 },
                  { country: "Russia", val: 82 },
                  { country: "Palestine", val: 64 },
                ].map((loc, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-slate-700 dark:text-slate-300">{loc.country}</span>
                      <span className="text-slate-500">{loc.val}%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${loc.val}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Sellers Table */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider">Top Sellers</h3>
                <button className="text-xs font-bold text-indigo-600 hover:underline">Report</button>
              </div>

              <div className="space-y-3">
                {[
                  { name: "iTest Factory", category: "Bags and Wallets", stock: "8,547", amount: "$54,200", pct: 32 },
                  { name: "Digitech Galaxy", category: "Watches", stock: "895", amount: "$75,030", pct: 79 },
                  { name: "Nesta Technologies", category: "Bike Accessories", stock: "3,470", amount: "$45,600", pct: 90 },
                  { name: "Zoetic Fashion", category: "Clothes", stock: "5,438", amount: "$29,456", pct: 40 },
                  { name: "Meta4Systems", category: "Furniture", stock: "4,100", amount: "$11,260", pct: 57 },
                ].map((seller, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center text-indigo-600 font-black text-xs">
                        {seller.name.slice(0, 2)}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-100">{seller.name}</p>
                        <span className="text-[10px] text-slate-400">{seller.category}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-black text-slate-800 dark:text-slate-100">{seller.amount}</p>
                      <span className="text-[10px] font-bold text-emerald-600">{seller.pct}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Sidebar Widgets Stack for remaining tools */}
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
          </div>
        </div>
      </div>
    </div>
  );
}
export default DashboardView;