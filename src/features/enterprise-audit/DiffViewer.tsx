import React from 'react';
import { motion } from 'motion/react';
import { ArrowRight, Minus, Plus } from 'lucide-react';

interface DiffViewerProps {
  oldValues: any;
  newValues: any;
}

/**
 * Enterprise-Grade Diff Viewer
 * Membandingkan state sebelum dan sesudah secara elegan untuk auditor.
 */
export const DiffViewer: React.FC<DiffViewerProps> = ({ oldValues, newValues }) => {
  const allKeys = Array.from(new Set([
    ...Object.keys(oldValues || {}),
    ...Object.keys(newValues || {})
  ])).filter(key => {
    // Abaikan field metadata teknis
    return !['id', 'updatedAt', 'createdAt', 'projectId', 'taskCounter', 'projectKey'].includes(key);
  });

  if (allKeys.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
        <Minus className="w-6 h-6 mb-2 opacity-20" />
        <p className="text-sm italic">Tidak ada perubahan field data yang terdeteksi.</p>
      </div>
    );
  }

  const formatValue = (val: any) => {
    if (val === null || val === undefined) return <span className="text-slate-300 font-normal italic">kosong</span>;
    if (typeof val === 'boolean') return val ? 'Ya' : 'Tidak';
    if (typeof val === 'object') return JSON.stringify(val);
    return String(val);
  };

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="grid grid-cols-12 gap-0 bg-slate-50 border-b border-slate-200 text-[10px] font-black text-slate-500 uppercase tracking-widest p-3">
        <div className="col-span-4 px-2">Nama Field</div>
        <div className="col-span-4 px-2 border-l border-slate-200">Nilai Lama</div>
        <div className="col-span-4 px-2 border-l border-slate-200">Nilai Baru</div>
      </div>
      
      <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto custom-scrollbar">
        {allKeys.map(key => {
          const oldVal = oldValues?.[key];
          const newVal = newValues?.[key];
          const isDifferent = JSON.stringify(oldVal) !== JSON.stringify(newVal);

          // Jika ini adalah penangkapan awal (CREATE), tampilkan sebagai baris tambahan
          if (!isDifferent && oldVal !== undefined) return null;

          return (
            <motion.div 
              key={key} 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className={`grid grid-cols-12 gap-0 py-3 px-3 items-center transition-colors hover:bg-slate-50/50 ${isDifferent ? 'bg-indigo-50/10' : ''}`}
            >
              <div className="col-span-4 px-2">
                <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded-md break-all">{key}</span>
              </div>
              
              <div className="col-span-4 px-2 border-l border-slate-100 min-h-[1.5rem] flex items-center">
                {oldVal === undefined || oldVal === null ? (
                  <span className="text-[10px] font-bold text-slate-400 italic flex items-center gap-1">
                    <Minus className="w-2 h-2" /> Data Baru
                  </span>
                ) : (
                  <span className="text-xs text-rose-500 line-through decoration-rose-300 break-words w-full">
                    {formatValue(oldVal)}
                  </span>
                )}
              </div>

              <div className="col-span-4 px-2 border-l border-slate-100 min-h-[1.5rem] flex items-center">
                {newVal === undefined || newVal === null ? (
                   <span className="text-[10px] font-bold text-rose-400 italic">Dihapus</span>
                ) : (
                  <div className="flex items-center gap-2 w-full">
                    {isDifferent && <ArrowRight className="w-3 h-3 text-indigo-300 flex-shrink-0" />}
                    <span className="text-xs text-emerald-600 font-bold break-words">
                      {formatValue(newVal)}
                    </span>
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
