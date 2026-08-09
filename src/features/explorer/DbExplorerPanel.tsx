import React, { useState, useEffect } from 'react';
import { Play, Database, Server, Table as TableIcon, CloudUpload, HardDrive, Wifi, Code } from 'lucide-react';
import { BackupPanel } from '../backup/BackupPanel';
import { ConnectPanel } from '../connect/ConnectPanel';
import { cn } from '../../lib/utils';
import { toast } from 'sonner';
import { apiRequest } from '../../lib/api';

export const DbExplorerPanel: React.FC<any> = ({
  selectedProject,
  tasks,
  sprints,
  projectMembers,
  activityLogs,
  masterData
}) => {
  const [activeTab, setActiveTab] = useState<'explorer' | 'backup' | 'connect'>('explorer');
  const [schema, setSchema] = useState<any>(null);
  const [tableStats, setTableStats] = useState<any[]>([]);
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTable, setActiveTable] = useState<string | null>(null);
  const [dbMode, setDbMode] = useState<'mysql' | 'local'>('mysql');
  const [dbHost, setDbHost] = useState('');
  const [switching, setSwitching] = useState(false);
  const [editingRow, setEditingRow] = useState<number | null>(null);
  const [editValues, setEditValues] = useState<any>({});
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  const deleteRow = async (pkField: string, pkValue: any) => {
    if (!activeTable) return;
    
    setLoading(true);
    try {
       const sql = `DELETE FROM ${activeTable} WHERE \`${pkField}\` = '${String(pkValue).replace(/'/g, "''")}'`;
       const data = await apiRequest('/api/db-query', {
         method: 'POST',
         body: { query: sql }
       });
       if (data.status === 'success') {
          toast.success("Baris berhasil dihapus");
          loadTable(activeTable); // refresh
       } else {
          toast.error(data.message || "Gagal menghapus baris");
       }
    } catch(err: any) {
       toast.error(err.message);
    } finally {
       setLoading(false);
    }
  };

  const saveRowEdit = async (pkField: string, pkValue: any, index: number) => {
    if (!activeTable) return;
    setLoading(true);
    try {
      const updates = Object.keys(editValues)
        .filter(key => key !== pkField)
        .map(key => {
            const val = editValues[key];
            if (val === null || val === '') return `\`${key}\` = NULL`;
            return `\`${key}\` = '${String(val).replace(/'/g, "''")}'`;
        })
        .join(', ');
        
      const sql = `UPDATE ${activeTable} SET ${updates} WHERE \`${pkField}\` = '${String(pkValue).replace(/'/g, "''")}'`;
      const data = await apiRequest('/api/db-query', {
         method: 'POST',
         body: { query: sql }
      });
      if (data.status === 'success') {
         toast.success("Baris berhasil diupdate");
         setEditingRow(null);
         loadTable(activeTable); // refresh
      } else {
         toast.error(data.message || "Gagal mengupdate baris");
      }
    } catch(err: any) {
       toast.error(err.message);
    } finally {
       setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchema();
    fetchDbStatus();
  }, []);

  const fetchDbStatus = async () => {
    try {
      const data = await apiRequest('/api/system/db-status');
      if (data.status === 'success') {
        setDbMode(data.mode);
        setDbHost(data.host);
      }
    } catch (e) {
      console.error("Failed to fetch database status:", e);
    }
  };

  const handleToggleDbMode = async () => {
    setSwitching(true);
    const targetMode = dbMode === 'mysql' ? 'local' : 'mysql';
    try {
      const data = await apiRequest('/api/system/db-status', {
        method: 'POST',
        body: { mode: targetMode }
      });
      if (data.status === 'success') {
        toast.success(data.message);
        setTimeout(() => {
          window.location.reload();
        }, 1200);
      } else {
        throw new Error(data.message || "Gagal mengubah mode database");
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSwitching(false);
    }
  };

  const fetchSchema = async () => {
    try {
      const data = await apiRequest('/api/db-schema');
      if (data.status === 'success') {
        setSchema(data.tables);
        if (data.stats) {
          setTableStats(data.stats);
        }
      }
    } catch (err: any) {
      console.error(err);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0 || !bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleRunQuery = async (sqlToRun: string) => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await apiRequest('/api/db-query', {
        method: 'POST',
        body: { query: sqlToRun }
      });
      
      if (data.status === 'error') {
        setError(data.message);
      } else {
        setResult(data.data);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadTable = (tableName: string) => {
    setActiveTable(tableName);
    const sql = `SELECT * FROM ${tableName} LIMIT 100;`;
    setQuery(sql);
    handleRunQuery(sql);
  };


  return (
    <div className="flex flex-col h-full bg-slate-50 relative overflow-hidden">
        <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10 shrink-0">
          <div className="flex flex-col">
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
               <Database className="w-6 h-6 text-indigo-600" />
               Database Tools
            </h1>
            <p className="text-sm text-slate-500 mt-1">
               Manage Database Explorer, Connection, and Backups.
            </p>
          </div>
        </div>

        <div className="bg-white border-b border-slate-200 px-6 py-2 flex items-center gap-4 shrink-0 overflow-x-auto">
           <button
             onClick={() => setActiveTab('backup')}
             className={cn(
                "px-4 py-2 text-sm font-medium transition-all rounded-lg flex items-center gap-2",
                activeTab === 'backup' ? "bg-indigo-50 text-indigo-700" : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
             )}
           >
              <HardDrive className="w-4 h-4" />
              Backup & Restore
           </button>
           <button
             onClick={() => setActiveTab('connect')}
             className={cn(
                "px-4 py-2 text-sm font-medium transition-all rounded-lg flex items-center gap-2",
                activeTab === 'connect' ? "bg-indigo-50 text-indigo-700" : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
             )}
           >
              <Wifi className="w-4 h-4" />
              Connection
           </button>
           <button
             onClick={() => setActiveTab('explorer')}
             className={cn(
                "px-4 py-2 text-sm font-medium transition-all rounded-lg flex items-center gap-2",
                activeTab === 'explorer' ? "bg-indigo-50 text-indigo-700" : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
             )}
           >
              <Code className="w-4 h-4" />
              DB Explorer
           </button>
        </div>

        {activeTab === 'backup' && (
           <div className="flex-1 overflow-hidden relative z-10 w-full h-full flex flex-col">
              <BackupPanel
                selectedProject={selectedProject}
                tasks={tasks}
                sprints={sprints}
                projectMembers={projectMembers}
                activityLogs={activityLogs}
                masterData={masterData}
              />
           </div>
        )}

        {activeTab === 'connect' && (
           <div className="flex-1 overflow-hidden relative z-10 w-full h-full flex flex-col">
              <ConnectPanel />
           </div>
        )}

        {activeTab === 'explorer' && (
        <div className="flex-1 overflow-hidden flex flex-col relative z-10">
           {/* Database Mode Banner */}
           <div className="px-6 py-3 border-b flex flex-wrap items-center justify-between gap-4 shrink-0 shadow-xs bg-emerald-50 border-emerald-100 text-emerald-800">
              <div className="flex items-center gap-2">
                 <div className="w-2.5 h-2.5 rounded-full animate-pulse bg-emerald-500" />
                 <span className="text-sm font-semibold flex items-center gap-1.5">
                    Mode Database: <span className="underline font-bold">PostgreSQL (Neon Cloud)</span>
                 </span>
                 <span className="text-xs opacity-75 hidden sm:inline">
                    (Primary Engine Active)
                 </span>
              </div>
              
              <div className="flex items-center gap-4">
                 <button
                    onClick={fetchSchema}
                    title="Refresh Table Schema"
                    className="p-1 hover:bg-black/5 rounded transition-all text-slate-500 hover:text-slate-800 flex items-center gap-1 text-xs font-semibold cursor-pointer"
                 >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 4.75L18 8" />
                    </svg>
                    Refresh Schema
                 </button>
              </div>
           </div>

           <div className="flex-1 flex overflow-hidden">
              {/* Sidebar: Table List */}
           <div className="w-[300px] bg-white border-r border-slate-200 flex flex-col overflow-y-auto shrink-0">
              <div className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider sticky top-0 bg-white/90 backdrop-blur-sm z-10 border-b border-slate-100 flex justify-between items-center">
                 Tables
              </div>
              <div className="p-2 flex flex-col gap-1">
                {schema && Object.keys(schema).map(tableName => {
                    const stats = tableStats.find(s => s.tableName === tableName);
                    return (
                        <button 
                           key={tableName}
                           onClick={() => loadTable(tableName)}
                           className={`flex items-center justify-between gap-2 px-3 py-2 text-sm rounded-md transition-colors ${activeTable === tableName ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-slate-600 hover:bg-slate-100'}`}
                        >
                           <div className="flex items-center gap-2 truncate">
                              <TableIcon className="w-4 h-4 shrink-0 text-slate-400" />
                              <span className="truncate">{tableName}</span>
                           </div>
                           {stats && (
                             <span className="text-[10px] text-slate-400 font-mono tracking-tighter shrink-0">
                               {formatSize(stats.sizeBytes)}
                             </span>
                           )}
                        </button>
                    )
                })}
                {!schema && (
                  <div className="text-sm text-slate-400 px-3 py-2">Loading tables...</div>
                )}
              </div>
           </div>

           {/* Main Content: Query Editor and Results */}
           <div className="flex-1 flex flex-col min-w-0">
               {/* Query Editor */}
               <div className="p-4 border-b border-slate-200 bg-slate-50 shrink-0">
                  <div className="relative">
                      <textarea 
                         value={query}
                         onChange={(e) => setQuery(e.target.value)}
                         placeholder="SELECT * FROM Users;"
                         className="w-full text-slate-700 bg-white border border-slate-300 rounded-lg p-4 font-mono text-sm min-h-[120px] focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none resize-y"
                      />
                      <button 
                         onClick={() => handleRunQuery(query)}
                         disabled={loading || !query.trim()}
                         className="absolute bottom-4 right-4 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md shadow-sm font-medium text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                         <Play className="w-4 h-4" />
                         Run Query
                      </button>
                  </div>
               </div>

               {/* Results Area */}
               <div className="flex-1 overflow-auto bg-white p-4">
                  {!loading && !result && !error && (
                      <div className="h-full flex flex-col items-center justify-center text-slate-400">
                          <Database className="w-12 h-12 mb-4 opacity-20" />
                          <p>Select a table or run a query to view data.</p>
                      </div>
                  )}

                  {loading && (
                      <div className="flex items-center gap-3 text-slate-500 mt-4 ml-4">
                         <div className="w-4 h-4 rounded-full border-2 border-indigo-600 top-border-transparent animate-spin" />
                         Executing query...
                      </div>
                  )}

                  {!loading && error && (
                     <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg font-mono text-sm max-w-full overflow-x-auto whitespace-pre-wrap">
                        {error}
                     </div>
                  )}

                  {!loading && result && Array.isArray(result) && (
                      <div className="border border-slate-200 rounded-lg overflow-x-auto">
                          <table className="w-full text-left border-collapse text-sm">
                              <thead className="bg-slate-100 text-slate-700">
                                  <tr>
                                      {result.length > 0 && <th className="p-3 border-b border-slate-200 font-semibold w-32">Actions</th>}
                                      {result.length > 0 ? Object.keys(result[0]).map(key => (
                                          <th key={key} className="p-3 border-b border-slate-200 font-semibold truncate max-w-[200px]">{key}</th>
                                      )) : (
                                          <th className="p-3 border-b border-slate-200 font-semibold text-slate-400">Result (0 rows)</th>
                                      )}
                                  </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                  {result.length > 0 ? result.map((row: any, i: number) => {
                                      const isEditing = editingRow === i;
                                      const pkField = Object.keys(row)[0];
                                      const hasId = pkField !== undefined;
                                      return (
                                        <tr key={i} className="hover:bg-slate-50">
                                            <td className="p-3">
                                                {hasId && activeTable && (
                                                    <div className="flex items-center gap-2">
                                                        {isEditing ? (
                                                            <>
                                                                <button onClick={() => saveRowEdit(pkField, row[pkField], i)} className="text-emerald-600 hover:text-emerald-700 font-medium">Save</button>
                                                                <button onClick={() => setEditingRow(null)} className="text-slate-500 hover:text-slate-700 font-medium">Cancel</button>
                                                            </>
                                                        ) : confirmDelete === i ? (
                                                            <>
                                                                <span className="text-xs text-red-500 mr-1">Yakin?</span>
                                                                <button onClick={() => { deleteRow(pkField, row[pkField]); setConfirmDelete(null); }} className="text-red-600 hover:text-red-700 font-bold">Ya</button>
                                                                <button onClick={() => setConfirmDelete(null)} className="text-slate-500 hover:text-slate-700 font-medium">Batal</button>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <button onClick={() => { setEditingRow(i); setEditValues({...row}); }} className="text-indigo-600 hover:text-indigo-700 font-medium">Edit</button>
                                                                <button onClick={() => setConfirmDelete(i)} className="text-red-500 hover:text-red-700 font-medium">Del</button>
                                                            </>
                                                        )}
                                                    </div>
                                                )}
                                            </td>
                                            {Object.keys(row).map((key: string, j: number) => (
                                                <td key={j} className="p-3 max-w-[300px]">
                                                    {isEditing ? (
                                                        <input 
                                                            type="text" 
                                                            value={editValues[key] !== null ? editValues[key] : ''} 
                                                            onChange={(e) => setEditValues({...editValues, [key]: e.target.value})}
                                                            className="w-full border border-slate-300 rounded px-2 py-1 text-sm bg-white"
                                                            disabled={key === pkField}
                                                        />
                                                    ) : (
                                                        <div className="truncate w-full text-slate-600">
                                                            {row[key] === null ? <span className="text-slate-300 italic">null</span> : 
                                                             typeof row[key] === 'object' ? JSON.stringify(row[key]) : String(row[key])}
                                                        </div>
                                                    )}
                                                </td>
                                            ))}
                                        </tr>
                                      )
                                  }) : (
                                      <tr>
                                          <td className="p-4 text-center text-slate-400 italic">No rows found.</td>
                                      </tr>
                                  )}
                              </tbody>
                          </table>
                      </div>
                  )}
                  
                  {!loading && result && !Array.isArray(result) && (
                     <div className="bg-slate-50 border border-slate-200 text-slate-700 p-4 rounded-lg font-mono text-sm break-words">
                        Query OK. <br />
                        {JSON.stringify(result, null, 2)}
                     </div>
                  )}
               </div>
           </div>
        </div>
        </div>
        )}
    </div>
  );
};
