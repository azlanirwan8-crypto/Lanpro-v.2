import React, { useRef, useEffect } from "react";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";

// --- Utils ---
export const cn = (...classes: any[]) => classes.filter(Boolean).join(" ");

export const ensureDate = (dateValue: any): Date => {
  if (!dateValue) return new Date();
  if (dateValue instanceof Date) {
    return isNaN(dateValue.getTime()) ? new Date() : dateValue;
  }
  if (dateValue && typeof dateValue.toDate === "function") {
    const d = dateValue.toDate();
    return isNaN(d.getTime()) ? new Date() : d;
  }
  const d = new Date(dateValue);
  return isNaN(d.getTime()) ? new Date() : d;
};

export const safeFormat = (
  dateValue: any,
  formatStr: string,
  fallback: string = "-",
) => {
  try {
    const d = ensureDate(dateValue);
    if (!dateValue || isNaN(d.getTime())) return fallback;
    return format(d, formatStr);
  } catch (e) {
    return fallback;
  }
};

// --- Components ---
export const TimelineDatePills = ({
  task,
  minDate,
  totalDays,
  interaction,
  tempDates,
}: {
  task: Task;
  minDate: Date;
  totalDays: number;
  interaction: any;
  tempDates: any;
}) => {
  const dates = tempDates[task.id] || {
    startDate: task.startDate,
    endDate: task.endDate,
  };
  if (!dates.startDate || !dates.endDate) return null;

  const start = ensureDate(dates.startDate);
  const end = ensureDate(dates.endDate);
  const duration = differenceInDays(end, start) + 1;

  return (
    <>
      <div className="absolute -left-1 transform -translate-x-full pr-2 top-1/2 -translate-y-1/2 whitespace-nowrap z-50 pointer-events-none">
        <div className="bg-slate-900/90 text-[10px] font-bold text-white px-2 py-1 rounded shadow-lg backdrop-blur-sm border border-slate-700/50 flex items-center gap-1.5 animate-in fade-in slide-in-from-right-1">
          <Calendar className="w-2.5 h-2.5 text-slate-400" />
          {format(start, "MMM d, yyyy")}
        </div>
      </div>
      <div className="absolute -right-1 transform translate-x-full pl-2 top-1/2 -translate-y-1/2 whitespace-nowrap z-50 pointer-events-none">
        <div className="bg-slate-900/90 text-[10px] font-bold text-white px-2 py-1 rounded shadow-lg backdrop-blur-sm border border-slate-700/50 flex items-center gap-1.5 animate-in fade-in slide-in-from-left-1">
          <Calendar className="w-2.5 h-2.5 text-slate-400" />
          {format(end, "MMM d, yyyy")}
          <span className="text-slate-400 font-normal">
            ({duration} {duration === 1 ? "day" : "days"})
          </span>
        </div>
      </div>
    </>
  );
};

// --- Components ---
export const Button = ({
  children,
  onClick,
  variant = "primary",
  className = "",
  disabled = false,
  size = "md",
}: any) => {
  const base =
    "rounded-lg font-medium transition-all flex items-center gap-2 disabled:opacity-50";
  const sizes: any = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base",
  };
  const variants: any = {
    primary: "bg-blue-600 text-white hover:bg-blue-700",
    secondary: "bg-gray-100 text-gray-700 hover:bg-gray-200",
    danger: "bg-red-100 text-red-600 hover:bg-red-200",
    ghost: "text-gray-600 hover:bg-gray-100",
  };
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled}
    >
      {children}
    </button>
  );
};

export const Input = ({
  value,
  onChange,
  placeholder,
  type = "text",
  className = "",
  ...props
}: any) => (
  <input
    type={type}
    value={value ?? ""}
    onChange={onChange}
    placeholder={placeholder}
    className={`w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all ${className}`}
    {...props}
  />
);

export const Textarea = ({
  value,
  onChange,
  placeholder,
  className = "",
  rows = 3,
}: any) => (
  <textarea
    value={value ?? ""}
    onChange={onChange}
    placeholder={placeholder}
    rows={rows}
    className={`w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none ${className}`}
  />
);

// --- Error Handling ---

class ErrorBoundary extends React.Component<any, any> {
  constructor(props: any) {
    super(props);
    (this as any).state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    const error = (this as any).state.error;
    if ((this as any).state.hasError) {
      let message = "Something went wrong. Please try refreshing the page.";
      try {
        const errObj = JSON.parse(error.message);
        if (
          errObj.error.includes("permission-denied") ||
          errObj.error.includes("Missing or insufficient permissions")
        ) {
          message =
            "You don't have permission to perform this action. Please check your project access.";
        }
      } catch (e) {
        // Not a JSON error
      }
      return (
        <div className="h-screen flex flex-col items-center justify-center bg-gray-50 p-4 text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Oops! An error occurred
          </h2>
          <p className="text-gray-600 mb-6 max-w-md">{message}</p>
          <Button onClick={() => window.location.reload()}>Refresh Page</Button>
        </div>
      );
    }

    return (this as any).props.children;
  }
}

export const GoogleIcon = () => (
  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
  </svg>
);

export const VelzonFloatingParticles = () => {
  const particles = useMemo(() => {
    return Array.from({ length: 40 }).map((_, i) => ({
      id: i,
      size: Math.floor(Math.random() * 5) + 3, // 3px to 8px
      left: `${(i * 2.4 + Math.random() * 3) % 98}%`,
      duration: Math.random() * 8 + 6, // 6s to 14s
      delay: Math.random() * 6,
      opacity: Math.random() * 0.7 + 0.25,
      drift: Math.random() * 40 - 20,
    }));
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-white shadow-[0_0_12px_rgba(255,255,255,0.9)]"
          style={{
            width: p.size,
            height: p.size,
            left: p.left,
            bottom: "-20px",
          }}
          animate={{
            y: ["0vh", "-115vh"],
            x: [0, p.drift, 0],
            opacity: [0, p.opacity, p.opacity, 0],
            scale: [0.6, 1.2, 0.8],
          }}
          transition={{
            duration: p.duration,
            repeat: Number.POSITIVE_INFINITY,
            delay: p.delay,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
};


