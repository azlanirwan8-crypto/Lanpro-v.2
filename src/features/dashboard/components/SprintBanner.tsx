import React from "react";
import { Zap, Calendar, Target } from "lucide-react";
import { format } from "date-fns";
import { ensureDate } from "../../../lib/utils";

interface SprintBannerProps {
  activeSprint: any;
  sprintCompletedTasks: number;
  sprintTotalTasks: number;
  sprintProgress: number;
}

export const SprintBanner: React.FC<SprintBannerProps> = ({
  activeSprint,
  sprintCompletedTasks,
  sprintTotalTasks,
  sprintProgress,
}) => {
  return (
    <div className="w-full h-auto bg-gradient-to-r from-indigo-600 via-indigo-600 to-purple-700 rounded-xl p-6 md:p-8 text-white relative overflow-hidden shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-6 select-none">
      {/* Background subtle geometric patterns */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent opacity-40 animate-pulse pointer-events-none"></div>

      <div className="space-y-4 relative z-10 flex-1">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-300 animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-widest text-indigo-100 bg-white/10 px-2.5 py-1 rounded-full border border-white/10">
            CURRENT SPRINT: {activeSprint ? activeSprint.name.toUpperCase() : "NONE"}
          </span>
        </div>

        <h3 className="text-xl md:text-2xl font-black tracking-tight max-w-2xl text-white leading-normal">
          "{activeSprint ? (activeSprint.goal || "Selesaikan target sprint tepat waktu.") : "Selesaikan target sprint tepat waktu."}"
        </h3>

        <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-indigo-100 pt-1">
          <div className="flex items-center gap-1.5 font-bold">
            <Calendar className="w-4 h-4 text-indigo-200" />
            <span>
              {activeSprint?.startDate && activeSprint?.endDate
                ? `${format(ensureDate(activeSprint.startDate), "MMM d")} - ${format(ensureDate(activeSprint.endDate), "MMM d")}`
                : "No dates set"}
            </span>
          </div>

          <div className="w-1.5 h-1.5 rounded-full bg-indigo-300" />

          <div className="flex items-center gap-1.5 font-bold">
            <Target className="w-4 h-4 text-indigo-200" />
            <span>
              {sprintCompletedTasks}/{sprintTotalTasks} Tasks
            </span>
          </div>
        </div>
      </div>

      {/* Progress Radial Gauge */}
      <div className="relative z-10 shrink-0 self-center md:self-auto flex items-center justify-center p-1 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 shadow-lg w-28 h-28">
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-black text-white">{sprintProgress}%</span>
          <span className="text-[7px] font-extrabold tracking-widest text-indigo-200 uppercase leading-none mt-0.5">
            SPRINT PROGRESS
          </span>
        </div>

        <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
          <path
            className="text-white/20"
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            fill="none"
            stroke="currentColor"
            strokeWidth="3.5"
          />
          <path
            className="text-white"
            strokeDasharray={`${sprintProgress}, 100`}
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            fill="none"
            stroke="currentColor"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
        </svg>
      </div>
    </div>
  );
};
