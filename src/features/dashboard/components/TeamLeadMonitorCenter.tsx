import React, { useState } from "react";
import { format } from "date-fns";
import { 
  ShieldCheck, 
  Users, 
  AlertTriangle, 
  TrendingUp, 
  CheckCircle2, 
  Clock, 
  Activity, 
  Zap, 
  ArrowRight, 
  UserCheck, 
  Flame,
  Filter,
  Search,
  ExternalLink,
  ChevronRight,
  Radio,
  FileSpreadsheet
} from "lucide-react";
import { motion } from "motion/react";
import { ensureDate } from "../../../lib/utils";
import { cn } from "../../../lib/utils";

interface TeamLeadMonitorCenterProps {
  tasks: any[];
  projectMembers: any[];
  activeSprint: any;
  overdueTasks: any[];
  blockedTasks: any[];
  workloadData: any[];
  teamWorkloadData: any[];
  sprintWorkloadData: any[];
  activityLogs: any[];
  setSelectedTaskForDetail: (task: any) => void;
  setIsTaskDetailModalOpen: (isOpen: boolean) => void;
  setCurrentView: (view: string) => void;
}

export const TeamLeadMonitorCenter: React.FC<TeamLeadMonitorCenterProps> = ({
  tasks,
  projectMembers,
  activeSprint,
  overdueTasks,
  blockedTasks,
  workloadData,
  teamWorkloadData,
  sprintWorkloadData,
  activityLogs,
  setSelectedTaskForDetail,
  setIsTaskDetailModalOpen,
  setCurrentView,
}) => {
  const [selectedTab, setSelectedTab] = useState<'workload' | 'blockers' | 'sprint' | 'activity'>('workload');
  const [searchMember, setSearchMember] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("all");

  // Departments list
  const departments = Array.from(new Set(projectMembers.map(m => m?.department || 'General')));

  const filteredMembers = projectMembers.filter(m => {
    if (!m) return false;
    const matchesSearch = (m.displayName || m.email || '').toLowerCase().includes(searchMember.toLowerCase());
    const matchesDept = selectedDepartment === 'all' || (m.department || 'General') === selectedDepartment;
    return matchesSearch && matchesDept;
  });

  return (
    <div className="bg-slate-900 text-white rounded-[2.5rem] border border-slate-800 p-6 md:p-8 shadow-2xl space-y-6 relative overflow-hidden">
      {/* Decorative gradient blur */}
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6 relative z-10">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-widest">
              <Radio className="w-3 h-3 animate-pulse" /> Live Team Lead Control
            </span>
            <span className="text-slate-400 text-xs font-semibold">• Pantauan Real-Time Tim & Kinerja</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-black tracking-tight text-white flex items-center gap-3">
            Dashboard Pemantauan Tim Lead
          </h2>
          <p className="text-xs text-slate-400 font-medium mt-1 max-w-2xl leading-relaxed">
            Pusat kendali operasional untuk memantau beban kerja anggota, mendeteksi hambatan (blocker) secara dini, mengawasi progress sprint aktif, dan mengevaluasi kedisiplinan tim secara real-time.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => setCurrentView('team')}
            className="px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all border border-slate-700 flex items-center gap-2 shadow-sm"
          >
            <Users className="w-4 h-4 text-indigo-400" />
            Kelola Anggota Tim
          </button>
          <button
            onClick={() => setCurrentView('planning')}
            className="px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all flex items-center gap-2 shadow-lg shadow-indigo-600/25"
          >
            <Zap className="w-4 h-4" />
            Manajemen Sprint & Backlog
          </button>
        </div>
      </div>

      {/* Quick Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 relative z-10">
        <div className="bg-slate-800/60 backdrop-blur-md p-5 rounded-2xl border border-slate-700/60 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Anggota Aktif</span>
            <div className="text-2xl font-black text-white mt-1">{projectMembers.length} Personil</div>
            <span className="text-[10px] text-emerald-400 font-bold mt-1 inline-block">● {projectMembers.filter(m => m?.status === 'online' || true).length} Siap Tugas</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-slate-800/60 backdrop-blur-md p-5 rounded-2xl border border-slate-700/60 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Tugas Terhambat (Blockers)</span>
            <div className="text-2xl font-black text-rose-400 mt-1">{blockedTasks.length} Kendala</div>
            <span className="text-[10px] text-rose-400/80 font-bold mt-1 inline-block">⚠️ Perlu Intervensi Lead</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/30 text-rose-400 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-slate-800/60 backdrop-blur-md p-5 rounded-2xl border border-slate-700/60 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Tugas Terlambat (Overdue)</span>
            <div className="text-2xl font-black text-amber-400 mt-1">{overdueTasks.length} Tugas</div>
            <span className="text-[10px] text-amber-400/80 font-bold mt-1 inline-block">⏰ Melewati Deadline</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-slate-800/60 backdrop-blur-md p-5 rounded-2xl border border-slate-700/60 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Sprint Aktif</span>
            <div className="text-2xl font-black text-emerald-400 mt-1 truncate max-w-[140px]">
              {activeSprint ? activeSprint.name : 'Tidak Ada Sprint'}
            </div>
            <span className="text-[10px] text-slate-400 font-bold mt-1 inline-block">
              {activeSprint ? `${activeSprint.progress || 0}% Selesai` : 'Mulai sprint baru'}
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
            <Zap className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Navigation Tabs for Monitor */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-4 relative z-10">
        <button
          onClick={() => setSelectedTab('workload')}
          className={cn(
            "px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2",
            selectedTab === 'workload'
              ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
              : "bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700"
          )}
        >
          <Users className="w-4 h-4" />
          Beban Kerja & Kapasitas Tim ({projectMembers.length})
        </button>

        <button
          onClick={() => setSelectedTab('blockers')}
          className={cn(
            "px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 relative",
            selectedTab === 'blockers'
              ? "bg-rose-600 text-white shadow-lg shadow-rose-600/30"
              : "bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700"
          )}
        >
          <AlertTriangle className="w-4 h-4" />
          Blocker & Resiko Kritis
          {blockedTasks.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-white text-rose-600 text-[10px] font-black ml-1">
              {blockedTasks.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setSelectedTab('sprint')}
          className={cn(
            "px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2",
            selectedTab === 'sprint'
              ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/30"
              : "bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700"
          )}
        >
          <Zap className="w-4 h-4" />
          Status Sprint & Tim Departemen
        </button>

        <button
          onClick={() => setSelectedTab('activity')}
          className={cn(
            "px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2",
            selectedTab === 'activity'
              ? "bg-violet-600 text-white shadow-lg shadow-violet-600/30"
              : "bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700"
          )}
        >
          <Activity className="w-4 h-4" />
          Log Aktivitas & Audit Real-Time
        </button>
      </div>

      {/* Tab 1: Workload & Capacity */}
      {selectedTab === 'workload' && (
        <div className="space-y-4 relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-800/40 p-4 rounded-2xl border border-slate-800">
            <div className="flex items-center gap-2 w-full sm:w-72 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3" />
              <input
                type="text"
                placeholder="Cari anggota tim..."
                value={searchMember}
                onChange={e => setSearchMember(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Departemen:</span>
              <button
                onClick={() => setSelectedDepartment('all')}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                  selectedDepartment === 'all' ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-400 hover:text-white"
                )}
              >
                Semua
              </button>
              {departments.map(dept => (
                <button
                  key={dept}
                  onClick={() => setSelectedDepartment(dept)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap",
                    selectedDepartment === dept ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-400 hover:text-white"
                  )}
                >
                  {dept}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredMembers.map((member, idx) => {
              const memberTasks = tasks.filter(t => t.assigneeId === member.uid || t.assigneeEmail === member.email);
              const doneCount = memberTasks.filter(t => t.status === 'Done' || t.status === 'Selesai').length;
              const activeCount = memberTasks.filter(t => t.status !== 'Done' && t.status !== 'Selesai' && t.status !== 'Backlog').length;
              const totalAssigned = memberTasks.length;
              const workloadPercentage = totalAssigned > 0 ? Math.round((doneCount / totalAssigned) * 100) : 0;
              const isOverloaded = activeCount >= 6;

              return (
                <div key={member.uid || idx} className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5 hover:border-indigo-500/50 transition-all flex flex-col justify-between shadow-sm">
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white font-bold flex items-center justify-center text-sm shadow-md">
                          {(member.displayName || member.email || 'U').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h4 className="font-bold text-white text-sm tracking-tight">{member.displayName || member.email}</h4>
                          <span className="text-[10px] text-indigo-400 font-semibold">{member.department || 'Anggota Tim'}</span>
                        </div>
                      </div>
                      {isOverloaded ? (
                        <span className="px-2.5 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[9px] font-black uppercase tracking-wider">
                          Overloaded ⚠️
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px] font-black uppercase tracking-wider">
                          Optimal
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-2 py-3 border-y border-slate-700/60 my-3 text-center">
                      <div>
                        <span className="text-[9px] text-slate-400 uppercase tracking-widest font-bold block">Total</span>
                        <span className="text-sm font-black text-white">{totalAssigned}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 uppercase tracking-widest font-bold block">Aktif</span>
                        <span className="text-sm font-black text-sky-400">{activeCount}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 uppercase tracking-widest font-bold block">Selesai</span>
                        <span className="text-sm font-black text-emerald-400">{doneCount}</span>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between text-[10px] font-bold text-slate-400">
                        <span>Rasio Penyelesaian</span>
                        <span>{workloadPercentage}%</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden">
                        <div 
                          className={cn("h-full rounded-full transition-all duration-500", workloadPercentage > 70 ? "bg-emerald-500" : workloadPercentage > 40 ? "bg-indigo-500" : "bg-amber-500")}
                          style={{ width: `${workloadPercentage}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-700/60 flex items-center justify-between text-xs text-slate-400 font-medium">
                    <span>Role: <strong className="text-slate-200">{member.role || 'Member'}</strong></span>
                    <button
                      onClick={() => {
                        // View tasks assigned to this member or open details
                        setCurrentView('issues');
                      }}
                      className="text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1 text-[11px]"
                    >
                      Lihat Tugas <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 2: Blockers & Risk */}
      {selectedTab === 'blockers' && (
        <div className="space-y-4 relative z-10">
          <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-2xl flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
            <p className="text-xs text-rose-200 leading-relaxed font-medium">
              Daftar tugas berikut mengalami hambatan (blocker) atau telah melewati tenggat waktu (overdue) yang memerlukan perhatian segera dari Team Lead.
            </p>
          </div>

          <div className="space-y-3">
            {blockedTasks.length === 0 && overdueTasks.length === 0 ? (
              <div className="text-center py-12 bg-slate-800/40 rounded-2xl border border-slate-800">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
                <h4 className="text-base font-bold text-white">Tidak Ada Kendala Kritis!</h4>
                <p className="text-xs text-slate-400 mt-1">Semua tugas berjalan lancar tanpa blocker maupun overdue yang tertunda.</p>
              </div>
            ) : (
              [...blockedTasks, ...overdueTasks].map((task, idx) => {
                const isBlocked = task.isBlocked || task.labels?.some((l: string) => l.toLowerCase() === 'blocked');
                return (
                  <div key={task.id || idx} className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-rose-500/40 transition-all">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-slate-900 text-slate-300 text-[10px] font-black uppercase font-mono">
                          {task.taskNumber || `TSK-${idx + 1}`}
                        </span>
                        {isBlocked ? (
                          <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 text-[10px] font-bold">Blocked</span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 text-[10px] font-bold">Overdue</span>
                        )}
                        <span className="text-[10px] text-slate-400 font-semibold">• Prioritas: <strong className="text-slate-200">{task.priority}</strong></span>
                      </div>
                      <h4 className="text-sm font-bold text-white">{task.title}</h4>
                      <p className="text-xs text-slate-400 line-clamp-1">{task.description || 'Tidak ada deskripsi tambahan.'}</p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right hidden sm:block">
                        <span className="text-[10px] text-slate-400 font-bold block">Deadline</span>
                        <span className="text-xs text-rose-400 font-bold">
                          {task.endDate ? format(ensureDate(task.endDate), 'dd MMM yyyy') : 'Tidak ditentukan'}
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedTaskForDetail(task);
                          setIsTaskDetailModalOpen(true);
                        }}
                        className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
                      >
                        Detail Tugas <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Sprint & Department Workload */}
      {selectedTab === 'sprint' && (
        <div className="space-y-6 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5 space-y-4">
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Zap className="w-4 h-4 text-emerald-400" /> Beban Tugas per Departemen
              </h3>
              <div className="space-y-3">
                {teamWorkloadData.map((team, idx) => (
                  <div key={idx} className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-800 flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-white">{team.name}</h4>
                      <span className="text-[10px] text-slate-400">Selesai: {team.Done} | Aktif: {team.Active}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-black text-emerald-400">{team.Done + team.Active} Tugas</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5 space-y-4">
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Flame className="w-4 h-4 text-amber-400" /> Informasi Sprint Aktif
              </h3>
              {activeSprint ? (
                <div className="space-y-4">
                  <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-white">{activeSprint.name}</span>
                      <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">Aktif</span>
                    </div>
                    <p className="text-xs text-slate-400">{activeSprint.goal || 'Tidak ada goal sprint yang ditentukan.'}</p>
                    <div className="pt-2">
                      <div className="flex justify-between text-[10px] font-bold text-slate-400 mb-1">
                        <span>Progress Sprint</span>
                        <span>{activeSprint.progress || 0}%</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${activeSprint.progress || 0}%` }} />
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setCurrentView('planning')}
                    className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all border border-slate-700 text-center"
                  >
                    Buka Panel Perencanaan Sprint Lengkap
                  </button>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-xs text-slate-400 italic">Belum ada sprint aktif saat ini.</p>
                  <button
                    onClick={() => setCurrentView('planning')}
                    className="mt-3 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all"
                  >
                    Buat Sprint Baru
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Activity Log */}
      {selectedTab === 'activity' && (
        <div className="space-y-4 relative z-10">
          <h3 className="text-sm font-black uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <Activity className="w-4 h-4 text-violet-400" /> Log Aktivitas & Perubahan Terakhir Tim
          </h3>
          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
            {activityLogs.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs italic">Belum ada log aktivitas tercatat.</div>
            ) : (
              activityLogs.slice(0, 15).map((log, idx) => (
                <div key={log.id || idx} className="bg-slate-800/60 border border-slate-700/60 p-3.5 rounded-xl flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-violet-500/20 text-violet-400 flex items-center justify-center font-bold text-xs">
                      {(log.userName || log.userEmail || 'U').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-xs text-white font-medium">
                        <strong className="text-indigo-300">{log.userName || log.userEmail || 'Anggota Tim'}</strong> {log.action || log.description || 'melakukan pembaruan'}
                      </p>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {log.timestamp ? format(ensureDate(log.timestamp), 'dd MMM yyyy, HH:mm') : 'Baru saja'}
                      </span>
                    </div>
                  </div>
                  <span className="px-2 py-1 rounded bg-slate-900 text-slate-400 text-[10px] font-mono">
                    {log.targetType || 'Aktivitas'}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
