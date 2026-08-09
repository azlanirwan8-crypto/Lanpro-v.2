import React, { useRef, useState } from 'react';
import { HardDrive, Download, Upload, AlertTriangle } from 'lucide-react';
import { Project, Task, Sprint, UserProfile, MasterData, ActivityLog } from '../../types';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { apiRequest } from '../../lib/api';
import { ConfirmationModal } from '../../components/ui/ConfirmationModal';

const chunkArray = <T,>(arr: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
};

export const BackupPanel = ({
  selectedProject,
  tasks,
  sprints,
  projectMembers,
  activityLogs,
  masterData
}: {
  selectedProject: Project | null;
  tasks: Task[];
  sprints: Sprint[];
  projectMembers: UserProfile[];
  activityLogs: ActivityLog[];
  masterData: MasterData[];
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Custom confirmation modal states
  const [selectedFileToRestore, setSelectedFileToRestore] = useState<File | null>(null);
  const [isRestoreConfirmOpen, setIsRestoreConfirmOpen] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  const exportProjectBackup = async () => {
    try {
      const result = await apiRequest('/api/system/backup');
      if (result.status !== 'success') throw new Error(result.message);
      
      const blob = new Blob([JSON.stringify(result.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `system_backup_${format(new Date(), 'yyyyMMdd_HHmmss')}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('System Backup downloaded successfully');
    } catch (e: any) {
      console.error(e);
      toast.error('Failed to download system backup');
    }
  };

  const handleRestoreChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFileToRestore(file);
    setIsRestoreConfirmOpen(true);
  };

  const executeRestore = async () => {
    if (!selectedFileToRestore) return;
    setIsRestoring(true);
    try {
      const text = await selectedFileToRestore.text();
      const data = JSON.parse(text);
      
      const result = await apiRequest('/api/system/restore', {
        method: 'POST',
        body: { data }
      });
      
      if (result.status !== 'success') throw new Error(result.message);
      
      toast.success('System restore completed! Refreshing...');
      setTimeout(() => window.location.reload(), 1500);
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to restore backup: ' + err.message);
    } finally {
      setIsRestoring(false);
      setIsRestoreConfirmOpen(false);
      setSelectedFileToRestore(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const cancelRestore = () => {
    setIsRestoreConfirmOpen(false);
    setSelectedFileToRestore(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };


  return (
    <div className="flex-1 overflow-auto p-6 lg:p-8 bg-slate-50 animate-in fade-in duration-700 custom-scrollbar w-full">
      <div className="space-y-6 w-full mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Backup Box */}
          <div className="bg-white border border-slate-200 rounded-xl p-8 flex flex-col items-center text-center shadow-sm hover:shadow-md transition-all">
            <div className="w-20 h-20 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mb-6">
              <Download className="w-10 h-10" />
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">Export Data</h2>
            <p className="text-slate-500 text-sm mb-8 px-4">Download full snapshot of this project in JSON format. Includes all tasks, comments, configuration, and sprint history.</p>
            <button 
              onClick={exportProjectBackup}
              disabled={!selectedProject}
              className="mt-auto px-6 py-3 w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Export Project Backup
            </button>
          </div>

          {/* Restore Box */}
          <div className="bg-white border border-slate-200 rounded-xl p-8 flex flex-col items-center text-center shadow-sm hover:shadow-md transition-all">
            <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mb-6">
              <Upload className="w-10 h-10" />
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">Restore Data</h2>
            <p className="text-slate-500 text-sm mb-6 px-4 flex items-start gap-2 text-left">
              <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <span>Warning: Restoring data will overwrite current project timeline and documents. This action cannot be undone.</span>
            </p>
            <button 
               onClick={() => fileInputRef.current?.click()}
               className="mt-auto px-6 py-3 w-full bg-rose-50 border-2 border-rose-200 text-rose-600 hover:bg-rose-100 hover:border-rose-300 rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
            >
              Upload Backup File
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleRestoreChange} 
              accept="application/json" 
              className="hidden" 
            />
          </div>
        </div>

      </div>

      {isRestoreConfirmOpen && (
        <ConfirmationModal
          isOpen={isRestoreConfirmOpen}
          onClose={cancelRestore}
          onConfirm={executeRestore}
          title="WARNING: Restore System Data?"
          message="Are you absolutely sure you want to restore? This will completely overwrite all CURRENT SYSTEM data with the snapshot in your backup file. This action is irreversible!"
          confirmText="Ya, Restore Sekarang"
          cancelText="Batal"
          variant="danger"
          isLoading={isRestoring}
        />
      )}
    </div>
  );
};
