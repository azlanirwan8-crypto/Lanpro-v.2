import React, { useState } from 'react';
import { 
  History, Search, DownloadCloud, Activity, Zap, Users, Clock, PlusSquare, Trash2, Edit3, ChevronRight 
} from 'lucide-react';
import { ActivityLog, UserProfile } from '../../types';
import { UserAvatar } from '../../components/ui/UserAvatar';

export const ActivityLogPanel = ({
  activityLogs: propLogs,
  exportTasksToCSV,
  projectMembers: propMembers,
  safeFormat
}: {
  activityLogs: ActivityLog[];
  exportTasksToCSV: () => void;
  projectMembers: UserProfile[];
  safeFormat: (date: any, formatStr: string) => string;
}) => {
  const [auditLogSearch, setAuditLogSearch] = useState('');
  const activityLogs = Array.isArray(propLogs) ? propLogs : [];
  const projectMembers = Array.isArray(propMembers) ? propMembers : [];

  const getActor = (log: ActivityLog) => {
    if (!log) return { displayName: 'System', email: 'system@lanpro' };
    return projectMembers.find(m => m.uid === log.userId) || { displayName: 'System', email: 'system@lanpro' };
  };

  const activeActorsCount = new Set(
    activityLogs
      .filter(t => {
        const d = new Date(t.createdAt?.toDate ? t.createdAt.toDate() : (t.createdAt?.seconds ? new Date(t.createdAt.seconds * 1000) : new Date(t.createdAt)));
        return d.getTime() > Date.now() - 24 * 60 * 60 * 1000;
      })
      .map(x => x.userId)
  ).size;

  const filteredLogs = activityLogs.filter(log => {
      if(!auditLogSearch.trim()) return true;
      const s = auditLogSearch.toLowerCase();
      const actor = getActor(log);
      return log.action?.toLowerCase().includes(s) || log.details?.toLowerCase().includes(s) || actor?.displayName?.toLowerCase().includes(s);
  });

  return (
    <div className="flex-1 overflow-auto p-6 md:p-8 bg-slate-50 animate-in fade-in duration-700 custom-scrollbar">
      <div className="space-y-6 w-full">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-slate-200 pb-6 mb-2">
          <div className="flex gap-4 items-center">
            <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shadow-inner">
              <History className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-slate-800 tracking-tight">System Audit Log</h1>
              <p className="text-slate-500 font-medium mt-1 text-sm tracking-wide">Comprehensive tracking of all system events, data mutations, and access records.</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex bg-white border border-slate-200 rounded-xl px-3 py-2 items-center gap-2 shadow-sm">
              <Search className="w-4 h-4 text-slate-400" />
              <input value={auditLogSearch} onChange={e => setAuditLogSearch(e.target.value)} placeholder="Search audit logs..." className="bg-transparent border-none outline-none text-xs w-48 placeholder:text-slate-400 text-slate-700" />
            </div>
            <button onClick={exportTasksToCSV} className="px-4 py-2.5 bg-indigo-600 border border-indigo-600 text-white rounded-xl text-xs font-black shadow-lg shadow-indigo-100 transition-all flex items-center gap-2 tracking-widest hover:bg-indigo-700 hover:-translate-y-0.5 active:scale-95 uppercase">
              <DownloadCloud className="w-4 h-4" /> Export CSV
            </button>
          </div>
      </div>

      {/* Summary Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col justify-between hover:shadow-md transition-shadow h-32 relative overflow-hidden">
              <div className="absolute right-0 top-0 opacity-[0.03] scale-150 -translate-y-4 translate-x-4"><Activity className="w-32 h-32" /></div>
              <div className="text-[10px] font-black tracking-[0.2em] uppercase text-slate-400 z-10 flex items-center gap-2"><Zap className="w-3.5 h-3.5" /> Total Events</div>
              <div className="text-4xl font-black text-slate-800 z-10">{activityLogs.length}</div>
          </div>
          <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col justify-between hover:shadow-md transition-shadow h-32 relative overflow-hidden">
              <div className="absolute right-0 top-0 opacity-[0.03] scale-150 -translate-y-4 translate-x-4"><Users className="w-32 h-32" /></div>
              <div className="text-[10px] font-black tracking-[0.2em] uppercase text-slate-400 z-10 flex items-center gap-2"><Users className="w-3.5 h-3.5" /> Active Actors (24h)</div>
              <div className="text-4xl font-black text-slate-800 z-10">{activeActorsCount}</div>
          </div>
          <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col justify-between hover:shadow-md transition-shadow h-32 relative overflow-hidden">
              <div className="absolute right-0 top-0 opacity-[0.03] scale-150 -translate-y-4 translate-x-4"><Clock className="w-32 h-32" /></div>
              <div className="text-[10px] font-black tracking-[0.2em] uppercase text-slate-400 z-10 flex items-center gap-2"><Clock className="w-3.5 h-3.5" /> Last Event</div>
              <div className="text-xl font-bold text-slate-800 tracking-tight z-10 flex flex-col">
                {activityLogs.length > 0 ? (
                    <>
                      <span>{safeFormat(activityLogs[0].createdAt, 'MMM dd, yyyy')}</span>
                      <span className="text-sm font-medium text-slate-500">{safeFormat(activityLogs[0].createdAt, 'HH:mm:ss')}</span>
                    </>
                ) : '-'}
              </div>
          </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
        <div className="p-6 bg-slate-50 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="relative flex-1 custom-search-bar w-full">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input placeholder="Search event logs, user ID, or actions by keyword..." value={auditLogSearch} onChange={(e)=>setAuditLogSearch(e.target.value)} className="w-full pl-14 pr-6 py-4 bg-white border border-slate-200 rounded-2xl text-[13px] font-bold text-slate-700 tracking-wide focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all placeholder:font-medium placeholder:text-slate-400" />
            </div>
        </div>
        {activityLogs.length === 0 ? (
          <div className="p-20 text-center text-slate-400 font-medium">No system events tracked yet. All events will appear here.</div>
        ) : (
          <div className="overflow-x-auto min-h-[500px]">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead className="bg-white">
                <tr>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-200 whitespace-nowrap">Timestamp</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-200">Event Signature</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-200">Subject (Actor)</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-200 text-right">Audit Trail ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLogs.map(log => {
                    const actor = getActor(log);
                    return (
                    <tr key={log.id} className="hover:bg-slate-50 border-b border-slate-100 transition-colors group cursor-default">
                      <td className="px-8 py-5 whitespace-nowrap align-top">
                          <div className="text-sm font-bold text-slate-800 tabular-nums tracking-tight">{safeFormat(log.createdAt, 'MMM dd, yyyy')}</div>
                          <div className="text-[10px] font-black text-slate-400 tabular-nums uppercase mt-1 tracking-widest">{safeFormat(log.createdAt, 'HH:mm:ss.SSS')}</div>
                      </td>
                      <td className="px-8 py-5 w-[45%]">
                          <div className="flex items-start gap-4">
                            {(() => {
                              const a = (log.action || '').toLowerCase();
                              let Icon = Activity;
                              let colorClass = "text-slate-500 bg-slate-50 border-slate-200 group-hover:bg-slate-100 group-hover:text-slate-700 group-hover:border-slate-300";
                              let badgeClass = "bg-slate-100 text-slate-600 border border-slate-200";
                              if (a.includes('create') || a.includes('add')) { Icon = PlusSquare; colorClass = "text-blue-600 bg-blue-50 border-blue-200 group-hover:bg-blue-100 group-hover:text-blue-700"; badgeClass = "bg-blue-100 text-blue-700 border-blue-200"; }
                              else if (a.includes('delete') || a.includes('remove')) { Icon = Trash2; colorClass = "text-rose-600 bg-rose-50 border-rose-200 group-hover:bg-rose-100 group-hover:text-rose-700"; badgeClass = "bg-rose-100 text-rose-700 border-rose-200"; }
                              else if (a.includes('update') || a.includes('edit')) { Icon = Edit3; colorClass = "text-amber-600 bg-amber-50 border-amber-200 group-hover:bg-amber-100 group-hover:text-amber-700"; badgeClass = "bg-amber-100 text-amber-700 border-amber-200"; }
                              else if (a.includes('invite') || a.includes('team') || a.includes('user')) { Icon = Users; colorClass = "text-emerald-600 bg-emerald-50 border-emerald-200 group-hover:bg-emerald-100 group-hover:text-emerald-700"; badgeClass = "bg-emerald-100 text-emerald-700 border-emerald-200"; }
                              else { Icon = Zap; colorClass = "text-indigo-600 bg-indigo-50 border-indigo-200 group-hover:bg-indigo-100 group-hover:text-indigo-700"; badgeClass = "bg-indigo-100 text-indigo-700 border-indigo-200"; }
                              
                              return (
                                <>
                                  <div className={`mt-0.5 w-10 h-10 rounded-[12px] border flex items-center justify-center shrink-0 transition-all ${colorClass}`}>
                                    <Icon className="w-4 h-4" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap mb-2">
                                      <span className={`text-[9px] font-black tracking-[0.15em] uppercase px-2 py-0.5 rounded shadow-sm ${badgeClass}`}>
                                        {log.action?.replace(/_/g, ' ') || 'ACTION_EXECUTED'}
                                      </span>
                                      <span className="text-[10px] font-bold text-slate-400 capitalize px-1 ring-1 ring-slate-200 rounded-sm bg-slate-50">
                                        Source: UI
                                      </span>
                                    </div>
                                    <div className="font-mono text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 p-2.5 rounded-lg shadow-inner whitespace-pre-wrap word-break">
                                      <span className="text-slate-400 select-none mr-2">{'>'}</span>{log.details || 'No payload details provided.'}
                                    </div>
                                  </div>
                                </>
                              );
                            })()}
                          </div>
                      </td>
                      <td className="px-8 py-5 min-w-[200px]">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 shrink-0 shadow-inner border-2 border-white rounded-full bg-slate-100 flex items-center justify-center relative ring-1 ring-slate-200">
                                <UserAvatar uid={log.userId} members={projectMembers} className="w-full h-full text-xs font-bold" />
                                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full"></div>
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="text-[13px] font-black text-slate-800 truncate">{actor?.displayName}</span>
                              <span className="text-[10px] font-bold text-slate-500 truncate tracking-wide">{actor?.email}</span>
                            </div>
                        </div>
                      </td>
                      <td className="px-8 py-5 text-right w-48 align-middle">
                          <div className="flex flex-col items-end gap-1.5">
                            <div className="font-mono text-[9px] bg-slate-100 text-slate-500 px-2 py-1 rounded border border-slate-200 uppercase font-black tracking-widest select-all opacity-70 group-hover:opacity-100 transition-opacity" title={log.id}>
                              ...{log.id?.substring((log.id?.length || 0) - 8)}
                            </div>
                            <button className="text-[10px] font-black text-indigo-600 hover:text-indigo-800 uppercase tracking-widest flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              Inspect <ChevronRight className="w-3 h-3" />
                            </button>
                          </div>
                      </td>
                    </tr>
                    );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div></div>
  );
};
