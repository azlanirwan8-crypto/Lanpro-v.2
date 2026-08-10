import React from "react";
import { CheckCircle2, Activity, AlertCircle, Zap, Users } from "lucide-react";

interface KpiMetricsRowProps {
  completionPercentage: number;
  inProgressTasks: any[];
  overdueTasks: any[];
  weeklyVelocity: number;
  projectMembers: any[];
}

export const KpiMetricsRow: React.FC<KpiMetricsRowProps> = ({
  completionPercentage,
  inProgressTasks,
  overdueTasks,
  weeklyVelocity,
  projectMembers,
}) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 w-full h-full select-none">
      {/* Card 1: Total Completion */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200/60 dark:border-slate-800 hover:shadow-md transition-all relative overflow-hidden flex flex-col h-full shadow-sm group">
        <div className="w-10 h-10 rounded-xl bg-violet-50 dark:bg-violet-950/40 text-violet-500 flex items-center justify-center mb-4 transition-transform group-hover:scale-105">
          <CheckCircle2 className="w-5 h-5" />
        </div>
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1">TOTAL COMPLETION</span>
        <div className="flex items-baseline gap-1.5 mt-auto">
          <span className="text-3xl font-black text-slate-800 dark:text-slate-100">{completionPercentage}%</span>
          <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">Stable</span>
        </div>
      </div>

      {/* Card 2: In Progress */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200/60 dark:border-slate-800 hover:shadow-md transition-all relative overflow-hidden flex flex-col h-full shadow-sm group">
        <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-950/40 text-sky-500 flex items-center justify-center mb-4 transition-transform group-hover:scale-105">
          <Activity className="w-5 h-5 animate-pulse" />
        </div>
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1">IN PROGRESS</span>
        <div className="flex items-baseline gap-1.5 mt-auto">
          <span className="text-3xl font-black text-slate-800 dark:text-slate-100">{inProgressTasks.length}</span>
          <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">Issues</span>
        </div>
      </div>

      {/* Card 3: Overdue Alerts */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200/60 dark:border-slate-800 hover:shadow-md transition-all relative overflow-hidden flex flex-col h-full shadow-sm group">
        <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-500 flex items-center justify-center mb-4 transition-transform group-hover:scale-105">
          <AlertCircle className="w-5 h-5" />
        </div>
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1">OVERDUE ALERTS</span>
        <div className="flex items-baseline gap-1.5 mt-auto">
          <span className="text-3xl font-black text-rose-600 dark:text-rose-400">{overdueTasks.length}</span>
          <span className="text-xs font-semibold text-rose-400 dark:text-rose-500">Stoppers</span>
        </div>
      </div>

      {/* Card 4: Weekly Velocity */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200/60 dark:border-slate-800 hover:shadow-md transition-all relative overflow-hidden flex flex-col h-full shadow-sm group">
        <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-500 flex items-center justify-center mb-4 transition-transform group-hover:scale-105">
          <Zap className="w-5 h-5 text-amber-500" />
        </div>
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1">WEEKLY VELOCITY</span>
        <div className="flex items-baseline gap-1.5 mt-auto">
          <span className="text-3xl font-black text-slate-800 dark:text-slate-100">
            {weeklyVelocity ? weeklyVelocity : "0.0"}
          </span>
          <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">pts/spr</span>
        </div>
      </div>

      {/* Card 5: Team Size */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200/60 dark:border-slate-800 hover:shadow-md transition-all relative overflow-hidden flex flex-col h-full shadow-sm group">
        <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center mb-4 transition-transform group-hover:scale-105">
          <Users className="w-5 h-5" />
        </div>
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1">MEMBERS REGISTERED</span>
        <div className="flex items-baseline gap-1.5 mt-auto">
          <span className="text-3xl font-black text-slate-800 dark:text-slate-100">{projectMembers.length}</span>
          <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">Users</span>
        </div>
      </div>
    </div>
  );
};
