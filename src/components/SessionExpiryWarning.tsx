import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Clock, ShieldAlert, LogOut, RefreshCw, ChevronUp, ChevronDown, CheckCircle2, Play } from 'lucide-react';
import { toast } from 'sonner';
import { apiRequest, setAuthToken, getAuthToken } from '../lib/api';

interface SessionExpiryWarningProps {
  isLoggedIn: boolean;
  currentUser: any;
  onLogout: (silent?: boolean) => Promise<void>;
  onSessionExtended?: (newUser: any) => void;
}

// Client-side JWT Decoder
const parseJwt = (token: string) => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      window.atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
};

export const SessionExpiryWarning: React.FC<SessionExpiryWarningProps> = ({
  isLoggedIn,
  currentUser,
  onLogout,
  onSessionExtended,
}) => {
  const [realTimeLeft, setRealTimeLeft] = useState<number | null>(null);
  const [simulatedTimeLeft, setSimulatedTimeLeft] = useState<number | null>(null);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [isExtending, setIsExtending] = useState(false);

  // References to track simulation states
  const isSimulatingRef = useRef(false);
  const simulatedTimeLeftRef = useRef<number | null>(null);

  // Constants - warning triggers exactly 60 seconds before expiry
  const WARNING_THRESHOLD = 60; 

  // Format seconds to HH:MM:SS or MM:SS
  const formatTime = (totalSeconds: number) => {
    if (totalSeconds <= 0) return '00:00';
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;

    const pad = (num: number) => String(num).padStart(2, '0');

    if (h > 0) {
      return `${pad(h)}:${pad(m)}:${pad(s)}`;
    }
    return `${pad(m)}:${pad(s)}`;
  };

  // Centralized session extension action
  const handleExtendSession = async () => {
    if (isExtending) return;
    setIsExtending(true);
    const toastId = toast.loading('Memperpanjang sesi aktif Anda...');

    try {
      const data = await apiRequest('/api/auth/refresh', { method: 'POST' });
      if (data && data.status === 'success' && data.token) {
        setAuthToken(data.token);
        
        // Reset simulation states
        isSimulatingRef.current = false;
        setSimulatedTimeLeft(null);
        simulatedTimeLeftRef.current = null;
        
        // Re-read JWT to update the realTimeLeft state
        const decoded = parseJwt(data.token);
        if (decoded && decoded.exp) {
          const now = Math.floor(Date.now() / 1000);
          setRealTimeLeft(decoded.exp - now);
        }

        if (onSessionExtended && data.user) {
          onSessionExtended(data.user);
        }

        setShowWarningModal(false);
        setIsPopoverOpen(false);
        toast.success('Sesi Anda berhasil diperpanjang!', { id: toastId });
      } else {
        throw new Error(data?.message || 'Gagal memperbarui token');
      }
    } catch (err: any) {
      console.error('Session extension error:', err);
      toast.error(err.message || 'Gagal memperpanjang sesi. Silakan coba lagi.', { id: toastId });
    } finally {
      setIsExtending(false);
    }
  };

  // Handle auto logout when session expires
  const triggerAutoLogout = async () => {
    setShowWarningModal(false);
    setIsPopoverOpen(false);
    isSimulatingRef.current = false;
    setSimulatedTimeLeft(null);
    simulatedTimeLeftRef.current = null;
    toast.error('Sesi Anda telah berakhir untuk keamanan data. Silakan login kembali.', {
      duration: 5000,
    });
    await onLogout(true);
  };

  // Start simulated expiry warning for testing (60 seconds countdown)
  const startSimulation = () => {
    isSimulatingRef.current = true;
    simulatedTimeLeftRef.current = 60; // Start with 60 seconds countdown
    setSimulatedTimeLeft(60);
    setIsPopoverOpen(false);
    toast.success('Peringatan sesi berakhir disimulasikan (60 Detik)!', {
      description: 'Sesi akan berakhir otomatis jika Anda tidak merespons dalam 60 detik.',
    });
  };

  // Background timer loop (ticks every 1 second)
  useEffect(() => {
    if (!isLoggedIn) {
      setRealTimeLeft(null);
      setSimulatedTimeLeft(null);
      isSimulatingRef.current = false;
      simulatedTimeLeftRef.current = null;
      setShowWarningModal(false);
      return;
    }

    const interval = setInterval(() => {
      // 1. Handle SIMULATED timer if active
      if (isSimulatingRef.current && simulatedTimeLeftRef.current !== null) {
        const nextSimulated = simulatedTimeLeftRef.current - 1;
        simulatedTimeLeftRef.current = nextSimulated;
        setSimulatedTimeLeft(nextSimulated);

        if (nextSimulated <= 0) {
          clearInterval(interval);
          triggerAutoLogout();
        } else if (nextSimulated <= WARNING_THRESHOLD && !showWarningModal) {
          setShowWarningModal(true);
        }
        return;
      }

      // 2. Handle REAL token checks
      const token = getAuthToken();
      if (!token) {
        setRealTimeLeft(null);
        return;
      }

      const decoded = parseJwt(token);
      if (!decoded || !decoded.exp) {
        setRealTimeLeft(null);
        return;
      }

      const now = Math.floor(Date.now() / 1000);
      const timeLeft = decoded.exp - now;
      setRealTimeLeft(timeLeft);

      if (timeLeft <= 0) {
        clearInterval(interval);
        triggerAutoLogout();
      } else if (timeLeft <= WARNING_THRESHOLD) {
        setShowWarningModal(true);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isLoggedIn, showWarningModal]);

  if (!isLoggedIn) return null;

  // Choose display values (simulation takes precedence)
  const activeTimeLeft = isSimulatingRef.current ? simulatedTimeLeft : realTimeLeft;
  const isUrgent = activeTimeLeft !== null && activeTimeLeft <= WARNING_THRESHOLD;

  return (
    <>
      {/* 2. EXPRIY WARNING DIALOG (MODAL OVERLAY) */}
      <AnimatePresence>
        {showWarningModal && activeTimeLeft !== null && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            {/* Dark glass backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {}} // Non-dismissible on backdrop click for safety
              className="absolute inset-0 bg-slate-950/70 backdrop-blur-md"
            />

            {/* Modal Card */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden p-5 text-center"
            >
              {/* Alert Icon & Ring */}
              <div className="mx-auto w-16 h-16 bg-rose-50 border border-rose-100 rounded-full flex items-center justify-center mb-4 text-rose-500 relative">
                <ShieldAlert className="w-8 h-8 animate-pulse" />
                <span className="absolute inset-0 rounded-full border-2 border-rose-500/20 animate-ping" />
              </div>

              {/* Header Text */}
              <h3 className="text-xl font-extrabold text-slate-900 tracking-tight mb-2">
                Sesi Anda Hampir Berakhir!
              </h3>
              <p className="text-sm text-slate-500 px-2 mb-6">
                Sesi Anda akan otomatis ditutup demi keamanan akun. Simpan pekerjaan Anda atau perpanjang sesi untuk melanjutkan.
              </p>

              {/* Countdown Progress Card */}
              <div className="bg-slate-50 rounded-xl border border-slate-100 p-5 mb-6 relative">
                <div className="text-xs text-slate-400 font-semibold mb-1">OTOMATIS KELUAR DALAM</div>
                <div className="text-4xl font-black font-mono text-rose-500 tracking-wider">
                  {formatTime(activeTimeLeft)}
                </div>

                {/* Progress bar with dynamic color transitions */}
                <div className="w-full h-2.5 bg-slate-200 rounded-full mt-4 overflow-hidden relative">
                  <motion.div
                    initial={{ width: '100%' }}
                    animate={{ width: `${(activeTimeLeft / WARNING_THRESHOLD) * 100}%` }}
                    transition={{ ease: 'linear', duration: 1 }}
                    className={`h-full rounded-full transition-colors duration-500 ${
                      activeTimeLeft > 30 ? 'bg-amber-500' : 'bg-rose-500 animate-pulse'
                    }`}
                  />
                </div>
                
                {/* Progress helper indicators */}
                <div className="flex justify-between items-center mt-2 text-[10px] text-slate-400 font-bold">
                  <span>60 DETIK</span>
                  <span className={`${activeTimeLeft > 30 ? 'text-amber-500' : 'text-rose-500 animate-pulse'}`}>
                    {Math.round((activeTimeLeft / WARNING_THRESHOLD) * 100)}% SISA WAKTU
                  </span>
                  <span>0 DETIK</span>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex flex-col gap-2.5">
                <button
                  onClick={handleExtendSession}
                  disabled={isExtending}
                  className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-xl text-sm font-bold tracking-wide shadow-lg shadow-indigo-600/10 hover:shadow-indigo-600/20 active:scale-[0.99] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <RefreshCw className={`w-4 h-4 ${isExtending ? 'animate-spin' : ''}`} />
                  Perpanjang Sesi Aktif
                </button>

                <button
                  onClick={() => onLogout(false)}
                  className="w-full py-3.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-sm font-bold active:scale-[0.99] transition-all"
                >
                  Keluar Sekarang
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
