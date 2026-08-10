import React from "react";
import { format, formatDistanceToNow } from "date-fns";
import {
  Zap,
  AlertCircle,
  Clock,
  FileText,
  ArrowRight,
  Video,
  Globe,
} from "lucide-react";
import { ensureDate } from "../../../lib/utils";
import { cn } from "../../../lib/utils";

const isDueSoon24h = (endDate?: string | Date | null) => {
  if (!endDate) return false;
  try {
    const d = ensureDate(endDate);
    const now = new Date();
    const diffMs = d.getTime() - now.getTime();
    return diffMs > 0 && diffMs <= 24 * 60 * 60 * 1000;
  } catch (e) {
    return false;
  }
};

const getRemainingHours = (endDate?: string | Date | null) => {
  if (!endDate) return "";
  try {
    const d = ensureDate(endDate);
    const now = new Date();
    const diffMs = d.getTime() - now.getTime();
    const hours = Math.ceil(diffMs / (60 * 60 * 1000));
    return hours > 0 ? `${hours}h left` : "due soon";
  } catch (e) {
    return "due soon";
  }
};

interface SidebarWidgetsStackProps {
  myActiveTasks: any[];
  blockedTasks: any[];
  overdueTasks: any[];
  dueSoonTasks: any[];
  meetings: any[];
  documents: any[];
  activityLogs: any[];
  projectMembers: any[];
  setSelectedTaskForDetail: (task: any) => void;
  setIsTaskDetailModalOpen: (open: boolean) => void;
  setCurrentView: (view: string) => void;
}

export const SidebarWidgetsStack: React.FC<SidebarWidgetsStackProps> = ({
  myActiveTasks,
  blockedTasks,
  overdueTasks,
  dueSoonTasks,
  meetings,
  documents,
  activityLogs,
  projectMembers,
  setSelectedTaskForDetail,
  setIsTaskDetailModalOpen,
  setCurrentView,
}) => {
  return (
    <div className="flex-1 overflow-y-auto no-scrollbar space-y-6 h-auto p-1 select-none">
      {/* My Active Tasks */}
      <div className="bg-white shadow-sm border border-slate-200/80 rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-indigo-700 flex items-center gap-2">
            <Zap className="w-4 h-4 text-indigo-500" /> My Active Tasks ({myActiveTasks.length})
          </h3>
          {myActiveTasks.some(task => isDueSoon24h(task.endDate)) && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider bg-amber-500 text-white animate-pulse shrink-0">
              ⏰ Urgen (24j)
            </span>
          )}
        </div>
        <div className="space-y-2.5 max-h-[290px] overflow-y-auto custom-scrollbar pr-1">
          {myActiveTasks.length === 0 ? (
            <div className="text-xs text-slate-400 font-medium italic text-center p-3">
              No active tasks assigned to you.
            </div>
          ) : (
            myActiveTasks.map((task) => (
              <div
                key={task.id}
                className={cn(
                  "group p-3 rounded-xl border transition-all cursor-pointer",
                  isDueSoon24h(task.endDate)
                    ? "border-amber-400 bg-amber-50/20 shadow-[0_0_12px_rgba(245,158,11,0.15)] hover:border-amber-500 hover:bg-amber-50/30"
                    : "border-indigo-100/50 hover:border-indigo-300 hover:shadow-2xs bg-white"
                )}
                onClick={() => {
                  setSelectedTaskForDetail(task);
                  setIsTaskDetailModalOpen(true);
                }}
              >
                <div className="flex justify-between items-center mb-1">
                  <div className="flex items-center gap-1.5">
                    <div className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                      {task.key}
                    </div>
                    {isDueSoon24h(task.endDate) && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider bg-amber-500 text-white animate-pulse">
                        ⏰ {getRemainingHours(task.endDate)}
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                    {task.priority}
                  </div>
                </div>
                <div className="text-xs font-bold text-slate-800 leading-snug line-clamp-2">
                  {task.title}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Blocked / Stoppers */}
      <div 
        className="shadow-sm border rounded-xl p-5"
        style={{
          borderColor: "rgba(239, 68, 68, 0.4)",
          backgroundColor: "rgba(254, 242, 242, 0.5)",
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-rose-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-500 animate-bounce" /> Stoppers / Blocked ({blockedTasks.length})
          </h3>
          {blockedTasks.some(task => isDueSoon24h(task.endDate)) && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider bg-amber-500 text-white animate-pulse shrink-0">
              ⏰ Urgen (24j)
            </span>
          )}
        </div>
        <div className="space-y-2.5 max-h-[290px] overflow-y-auto custom-scrollbar pr-1">
          {blockedTasks.length === 0 ? (
            <div className="text-xs text-slate-400 font-medium italic p-2">No blocked tasks.</div>
          ) : (
            blockedTasks.map((task) => (
              <div
                key={task.id}
                className={cn(
                  "group p-3 rounded-xl border transition-all cursor-pointer bg-white",
                  isDueSoon24h(task.endDate)
                    ? "border-amber-400 bg-amber-50/20 shadow-[0_0_12px_rgba(245,158,11,0.15)] hover:border-amber-500 hover:bg-amber-50/30"
                    : "border-rose-100 hover:border-rose-300 hover:shadow-2xs"
                )}
                onClick={() => {
                  setSelectedTaskForDetail(task);
                  setIsTaskDetailModalOpen(true);
                }}
              >
                <div className="flex justify-between items-center mb-1">
                  <div className="flex items-center gap-1.5">
                    <div className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">{task.key}</div>
                    {isDueSoon24h(task.endDate) && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider bg-amber-500 text-white animate-pulse">
                        ⏰ {getRemainingHours(task.endDate)}
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] font-semibold text-rose-500 uppercase tracking-wider">Blocked</div>
                </div>
                <div className="text-xs font-bold text-slate-800 leading-snug line-clamp-2">
                  {task.title}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Needs Attention / Overdue */}
      <div className="bg-white shadow-sm border border-rose-100/80 rounded-xl p-5">
        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-800 flex items-center gap-2 mb-3">
          <AlertCircle className="w-4 h-4 text-rose-500 animate-pulse" /> Needs Attention ({overdueTasks.length})
        </h3>
        <div className="space-y-2.5 max-h-[290px] overflow-y-auto custom-scrollbar pr-1">
          {overdueTasks.length === 0 ? (
            <div className="text-xs text-slate-400 font-medium italic p-2">All clear! No overdue tasks.</div>
          ) : (
            overdueTasks.map((task) => (
              <div
                key={task.id}
                className="group p-3 rounded-xl border border-slate-100 hover:border-rose-200 hover:shadow-2xs transition-all cursor-pointer bg-white"
                onClick={() => {
                  setSelectedTaskForDetail(task);
                  setIsTaskDetailModalOpen(true);
                }}
              >
                <div className="flex justify-between items-start mb-1">
                  <div className="text-[10px] font-bold text-indigo-600">{task.key}</div>
                  <div className="text-[10px] font-semibold text-rose-500 uppercase tracking-wider">Overdue</div>
                </div>
                <div className="text-xs font-bold text-slate-800 leading-snug line-clamp-2">
                  {task.title}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Due Soon */}
      <div className="bg-white shadow-sm border border-slate-100/80 rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-800 flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-500" /> Due Soon (3 Days) ({dueSoonTasks.length})
          </h3>
          {dueSoonTasks.some(task => isDueSoon24h(task.endDate)) && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider bg-amber-500 text-white animate-pulse shrink-0">
              ⏰ Urgen (24j)
            </span>
          )}
        </div>
        <div className="space-y-2.5 max-h-[290px] overflow-y-auto custom-scrollbar pr-1">
          {dueSoonTasks.length === 0 ? (
            <div className="text-xs text-slate-400 font-medium italic p-2">No urgent deadlines in next 3 days.</div>
          ) : (
            dueSoonTasks.map((task) => (
              <div
                key={task.id}
                className={cn(
                  "group p-3 rounded-xl border transition-all cursor-pointer",
                  isDueSoon24h(task.endDate)
                    ? "border-amber-400 bg-amber-50/20 shadow-[0_0_12px_rgba(245,158,11,0.15)] hover:border-amber-500 hover:bg-amber-50/30"
                    : "border-slate-100 hover:border-indigo-200 hover:shadow-2xs bg-white"
                )}
                onClick={() => {
                  setSelectedTaskForDetail(task);
                  setIsTaskDetailModalOpen(true);
                }}
              >
                <div className="flex justify-between items-center mb-1">
                  <div className="flex items-center gap-1.5">
                    <div className="text-[10px] font-bold text-indigo-600">{task.key}</div>
                    {isDueSoon24h(task.endDate) && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider bg-amber-500 text-white animate-pulse">
                        ⏰ {getRemainingHours(task.endDate)}
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] font-semibold text-slate-400">
                    {formatDistanceToNow(ensureDate(task.endDate!), {
                      addSuffix: true,
                    })}
                  </div>
                </div>
                <div className="text-xs font-bold text-slate-800 leading-snug line-clamp-2">
                  {task.title}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Recent Meeting Notes */}
      <div className="bg-white shadow-sm border border-slate-100/80 rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-800 flex items-center gap-2">
            <Video className="w-4 h-4 text-sky-500" /> Recent Meetings ({meetings.length})
          </h3>
        </div>
        <div className="space-y-2.5 max-h-[280px] overflow-y-auto custom-scrollbar pr-1">
          {meetings.length === 0 ? (
            <div className="text-xs text-slate-400 font-medium italic p-2">No meeting notes yet.</div>
          ) : (
            meetings.map((meeting: any) => (
              <div
                key={meeting.id}
                className="group p-3 rounded-xl border border-slate-200/70 hover:border-sky-300 transition-all cursor-pointer bg-white shadow-2xs"
                onClick={() => setCurrentView("meetings")}
              >
                <div className="text-xs font-bold text-slate-800 line-clamp-1 mb-1 leading-normal">
                  {meeting.title}
                </div>
                <div className="flex justify-between items-center text-[10px] text-slate-400">
                  <span className="font-semibold uppercase text-slate-500">
                    {format(ensureDate(meeting.createdAt), "MMM dd, yyyy")}
                  </span>
                  <span className="text-sky-500 flex items-center gap-1 font-semibold">
                    Open <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Recent Documentation */}
      <div className="bg-white shadow-sm border border-slate-100/80 rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-800 flex items-center gap-2">
            <FileText className="w-4 h-4 text-teal-500" /> Documentation ({documents.length})
          </h3>
        </div>
        <div className="space-y-2.5 max-h-[280px] overflow-y-auto custom-scrollbar pr-1">
          {documents.length === 0 ? (
            <div className="text-xs text-slate-400 font-medium italic p-2">No documents uploaded.</div>
          ) : (
            documents.map((doc: any) => (
              <div
                key={doc.id}
                className="group p-3 rounded-xl border border-slate-100 hover:border-teal-200 hover:shadow-2xs transition-all cursor-pointer bg-white"
                onClick={() => setCurrentView("wiki")}
              >
                <div className="text-xs font-bold text-slate-800 leading-snug line-clamp-1 mb-1">
                  {doc.title}
                </div>
                <div className="text-[10px] font-semibold text-slate-400 flex justify-between">
                  <span className="uppercase tracking-wider text-teal-600 bg-teal-50 px-1 py-0.5 rounded font-mono">
                    {doc.type || "DOC"}
                  </span>
                  <span className="text-teal-500 flex items-center gap-1 font-semibold">
                    View <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Live Activity (24h) */}
      <div className="bg-slate-800 rounded-xl p-5 shadow-lg text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 -translate-y-4 translate-x-4 opacity-10 pointer-events-none">
          <Globe className="w-32 h-32" />
        </div>
        <h3 className="text-[10px] font-black uppercase tracking-widest text-indigo-300 flex items-center gap-2 mb-3 relative z-10">
          <Clock className="w-4 h-4 text-indigo-400" /> Live Activity (24h)
        </h3>
        <div className="space-y-3 max-h-[260px] overflow-y-auto custom-scrollbar pr-1 relative z-10">
          {activityLogs.map((log) => {
            const author =
              projectMembers.find((m) => m?.uid === log.userId)?.displayName || "System";
            return (
              <div key={log.id} className="flex gap-2.5">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 shrink-0" />
                <div>
                  <div className="text-[11px] text-slate-350 font-medium leading-tight">
                    <span className="text-white font-bold">{author}</span> {log.action}
                  </div>
                  <div className="text-[9px] text-slate-400 mt-0.5">
                    {formatDistanceToNow(ensureDate(log.createdAt), {
                      addSuffix: true,
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <button
          onClick={() => setCurrentView("activity")}
          className="w-full mt-4 py-2 text-xs font-bold uppercase tracking-wider text-white bg-white/10 hover:bg-white/20 rounded-lg transition-colors border border-white/10 cursor-pointer"
        >
          View Full Audit Log
        </button>
      </div>
    </div>
  );
};
