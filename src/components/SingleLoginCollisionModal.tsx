import React from 'react';
import { AlertTriangle, LogOut, X, Monitor, Globe, Activity } from 'lucide-react';

interface ActiveSessionData {
  ip: string;
  browser: string;
  device: string;
}

interface Props {
  isOpen: boolean;
  activeSession: ActiveSessionData | null;
  onClose: () => void;
  onForceLogout: () => void;
  isLoading: boolean;
}

export const SingleLoginCollisionModal: React.FC<Props> = ({
  isOpen,
  activeSession,
  onClose,
  onForceLogout,
  isLoading
}) => {
  if (!isOpen || !activeSession) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col animate-in zoom-in-95 duration-200">
        <div className="bg-rose-50/50 p-6 flex flex-col items-center justify-center border-b border-slate-100 relative">
          <button 
            onClick={onClose}
            disabled={isLoading}
            className="absolute top-4 right-4 p-2 bg-white rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors shadow-sm disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="w-16 h-16 bg-white rounded-full shadow-sm border border-rose-100 flex items-center justify-center mb-4 relative">
            <div className="absolute inset-0 rounded-full border-2 border-rose-400 border-t-transparent animate-spin opacity-20"></div>
            <AlertTriangle className="w-8 h-8 text-rose-500" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 text-center">Akun Anda Masih Aktif</h2>
          <p className="text-sm text-slate-500 text-center mt-2 max-w-[280px]">
            Sistem mendeteksi bahwa akun ini sedang digunakan di perangkat atau browser lain.
          </p>
        </div>

        <div className="p-6">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Activity className="w-4 h-4 text-emerald-500" />
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Sesi Aktif Saat Ini</span>
            </div>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Globe className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] text-slate-400 font-semibold uppercase">IP Address</div>
                  <div className="text-sm font-medium text-slate-700 truncate">{activeSession?.ip || "Tidak diketahui"}</div>
                </div>
              </div>
              <div className="h-px bg-slate-200 w-full" />
              <div className="flex items-start gap-3">
                <Monitor className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] text-slate-400 font-semibold uppercase">Perangkat & Browser</div>
                  <div className="text-sm font-medium text-slate-700 truncate">{activeSession?.device || "Perangkat Tidak Diketahui"}</div>
                  <div className="text-xs text-slate-500 truncate">{activeSession?.browser || "Browser Tidak Diketahui"}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 px-4 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl font-semibold text-sm hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              Batalkan
            </button>
            <button
              onClick={onForceLogout}
              disabled={isLoading}
              className="flex-1 px-4 py-2.5 bg-rose-500 text-white rounded-xl font-semibold text-sm hover:bg-rose-600 transition-colors shadow-sm shadow-rose-200 flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <LogOut className="w-4 h-4" />
              )}
              Force Logout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
