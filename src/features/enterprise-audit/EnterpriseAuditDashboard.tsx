import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  History, 
  Search, 
  Filter, 
  Calendar, 
  ArrowRight, 
  X, 
  CheckCircle2, 
  Trash2, 
  FileText, 
  Layers, 
  ArrowUpRight,
  User as UserIcon,
  RefreshCw,
  Clock,
  LayoutDashboard,
  Zap,
  Activity,
  ArrowDown
} from 'lucide-react';
import { AuditLog, Project, UserProfile } from '../../types';
import { DiffViewer } from './DiffViewer';
import { toast } from 'sonner';
import { io } from 'socket.io-client';

import { apiRequest } from '../../lib/api';

interface EnterpriseAuditDashboardProps {
  selectedProject?: Project | null;
  currentUser: UserProfile | null;
}

/**
 * Enterprise Audit Dashboard Component
 * Designed for LanPro v1.2+, production-ready with real-time prepend and modular architecture.
 */
export const EnterpriseAuditDashboard: React.FC<EnterpriseAuditDashboardProps> = ({ selectedProject, currentUser }) => {
  // --- STATE MANAGEMENT ---
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Filtering States
  const [entityFilter, setEntityFilter] = useState<string>('All');
  const [actionFilter, setActionFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [limit, setLimit] = useState(50);
  
  // Real-time Indicators
  const [newActivityIncoming, setNewActivityIncoming] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // --- DATA FETCHING ---
  const fetchLogs = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      let url = `/api/audit-logs?limit=${limit}`;
      if (selectedProject) url += `&projectId=${selectedProject.id}`;
      // Backend supports filtering by entityName
      if (entityFilter !== 'All') url += `&entityName=${entityFilter}`;
      
      const data = await apiRequest(url);
      
      if (data.status === 'success') {
        setLogs(data.data);
        setNewActivityIncoming(false);
      } else {
        toast.error('Gagal memuat log audit enterprise');
      }
    } catch (err: any) {
      console.error(err);
      // Hardening v1.5: Better error reporting for HTML vs JSON
      toast.error(err.message || 'Kesalahan koneksi saat menyinkronkan data audit');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [selectedProject, entityFilter, limit]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // --- SOCKET.IO REAL-TIME INTEGRATION ---
  useEffect(() => {
    let socket: any;
    try {
      socket = io();
      
      // Safe handlers to prevent unhandled rejections
      socket.on("error", (err: any) => {
        console.warn("[SOCKET ERROR] Safe enterprise socket error caught internally:", err);
      });
      socket.on("connect_error", (err: any) => {
        console.warn("[SOCKET ERROR] Safe enterprise socket connect_error caught internally:", err);
      });
      
      socket.onerror = (err: any) => {
        console.warn("[SOCKET ERROR] Native-like enterprise socket onerror caught internally:", err);
      };
      socket.onclose = () => {

      };

      if (socket.io) {
        socket.io.on("error", (err: any) => {
          console.warn("[SOCKET IO ERROR] Enterprise engine.io error suppressed:", err);
        });
      }
      if (socket.io && socket.io.engine) {
        socket.io.engine.on("error", (err: any) => {
          console.warn("[SOCKET ENGINE ERROR] Enterprise engine error suppressed:", err);
        });
        socket.io.engine.onerror = (err: any) => {
          console.warn("[SOCKET ENGINE ERROR] Enterprise engine onerror suppressed:", err);
        };
        socket.io.engine.onclose = () => {

        };
      }
    } catch (err) {
      console.error("[SOCKET FATAL] Failed to initialize enterprise socket safely:", err);
    }

    if (socket) {
      // Join project room for targeted updates
      if (selectedProject) {
        socket.emit('join_project', { projectId: selectedProject.id });
      }

      // Listen to specify enterprise event name
      socket.on('AUDIT_LOG_ADDED', (newLog: AuditLog) => {
        // Validate project affinity
        if (!selectedProject || newLog.projectId === selectedProject.id) {
          // Prepend new log with a small visual notification indicator
          setLogs(prev => [newLog, ...prev.slice(0, 99)]); // Max 100 on real-time view
          setNewActivityIncoming(true);
          
          toast.success(`Log Real-time: ${newLog.userName || 'Sistem'} melakukan ${newLog.actionType || 'Aksi'}`, {
              icon: <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
          });
        }
      });
    }

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [selectedProject]);

  // --- UI HELPERS ---
  const getActionStyles = (action: string) => {
    switch (action) {
      case 'CREATE': return 'text-emerald-700 bg-emerald-50 border-emerald-100 dark:bg-emerald-500/10 dark:border-emerald-500/20';
      case 'UPDATE': return 'text-amber-700 bg-amber-50 border-amber-100 dark:bg-amber-500/10 dark:border-amber-500/20';
      case 'DELETE': return 'text-rose-700 bg-rose-50 border-rose-100 dark:bg-rose-500/10 dark:border-rose-500/20';
      default: return 'text-slate-600 bg-slate-50 border-slate-100';
    }
  };

  const getEntityIcon = (entity: string) => {
    switch (entity) {
      case 'Tasks': return <CheckCircle2 className="w-4 h-4" />;
      case 'Sprints': return <Layers className="w-4 h-4" />;
      case 'Projects': return <LayoutDashboard className="w-4 h-4" />;
      case 'Wiki': return <FileText className="w-4 h-4" />;
      case 'Milestones': return <ArrowUpRight className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  const filteredLogs = logs.filter(log => {
    const matchesAction = actionFilter === 'All' || log.actionType === actionFilter;
    const matchesSearch = log.userName?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         log.entityId.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesAction && matchesSearch;
  });

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('id-ID', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
  };

  return (
    <div className="flex flex-col h-full bg-slate-100/30 rounded-2xl overflow-hidden border border-slate-200">
      {/* 1. Header & Summary Section */}
      <div className="bg-white p-6 border-b border-slate-200">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="p-2.5 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-200">
                <History className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-2xl font-black text-slate-800 tracking-tight">Dashboard Audit Enterprise</h1>
            </div>
            <p className="text-slate-500 text-sm ml-12">Riwayat aktivitas infrastruktur LanPro v1.2 (Real-time & Immutable)</p>
          </div>

          <div className="flex items-center gap-4">
             <div className="hidden sm:flex bg-slate-50 rounded-2xl p-4 border border-slate-200 items-center gap-6">
                <div className="text-center">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Log</p>
                   <p className="text-xl font-black text-slate-800">{logs.length}</p>
                </div>
                <div className="h-8 w-px bg-slate-200" />
                <div className="text-center">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Status</p>
                   <div className="flex items-center gap-1.5 text-emerald-600 font-bold text-sm">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      Terhubung Langsung (Live)
                   </div>
                </div>
             </div>
             <button 
                onClick={() => { setIsRefreshing(true); fetchLogs(); }}
                disabled={isRefreshing}
                className="bg-white p-3 rounded-2xl border border-slate-200 text-slate-600 hover:bg-slate-50 hover:shadow-sm active:scale-95 transition-all disabled:opacity-50"
             >
                <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
             </button>
          </div>
        </div>

        {/* 2. Advanced Filtering Panel */}
        <div className="mt-8 flex flex-wrap items-center gap-4">
          <div className="relative flex-grow min-w-[280px] group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
            <input 
              type="text"
              placeholder="Cari berdasarkan User, Entity ID, atau Kata Kunci..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-400 outline-none transition-all shadow-inner"
            />
          </div>

          <div className="flex items-center gap-3">
            <div className="flex bg-slate-50/50 p-1 rounded-2xl border border-slate-200 shadow-sm">
              {['All', 'Tasks', 'Sprints', 'Wiki', 'Milestones'].map(ent => (
                <button
                  key={ent}
                  onClick={() => setEntityFilter(ent)}
                  className={`px-4 py-2 text-xs font-black rounded-xl transition-all ${entityFilter === ent ? 'bg-white text-indigo-600 shadow-sm border border-slate-100' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  {ent === 'All' ? 'Semua Entitas' : ent}
                </button>
              ))}
            </div>

            <div className="flex bg-slate-50/50 p-1 rounded-2xl border border-slate-200 shadow-sm">
              {['All', 'CREATE', 'UPDATE', 'DELETE'].map(act => (
                <button
                  key={act}
                  onClick={() => setActionFilter(act)}
                  className={`px-4 py-2 text-xs font-black rounded-xl transition-all ${actionFilter === act ? 'bg-white text-indigo-600 shadow-sm border border-slate-100' : 'text-slate-500 hover:text-slate-800'}`}
                >
                   {act === 'All' ? 'Semua Akses' : act}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Activity Timeline Body */}
      <div className="flex-1 relative overflow-hidden flex flex-col min-h-0">
        <AnimatePresence>
          {newActivityIncoming && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="absolute top-4 left-1/2 -translate-x-1/2 z-10"
            >
              <button 
                onClick={() => { fetchLogs(true); scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' }); }}
                className="bg-indigo-600 text-white px-5 py-2.5 rounded-full text-xs font-black shadow-xl shadow-indigo-200 flex items-center gap-2 hover:bg-indigo-700 transition-all border border-indigo-400"
              >
                <ArrowDown className="w-3.5 h-3.5" />
                LOG BARU TERDETEKSI
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400">
               <div className="relative mb-6">
                  <div className="w-16 h-16 border-4 border-indigo-100 rounded-full animate-pulse" />
                  <div className="absolute inset-0 w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
               </div>
               <p className="text-sm font-black animate-pulse uppercase tracking-[4px]">Menyinkronkan Gudang Data</p>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-300">
               <Activity className="w-16 h-16 mb-4 opacity-10" />
               <p className="text-xl font-bold">Data Log Kosong</p>
               <p className="text-sm">Belum ada aktivitas yang tercatat untuk proyek/filter ini.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredLogs.map((log, index) => (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index < 10 ? index * 0.05 : 0 }}
                  className="group relative"
                >
                  {/* Timeline Node line decoration */}
                  {index !== filteredLogs.length - 1 && (
                    <div className="absolute left-8 top-12 bottom-[-16px] w-0.5 bg-slate-200" />
                  )}

                  <div className="flex gap-6">
                     <div className={`mt-1 h-16 w-16 min-w-[64px] rounded-2xl border flex items-center justify-center transition-all group-hover:scale-105 group-hover:shadow-lg ${getActionStyles(log.actionType)} shadow-sm`}>
                        {log.actionType === 'CREATE' && <Zap className="w-7 h-7" />}
                        {log.actionType === 'UPDATE' && <RefreshCw className="w-7 h-7 font-black" />}
                        {log.actionType === 'DELETE' && <Trash2 className="w-7 h-7" />}
                     </div>

                     <div className="flex-grow bg-white border border-slate-200 rounded-2xl p-5 hover:border-indigo-400 hover:shadow-xl hover:shadow-slate-200/50 transition-all cursor-pointer shadow-sm overflow-hidden"
                          onClick={() => setSelectedLog(log)}>
                        <div className="flex items-start justify-between mb-2">
                           <div className="flex items-center gap-3">
                              <div className="w-7 h-7 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-500">
                                <UserIcon className="w-4 h-4" />
                              </div>
                              <span className="text-sm font-black text-slate-900 tracking-tight">{log.userName}</span>
                              <span className="h-1 w-1 rounded-full bg-slate-300" />
                              <span className="text-[10px] bg-slate-100 text-slate-600 font-black px-2 py-1 rounded-md uppercase flex items-center gap-1.5 border border-slate-200">
                                 {getEntityIcon(log.entityName)}
                                 {log.entityName}
                              </span>
                           </div>
                           <div className="text-[10px] font-black text-slate-400 flex items-center gap-2">
                             <Clock className="w-3 h-3 text-slate-300" />
                             {formatDate(log.createdAt)}
                           </div>
                        </div>

                        <div className="flex items-center gap-3 text-sm text-slate-600 font-medium">
                           <p>
                             Melakukan aksi <span className={`px-2 py-0.5 rounded-lg text-xs font-black inline-block ${getActionStyles(log.actionType)}`}>{log.actionType}</span> 
                             pada entitas {log.entityName} dengan referensi ID: 
                           </p>
                           <code className="text-[10px] font-bold bg-slate-100 px-2 py-1 rounded border border-slate-200 text-slate-500 font-mono tracking-tighter">
                             {log.entityId}
                           </code>
                        </div>

                        <div className="mt-4 flex items-center justify-between pt-4 border-t border-dashed border-slate-100">
                           <div className="flex -space-x-2">
                              {/* Visual diff summary hint */}
                              {log.oldValues && Object.keys(log.oldValues).length > 0 && (
                                <div className="h-6 px-2 bg-rose-50 border border-rose-100 rounded text-[9px] font-bold text-rose-500 flex items-center uppercase">Sebelum: {Object.keys(log.oldValues).length} keys</div>
                              )}
                              {log.newValues && Object.keys(log.newValues).length > 0 && (
                                <div className="h-6 px-2 bg-emerald-50 border border-emerald-100 rounded text-[9px] font-bold text-emerald-500 flex items-center uppercase ml-2">Sesudah: {Object.keys(log.newValues).length} keys</div>
                              )}
                           </div>
                           <span className="text-[10px] font-black text-indigo-500 flex items-center gap-1 group-hover:gap-2 transition-all group-hover:translate-x-1">
                              KLIK UNTUK LIHAT CHANGES <ArrowRight className="w-3 h-3" />
                           </span>
                        </div>
                     </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 4. Diff Viewer Modal */}
      <AnimatePresence>
        {selectedLog && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
             <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               className="fixed inset-0 bg-slate-900/80 backdrop-blur-md"
               onClick={() => setSelectedLog(null)}
             />
             
             <motion.div
               initial={{ opacity: 0, scale: 0.95, y: 20 }}
               animate={{ opacity: 1, scale: 1, y: 0 }}
               exit={{ opacity: 0, scale: 0.95, y: 20 }}
               className="relative bg-white w-full max-w-3xl rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[85vh] border border-white/20"
             >
                {/* Modal Header */}
                <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                   <div className="flex items-center gap-5">
                      <div className={`p-4 rounded-2xl border shadow-lg ${getActionStyles(selectedLog.actionType)}`}>
                         {getEntityIcon(selectedLog.entityName)}
                      </div>
                      <div>
                         <h3 className="text-2xl font-black text-slate-800 tracking-tight">Detail Perubahan Audit</h3>
                         <div className="flex items-center gap-3 mt-1">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">{selectedLog.entityName}</span>
                            <span className="text-slate-300">•</span>
                            <code className="text-[10px] font-bold bg-slate-200/50 text-slate-600 px-2 py-0.5 rounded">{selectedLog.entityId}</code>
                         </div>
                      </div>
                   </div>
                   <button 
                     onClick={() => setSelectedLog(null)}
                     className="p-3 bg-white rounded-2xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-all border border-slate-200"
                   >
                     <X className="w-6 h-6" />
                   </button>
                </div>                {/* Modal Info Stats */}
                <div className="grid grid-cols-2 bg-slate-50/30 border-b border-slate-100">
                    <div className="p-6 border-r border-slate-100">
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Aktivitas Penulis</p>
                       <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-black">
                             {(selectedLog.userName || "U")[0]}
                          </div>
                          <div>
                             <p className="text-sm font-black text-slate-800">{selectedLog.userName || "Unknown User"}</p>
                             <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Akses Auditor Sistem</p>
                          </div>
                       </div>
                    </div>
                    <div className="p-6">
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Tanda Waktu (WIB)</p>
                       <div className="flex items-center gap-3 text-slate-800 font-bold">
                          <Calendar className="w-5 h-5 text-indigo-500" />
                          <span className="text-sm">{new Date(selectedLog.createdAt).toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'medium'})}</span>
                       </div>
                    </div>
                </div>

                {/* Diff Engine */}
                <div className="flex-1 overflow-y-auto p-8 bg-white custom-scrollbar">
                   <div className="mb-6 flex items-center gap-2">
                      <div className="h-5 w-1 bg-indigo-500 rounded-full" />
                      <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest">Komparasi Perubahan Objek</h4>
                   </div>
                   <DiffViewer 
                     oldValues={selectedLog.oldValues} 
                     newValues={selectedLog.newValues} 
                   />
                   
                   {/* Raw JSON fallback (Optional for high technical audit) */}
                   <details className="mt-12 group">
                      <summary className="text-[10px] font-black text-slate-400 cursor-pointer uppercase hover:text-slate-600 transition-colors">
                        Tampilkan Raw Technical Trace (JSON)
                      </summary>
                      <div className="mt-4 p-4 rounded-xl bg-slate-900 text-indigo-400 font-mono text-[10px] overflow-x-auto border border-slate-800">
                         <pre>{JSON.stringify(selectedLog, null, 2)}</pre>
                      </div>
                   </details>
                </div>

                {/* Footer */}
                <div className="p-8 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
                   <p className="text-[10px] font-black text-slate-400 italic">ID_JEJAK: {selectedLog.id}</p>
                   <button 
                     onClick={() => setSelectedLog(null)}
                     className="px-8 py-3 bg-slate-900 text-white text-xs font-black rounded-2xl hover:bg-slate-800 transition-all shadow-xl hover:shadow-2xl shadow-slate-200 active:scale-95"
                   >
                     SELESAI MENINJAU
                   </button>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
