import React from "react";
import { Zap, LayoutGrid, UserCircle } from "lucide-react";
import { ResponsiveContainer, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Bar, Cell } from "recharts";

interface SprintPhaseAnalysisProps {
  activeSprint: any;
  sprintTotalTasks: number;
  tasks: any[];
  projectMembers: any[];
  statusData: any[];
  COLORS: string[];
}

export const SprintPhaseAnalysis: React.FC<SprintPhaseAnalysisProps> = ({
  activeSprint,
  sprintTotalTasks,
  tasks,
  projectMembers,
  statusData,
  COLORS,
}) => {
  return (
    <div className="w-full h-full bg-white p-6 rounded-[2.5rem] border border-slate-200/80 shadow-sm flex flex-col justify-between overflow-y-auto no-scrollbar select-none">
      <div className="space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h3 className="font-black text-slate-800 text-sm tracking-tight flex items-center gap-2 uppercase">
              <Zap className="w-4 h-4 text-indigo-500 animate-pulse" />
              SPRINT PHASE ANALYSIS: {activeSprint ? activeSprint.name : ""}
            </h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">
              Deep drill-down by status, workstream, and team
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md uppercase tracking-tighter">
              {sprintTotalTasks} Total Tasks
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Left: Status Category */}
          <div>
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2 px-1">
              <LayoutGrid className="w-3 h-3" /> STATUS BY CATEGORY
            </h4>
            <div className="space-y-4">
              {sprintTotalTasks === 0 ? (
                <div className="text-xs text-slate-400 italic">No categories in active sprint.</div>
              ) : (
                Array.from(
                  new Set(
                    tasks
                      .filter((t) => t.sprintId === activeSprint?.id)
                      .map((t) => t.category || "Uncategorized")
                  )
                ).map((catName, idx) => {
                  const catTasks = tasks.filter(
                    (t) => t.sprintId === activeSprint?.id && (t.category || "Uncategorized") === catName
                  );
                  const done = catTasks.filter(
                    (t) => t.status === "Done" || t.status === "Selesai"
                  ).length;
                  const total = catTasks.length;
                  const progress = total === 0 ? 0 : Math.round((done / total) * 100);
                  const color = COLORS[idx % COLORS.length];
                  return (
                    <div key={idx} className="group/cat px-1">
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="text-[10px] font-black text-slate-700 tracking-tight flex items-center gap-2 uppercase">
                          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
                          {catName}
                        </span>
                        <span className="text-[10px] font-black text-slate-400">
                          {done}/{total} Tasks
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-1.5 bg-slate-50 rounded-full overflow-hidden">
                          <div
                            className="h-full transition-all duration-1000"
                            style={{ width: `${progress}%`, backgroundColor: color }}
                          />
                        </div>
                        <span className="text-[10px] font-bold text-slate-500 min-w-[30px]">{progress}%</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right: Team Execution */}
          <div>
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2 px-1">
              <UserCircle className="w-3 h-3" /> EXECUTION BY MEMBER
            </h4>
            <div className="space-y-4">
              {projectMembers.filter((m) =>
                m && tasks.some((t) => t.sprintId === activeSprint?.id && t.assigneeId === m.uid)
              ).length === 0 ? (
                <div className="text-xs text-slate-400 italic">
                  No member contributions in current active sprint.
                </div>
              ) : (
                projectMembers.map((member) => {
                  if (!member) return null;
                  const userTasks = tasks.filter(
                    (t) => t.sprintId === activeSprint?.id && t.assigneeId === member.uid
                  );
                  if (userTasks.length === 0) return null;
                  const done = userTasks.filter(
                    (t) => t.status === "Done" || t.status === "Selesai"
                  ).length;
                  const total = userTasks.length;
                  const progress = total === 0 ? 0 : Math.round((done / total) * 100);
                  return (
                    <div key={member.uid} className="group/user px-1">
                      <div className="flex justify-between items-center mb-1.5">
                        <div className="flex items-center gap-2 truncate">
                          <div className="w-5 h-5 rounded-full bg-indigo-50 border border-indigo-100 overflow-hidden flex items-center justify-center shrink-0">
                            {member?.photoURL ? (
                              <img src={member.photoURL} alt="" />
                            ) : (
                              <span className="text-[8px] font-black">
                                {member?.displayName ? member.displayName[0] : (member?.username ? member.username[0] : "?")}
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] font-black text-slate-700 truncate uppercase tracking-tight">
                            {member?.displayName || member?.username || "Unknown"}
                          </span>
                        </div>
                        <span className="text-[10px] font-black text-slate-400 shrink-0">
                          {done}/{total}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-1.5 bg-slate-50 rounded-full overflow-hidden">
                          <div
                            className="h-full transition-all duration-1000 bg-indigo-500"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-bold text-slate-500 min-w-[30px]">{progress}%</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="pt-6 border-t border-slate-100">
        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 min-h-0 px-1">
          Phase Velocity Distribution
        </h4>
        <div className="h-44 min-h-[150px]">
          {statusData.length === 0 ? (
            <div className="flex items-center justify-center h-full text-slate-400 italic text-xs">No status data found.</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 10, fontWeight: 700 }} />
                <YAxis hide />
                <Tooltip contentStyle={{ borderRadius: "0.75rem", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }} />
                <Bar dataKey="value" fill="#4f46e5" radius={[4, 4, 0, 0]}>
                  {statusData.map((_entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
};
