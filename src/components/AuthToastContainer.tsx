import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  ShieldAlert, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowRight, 
  HelpCircle,
  KeyRound,
  UserX
} from 'lucide-react';

// ==========================================
// TYPES & INTERFACES DEFINITIONS
// ==========================================

export type AuthNotificationType = 'error' | 'warning' | 'success';

export interface AuthNotification {
  id: string;
  type: AuthNotificationType;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  duration?: number; // duration in ms, null/undefined means infinite/manual close
}

interface AuthNotificationContextType {
  notifications: AuthNotification[];
  triggerNotification: (notification: Omit<AuthNotification, 'id'>) => string;
  dismissNotification: (id: string) => void;
  handleAuthApiResponse: (status: number, data: any, onActivationClick?: () => void) => void;
}

// ==========================================
// REACT CONTEXT FOR STATE MANAGEMENT
// ==========================================

const AuthNotificationContext = createContext<AuthNotificationContextType | undefined>(undefined);

export const useAuthNotification = () => {
  const context = useContext(AuthNotificationContext);
  if (!context) {
    throw new Error('useAuthNotification must be used within an AuthNotificationProvider');
  }
  return context;
};

// ==========================================
// PROVIDER COMPONENT
// ==========================================

interface AuthNotificationProviderProps {
  children: React.ReactNode;
}

export const AuthNotificationProvider: React.FC<AuthNotificationProviderProps> = ({ children }) => {
  const [notifications, setNotifications] = useState<AuthNotification[]>([]);

  const dismissNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const triggerNotification = useCallback((notification: Omit<AuthNotification, 'id'>) => {
    const id = crypto.randomUUID();
    const newNotification: AuthNotification = {
      ...notification,
      id,
      duration: notification.duration ?? 6000, // Default duration to 6 seconds
    };

    setNotifications((prev) => [...prev, newNotification]);
    return id;
  }, []);

  // Safe API response interpreter mapping standard backend HTTP status codes to custom UI alerts
  const handleAuthApiResponse = useCallback((
    status: number, 
    payload: any, 
    onActivationClick?: () => void
  ) => {
    const message = payload?.message || 'Terjadi kesalahan sistem. Silakan coba sesaat lagi.';
    
    switch (status) {
      case 401:
      case 429:
        // Dynamic error message for incorrect credentials or account lockout
        triggerNotification({
          type: 'error',
          title: status === 429 ? 'Akun Terblokir' : 'Gagal Masuk',
          message: payload?.message || 'Kata sandi atau nama pengguna yang Anda masukkan salah. Silakan periksa kembali kredensial Anda.',
          duration: 7000
        });
        break;

      case 403:
        // Case 2: Akun Belum Aktif / Pending Approval (Kondisi Peringatan - Warning Alert)
        triggerNotification({
          type: 'warning',
          title: 'Akun Belum Aktif',
          message: payload?.message || 'Akun Anda belum aktif, silakan hubungi admin.',
          actionLabel: 'Lihat Instruksi Aktivasi',
          onAction: onActivationClick || (() => {
            console.log("Default activation instruction triggered");
          }),
          duration: 10000 // Show warning longer since it contains actionable buttons
        });
        break;

      case 201:
        // Case 3: Berhasil Daftar Akun Baru (Kondisi Sukses - Success Alert)
        triggerNotification({
          type: 'success',
          title: 'Pendaftaran Berhasil!',
          message: 'Akun Anda telah berhasil didaftarkan di platform LanPro. Silakan menunggu persetujuan admin untuk aktivasi.',
          duration: 8000
        });
        break;

      default:
        // Fallback dynamic error alert
        triggerNotification({
          type: 'error',
          title: 'Gagal Autentikasi',
          message,
          duration: 5000
        });
        break;
    }
  }, [triggerNotification]);

  return (
    <AuthNotificationContext.Provider 
      value={{ 
        notifications, 
        triggerNotification, 
        dismissNotification,
        handleAuthApiResponse 
      }}
    >
      {children}
      <AuthToastContainer 
        notifications={notifications} 
        onDismiss={dismissNotification} 
      />
    </AuthNotificationContext.Provider>
  );
};

// ==========================================
// PRESENTATIONAL COMPONENT: VELZON SWEETALERT MODAL CONTAINER
// ==========================================

interface AuthToastContainerProps {
  notifications: AuthNotification[];
  onDismiss: (id: string) => void;
}

export const AuthToastContainer: React.FC<AuthToastContainerProps> = ({ 
  notifications, 
  onDismiss 
}) => {
  if (notifications.length === 0) return null;
  const current = notifications[notifications.length - 1]; // Render latest alert

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <AnimatePresence mode="wait">
        <VelzonSweetAlertModal 
          key={current.id} 
          notification={current} 
          onDismiss={() => onDismiss(current.id)} 
        />
      </AnimatePresence>
    </div>
  );
};

// ==========================================
// VELZON ANIMATED SVG ICONS (DYNAMIC VELZON ANIMATIONS)
// ==========================================

export const VelzonSuccessIcon = () => (
  <motion.div 
    initial={{ scale: 0.2, rotate: -25, opacity: 0 }}
    animate={{ scale: [0.2, 1.15, 1], rotate: [-25, 5, 0], opacity: 1 }}
    transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
    className="w-28 h-28 mx-auto mb-3 relative flex items-center justify-center select-none"
  >
    {/* Soft Pulsing Ambient Background Glow */}
    <motion.div 
      animate={{ scale: [0.85, 1.2, 0.85], opacity: [0.25, 0.5, 0.25] }}
      transition={{ repeat: Number.POSITIVE_INFINITY, duration: 2.2, ease: "easeInOut" }}
      className="absolute inset-1 bg-emerald-400/20 rounded-full blur-lg"
    />

    <svg className="w-24 h-24 relative z-10 overflow-visible" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Streamer Ribbons (Continuous Sway & Wave Animation) */}
      <motion.path 
        d="M 52 26 C 44 14, 64 8, 72 18 C 78 26, 62 36, 75 46" 
        stroke="#405189" 
        strokeWidth="3.2" 
        strokeLinecap="round" 
        fill="none" 
        animate={{ 
          rotate: [-4, 6, -4],
          scale: [0.96, 1.04, 0.96],
          y: [-2, 2, -2]
        }}
        transition={{ repeat: Number.POSITIVE_INFINITY, duration: 2.4, ease: "easeInOut" }}
      />
      
      <motion.path 
        d="M 64 34 C 70 18, 86 20, 82 32 C 80 40, 94 36, 90 24" 
        stroke="#0ab39c" 
        strokeWidth="2.8" 
        strokeLinecap="round" 
        fill="none" 
        animate={{ 
          rotate: [5, -5, 5],
          y: [2, -3, 2]
        }}
        transition={{ repeat: Number.POSITIVE_INFINITY, duration: 2.1, ease: "easeInOut" }}
      />

      {/* Confetti Particles (Floating, Spinning & Scaling in Loop) */}
      <motion.circle 
        cx="40" 
        cy="20" 
        r="3.5" 
        fill="#405189" 
        animate={{ y: [-5, 5, -5], x: [-2, 2, -2], scale: [0.8, 1.25, 0.8] }} 
        transition={{ repeat: Number.POSITIVE_INFINITY, duration: 1.8, ease: "easeInOut" }} 
      />

      <motion.circle 
        cx="88" 
        cy="18" 
        r="3.2" 
        fill="#0ab39c" 
        animate={{ y: [4, -6, 4], x: [2, -2, 2], scale: [1, 1.3, 1] }} 
        transition={{ repeat: Number.POSITIVE_INFINITY, duration: 2.2, ease: "easeInOut" }} 
      />

      <motion.circle 
        cx="28" 
        cy="46" 
        r="2.8" 
        fill="#0ab39c" 
        animate={{ y: [-4, 4, -4], opacity: [0.6, 1, 0.6] }} 
        transition={{ repeat: Number.POSITIVE_INFINITY, duration: 1.9, ease: "easeInOut" }} 
      />

      <motion.rect 
        x="84" 
        y="36" 
        width="7" 
        height="3" 
        rx="1.5" 
        fill="#f06548" 
        animate={{ rotate: [15, 195, 375], y: [-3, 3, -3] }} 
        transition={{ repeat: Number.POSITIVE_INFINITY, duration: 2.8, ease: "linear" }} 
      />

      <motion.rect 
        x="30" 
        y="30" 
        width="8" 
        height="3" 
        rx="1.5" 
        fill="#f7b84b" 
        animate={{ rotate: [-30, 30, -30], scale: [0.9, 1.2, 0.9] }} 
        transition={{ repeat: Number.POSITIVE_INFINITY, duration: 2, ease: "easeInOut" }} 
      />

      <motion.path 
        d="M 54 14 Q 62 6 70 14" 
        stroke="#405189" 
        strokeWidth="2.5" 
        strokeLinecap="round" 
        fill="none" 
        animate={{ y: [-3, 3, -3], opacity: [0.7, 1, 0.7] }}
        transition={{ repeat: Number.POSITIVE_INFINITY, duration: 1.7, ease: "easeInOut" }}
      />

      {/* Main Party Cone (Tilting & Bouncing Continuous Loop) */}
      <motion.g
        animate={{ 
          rotate: [-4, 4, -4],
          y: [0, -3, 0]
        }}
        transition={{ repeat: Number.POSITIVE_INFINITY, duration: 2.2, ease: "easeInOut" }}
        style={{ transformOrigin: "58px 62px" }}
      >
        <path 
          d="M 34 82 L 56 42 Q 69 55 82 68 Z" 
          stroke="#0ab39c" 
          strokeWidth="4.5" 
          strokeLinejoin="round" 
          strokeLinecap="round"
          fill="none" 
        />
        <path 
          d="M 56 42 Q 69 55 82 68" 
          stroke="#0ab39c" 
          strokeWidth="4.5" 
          strokeLinecap="round" 
          fill="none" 
        />
      </motion.g>
    </svg>
  </motion.div>
);

export const VelzonErrorIcon = () => (
  <motion.div 
    initial={{ scale: 0.2, opacity: 0 }}
    animate={{ scale: [0.2, 1.18, 1], opacity: 1 }}
    transition={{ duration: 0.45, ease: [0.34, 1.56, 0.64, 1] }}
    className="w-28 h-28 mx-auto mb-3 relative flex items-center justify-center select-none"
  >
    {/* Pulsing Aura Ring Behind Warning Triangle */}
    <motion.div 
      animate={{ scale: [0.85, 1.25, 0.85], opacity: [0.2, 0.6, 0.2] }}
      transition={{ repeat: Number.POSITIVE_INFINITY, duration: 1.8, ease: "easeInOut" }}
      className="absolute inset-1 bg-rose-500/20 rounded-full blur-lg"
    />

    <svg className="w-24 h-24 relative z-10 overflow-visible" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Outer Coral Warning Triangle with Continuous Vigorous Shaking Loop */}
      <motion.g
        animate={{ 
          x: [0, -3.5, 3.5, -3.5, 3.5, -1.5, 1.5, 0],
          rotate: [0, -2.5, 2.5, -2.5, 2.5, -1, 1, 0]
        }}
        transition={{ repeat: Number.POSITIVE_INFINITY, duration: 1.8, repeatDelay: 0.6, ease: "easeInOut" }}
        style={{ transformOrigin: "60px 60px" }}
      >
        <path 
          d="M 60 18 L 102 88 Q 106 95 98 96 L 22 96 Q 14 95 18 88 Z" 
          stroke="#f06548" 
          strokeWidth="4.8" 
          strokeLinejoin="round" 
          strokeLinecap="round"
          fill="none" 
        />
      </motion.g>

      {/* Inside Yellow Exclamation Pill (Bouncing Drop Animation) */}
      <motion.path 
        d="M 60 40 L 60 66" 
        stroke="#f7b84b" 
        strokeWidth="7" 
        strokeLinecap="round"
        animate={{ 
          y: [-3, 2, -3]
        }}
        transition={{ repeat: Number.POSITIVE_INFINITY, duration: 1.3, ease: "easeInOut" }}
      />

      {/* Inside Yellow Exclamation Dot (Pulsing Flashing Dot) */}
      <motion.circle 
        cx="60" 
        cy="82" 
        r="4.8" 
        fill="#f7b84b" 
        animate={{ 
          scale: [1, 1.35, 1],
          opacity: [0.75, 1, 0.75]
        }}
        transition={{ repeat: Number.POSITIVE_INFINITY, duration: 1.3, ease: "easeInOut" }}
        style={{ transformOrigin: "60px 82px" }}
      />
    </svg>
  </motion.div>
);

export const VelzonWarningIcon = () => (
  <motion.div 
    initial={{ scale: 0.2, opacity: 0 }}
    animate={{ scale: [0.2, 1.15, 1], opacity: 1 }}
    transition={{ duration: 0.45, ease: [0.34, 1.56, 0.64, 1] }}
    className="w-28 h-28 mx-auto mb-3 relative flex items-center justify-center select-none"
  >
    {/* Amber Aura Ring */}
    <motion.div 
      animate={{ scale: [0.85, 1.2, 0.85], opacity: [0.2, 0.55, 0.2] }}
      transition={{ repeat: Number.POSITIVE_INFINITY, duration: 2, ease: "easeInOut" }}
      className="absolute inset-1 bg-amber-400/25 rounded-full blur-lg"
    />

    <svg className="w-24 h-24 relative z-10 overflow-visible" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <motion.g
        animate={{ 
          scale: [1, 1.03, 1],
          rotate: [-1.5, 1.5, -1.5]
        }}
        transition={{ repeat: Number.POSITIVE_INFINITY, duration: 2.2, ease: "easeInOut" }}
        style={{ transformOrigin: "60px 60px" }}
      >
        <path 
          d="M 60 16 L 102 36 V 68 C 102 90 60 104 60 104 C 60 104 18 90 18 68 V 36 Z" 
          stroke="#f7b84b" 
          strokeWidth="4.8" 
          strokeLinejoin="round" 
          strokeLinecap="round" 
          fill="none" 
        />
      </motion.g>

      <motion.path 
        d="M 60 40 L 60 66" 
        stroke="#f7b84b" 
        strokeWidth="6" 
        strokeLinecap="round" 
        animate={{ y: [-2, 2, -2] }}
        transition={{ repeat: Number.POSITIVE_INFINITY, duration: 1.5, ease: "easeInOut" }}
      />

      <motion.circle 
        cx="60" 
        cy="80" 
        r="4.5" 
        fill="#f7b84b" 
        animate={{ scale: [1, 1.3, 1] }}
        transition={{ repeat: Number.POSITIVE_INFINITY, duration: 1.5, ease: "easeInOut" }}
        style={{ transformOrigin: "60px 80px" }}
      />
    </svg>
  </motion.div>
);

// ==========================================
// SUB-COMPONENT: VELZON SWEETALERT MODAL CARD
// ==========================================

interface VelzonSweetAlertModalProps {
  notification: AuthNotification;
  onDismiss: () => void;
}

const VelzonSweetAlertModal: React.FC<VelzonSweetAlertModalProps> = ({ notification, onDismiss }) => {
  const { type, title, message, actionLabel, onAction, duration } = notification;

  // Auto Dismiss Timer if duration provided
  useEffect(() => {
    if (!duration) return;
    const timer = setTimeout(onDismiss, duration);
    return () => clearTimeout(timer);
  }, [duration, onDismiss]);

  const defaultTitles = {
    success: 'Well done !',
    error: 'Oops...! Something went Wrong !',
    warning: 'Akun Belum Aktif',
  };

  const defaultButtonLabels = {
    success: 'Back',
    error: 'Dismiss',
    warning: 'Dimengerti',
  };

  const displayTitle = title || defaultTitles[type];
  const displayBtnLabel = actionLabel || defaultButtonLabels[type];

  return (
    <motion.div
      initial={{ scale: 0.85, opacity: 0, y: 15 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      exit={{ scale: 0.85, opacity: 0, y: 15 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full text-center relative overflow-hidden font-sans border border-slate-100"
    >
      {/* Close X Button at Top Right */}
      <button 
        onClick={onDismiss}
        className="absolute top-4 right-4 text-slate-300 hover:text-slate-600 transition-colors p-1 rounded-md"
        title="Close"
      >
        <X className="w-5 h-5" />
      </button>

      {/* Velzon Center Animated Icon */}
      {type === 'success' && <VelzonSuccessIcon />}
      {type === 'error' && <VelzonErrorIcon />}
      {type === 'warning' && <VelzonWarningIcon />}

      {/* Main Title */}
      <h3 className="text-xl font-bold text-slate-800 tracking-tight mb-2">
        {displayTitle}
      </h3>

      {/* Message Body */}
      <p className="text-sm text-slate-500 font-normal leading-relaxed mb-6 px-2">
        {message}
      </p>

      {/* Primary Action Button */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => {
          if (onAction) onAction();
          onDismiss();
        }}
        className="px-8 py-2.5 bg-[#405189] hover:bg-[#364574] text-white rounded-md text-sm font-semibold shadow-md transition-all cursor-pointer min-w-[110px]"
      >
        {displayBtnLabel}
      </motion.button>
    </motion.div>
  );
};
