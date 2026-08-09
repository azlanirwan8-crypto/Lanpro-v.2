import React from 'react';
import { Activity, Globe } from 'lucide-react';
import { usePresence } from '../contexts/PresenceContext';

export const HeaderNetworkStatus: React.FC<{
  latencyStatus: string;
  latencyText: string;
  selectedProjectKey: string;
}> = ({ latencyStatus, latencyText, selectedProjectKey }) => {
  const { onlineUsers } = usePresence();

  return (
    <>
      <div className="flex items-center gap-2">
        <span className="flex h-2 w-2 relative">
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${latencyStatus === 'good' ? 'bg-emerald-400' : latencyStatus === 'warning' ? 'bg-amber-400' : latencyStatus === 'poor' ? 'bg-rose-400' : 'bg-slate-400'}`}></span>
          <span className={`relative inline-flex rounded-full h-2 w-2 ${latencyStatus === 'good' ? 'bg-emerald-500' : latencyStatus === 'warning' ? 'bg-amber-500' : latencyStatus === 'poor' ? 'bg-rose-500' : 'bg-slate-500'}`}></span>
        </span>
        <span className={`text-xs font-bold ${latencyStatus === 'good' ? 'text-emerald-700' : latencyStatus === 'warning' ? 'text-amber-700' : latencyStatus === 'poor' ? 'text-rose-700' : 'text-slate-500'}`}>
          {latencyText}
        </span>
        {latencyStatus === 'good' && (
          <span className="text-[9px] bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded font-black tracking-wider">Cepat</span>
        )}
        {latencyStatus === 'warning' && (
          <span className="text-[9px] bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded font-black tracking-wider">Sedang</span>
        )}
        {latencyStatus === 'poor' && (
          <span className="text-[9px] bg-rose-50 text-rose-600 px-1.5 py-0.5 rounded font-black tracking-wider">Lambat</span>
        )}
        {latencyStatus === 'offline' && (
          <span className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-black tracking-wider">Offline</span>
        )}
      </div>

      <div className="h-3 w-px bg-slate-200" />

      <div className="flex items-center gap-1.5">
        <Activity className="w-3.5 h-3.5 text-indigo-500 animate-pulse" />
        <span className="text-slate-500">Realtime:</span>
        <span className="text-indigo-600 font-extrabold">{onlineUsers.length > 0 ? `${onlineUsers.length} Kolaborator` : 'Aktif'}</span>
      </div>

      <div className="hidden sm:flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <Globe className="w-3.5 h-3.5 text-slate-400" />
          <span>Proyek: <strong className="text-slate-700">{selectedProjectKey}</strong></span>
        </div>
        <div className="h-3 w-px bg-slate-200" />
        <span className="text-[9px] text-slate-400 font-bold">v1.6 Live Ready</span>
      </div>
    </>
  );
};
