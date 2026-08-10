import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import React, { useState, useEffect, useRef, useMemo } from "react";
import io from "socket.io-client";

import {
  Project,
  Task,
  Sprint,
  UserProfile,
  MasterData,
  Comment,
  Attachment,
  ActivityLog,
  LinkedTask,
  AppRole,
  UserPermissions,
  ModulePermission,
  AppNotification,
} from "./types";
import {
  getUserPermissions,
  hasPermission,
  DEFAULT_PERMISSIONS,
} from "./lib/permissions";
import { validateFileClient } from "./lib/fileSecurity";
import { registrationSchema, evaluatePasswordStrength } from "./lib/registrationSchema";
import { useAppStore } from "./store/useAppStore";
import { CacheManager } from "./lib/cache";
import { useMasterData } from "./hooks/useMasterData";
import { MeetingNotes } from "./features/meeting-notes/MeetingNotes";
import { WikiView } from "./features/wiki";
import { NotebookLM } from "./features/notebook-lm";
import { DashboardView } from "./features/dashboard";
import { IssueListView, TaskDetailModal } from "./features/issues";
import { UserDetailView } from "./features/users/UserDetailView";
import { PlanningView } from "./features/planning";
import { BoardView } from "./features/kanban";
import { Sidebar } from "./features/sidebar";
import { TimelinePanel } from "./features/timeline/index";
import { AdminUserPanel } from "./features/users";
import { MasterDataPanel } from "./features/master/MasterDataPanel";
import { TeamManagementPanel } from "./features/team/TeamManagementPanel";
import { ActivityLogPanel } from "./features/activity/ActivityLogPanel";
import { DbExplorerPanel } from "./features/explorer/DbExplorerPanel";
import { FlowchartView } from "./features/flowchart";
import { TestQAPanel } from "./features/qa/TestQAPanel";
import { SettingsPage } from "./features/settings/SettingsPage";
import { LiveChatWidget } from "./components/LiveChatWidget";
import { PresenceProvider } from "./contexts/PresenceContext";
import { HeaderAvatarGroup } from "./components/HeaderAvatarGroup";
import { VelzonSuccessIcon } from "./components/AuthToastContainer";
import { SingleLoginCollisionModal } from "./components/SingleLoginCollisionModal";
import { HeaderNetworkStatus } from "./components/HeaderNetworkStatus";
import { googleSignIn } from "./lib/firebase";
import { apiRequest, ApiError, setAuthToken, clearAuthToken, getAuthToken } from "./lib/api";
import { SessionExpiryWarning } from "./components/SessionExpiryWarning";
import { GlobalSkeleton } from "./components/GlobalSkeleton";
import { RateLimitIndicator } from "./components/RateLimitIndicator";
import { EnterpriseAuditDashboard } from "./features/enterprise-audit/EnterpriseAuditDashboard";
import { AppRoutes } from "./routes/AppRoutes";
import { StatusSelect, PrioritySelect } from "./components/ui/StatusSelect";
import { IssueTypeDropdown } from "./components/ui/IssueTypeDropdown";
import { UserAvatar, getUserAvatarColors } from "./components/ui/UserAvatar";
import { RenderIcon, AVAILABLE_ICONS } from "./components/RenderIcon";
import {
  PriorityIcon,
  TypeIcon,
  StyledDropdown,
  UserBadge,
} from "./components/ui/CommonComponents";

import {
  ChevronRight,
  ChevronLeft,
  MoreVertical,
  Trash2,
  Edit2,
  Calendar,
  X,
  CheckCircle2,
  Clock,
  AlertCircle,
  AlertTriangle,
  LayoutDashboard,
  FolderKanban,
  Eye,
  EyeOff,
  Edit3,
  Layers,
  ListTree,
  ShieldAlert,
  ExternalLink,
  Database,
  Zap,
  ChevronDown,
  Share2,
  Filter,
  UserCircle,
  CircleDot,
  Target,
  Copy,
  Mail,
  Check,
  ArrowRight,
  ArrowUpDown,
  History,
  MessageSquare,
  Paperclip,
  UserPlus,
  Equal,
  ChevronsUp,
  ChevronUp,
  ChevronsDown,
  MinusCircle,
  Briefcase,
  UserSquare,
  Network,
  MapPin,
  LayoutGrid,
  List,
  PieChart as PieChartIcon,
  BarChart3,
  MoreHorizontal,
  Layout,
  Figma,
  Bug,
  Flag,
  Bookmark,
  Shield,
  ShieldCheck,
  Star,
  ZapOff,
  UserCog,
  Wrench,
  ToggleLeft,
  Timer,
  Terminal,
  Tag,
  Trello,
  Trash,
  Ticket,
  Save,
  ThumbsUp,
  Table,
  Sword,
  Sun,
  Smartphone,
  Share,
  Send,
  SearchCode,
  Search,
  Scissors,
  Rocket,
  Rewind,
  Repeat,
  RefreshCw,
  Recycle,
  Radio,
  Quote,
  Printer,
  Play,
  Plane,
  PieChart as PieIcon,
  Phone,
  Percent,
  PenTool,
  Pause,
  Package,
  Kanban,
  Orbit,
  Option,
  Octagon,
  Navigation,
  Music,
  MousePointer,
  Mountain,
  Moon,
  Monitor,
  Mic,
  MessageCircle,
  Menu,
  Megaphone,
  Maximize,
  Map as MapIcon,
  ListTodo,
  Loader,
  Loader2,
  Link as LinkIcon,
  LifeBuoy,
  Library,
  Laptop,
  Key,
  Info,
  Infinity,
  Inbox,
  Image,
  Home,
  Heart,
  Headphones,
  Hash,
  Hand,
  Hammer,
  Gift,
  Ghost,
  Gamepad,
  Fuel,
  Folder,
  FlaskConical,
  Flame,
  FileText,
  Eraser,
  Download,
  Dna,
  Disc,
  Diamond,
  Database as DBIcon,
  Crown,
  CreditCard,
  Cpu,
  Compass,
  Command,
  Cloud,
  Clipboard,
  Circle,
  Chrome,
  CheckSquare,
  Camera,
  Book,
  Bolt,
  Bluetooth,
  Bell,
  Battery,
  Award,
  AtSign,
  Archive,
  Anchor,
  Activity,
  Airplay,
  Coffee,
  Globe,
  AlarmClock,
  AlignCenter,
  Aperture,
  AppWindow,
  Apple,
  Armchair,
  Baby,
  Ban,
  BatteryCharging,
  BellOff,
  Braces,
  Calculator,
  Cast,
  ChevronsLeft,
  ChevronsRight,
  ClipboardCheck,
  ClipboardList,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudMoon,
  CloudRain,
  CloudSnow,
  CloudSun,
  Code2,
  Coins,
  Cookie,
  Crosshair,
  Dribbble,
  Droplet,
  Dumbbell,
  Egg,
  Fan,
  FastForward,
  Feather,
  FileCode,
  FileJson,
  FileSearch,
  Fingerprint,
  Fish,
  FolderOpen,
  FolderPlus,
  Footprints,
  Frown,
  GanttChart,
  Gauge,
  Glasses,
  GraduationCap,
  HardDrive,
  Headset,
  IceCream,
  Languages,
  Lightbulb,
  Link2Off,
  Locate,
  LocateFixed,
  LogIn,
  MailOpen,
  Microscope,
  Milestone,
  Mouse,
  Music2,
  Nut,
  Palmtree,
  PartyPopper,
  PauseCircle,
  Pencil,
  PiggyBank,
  Plug,
  PlusCircle,
  Power,
  Puzzle,
  QrCode,
  Radar,
  Radiation,
  Rat,
  Receipt,
  RotateCcw,
  Route,
  Rss,
  Scale,
  Scan,
  School,
  ShieldQuestion,
  Shirt,
  ShoppingBag,
  ShoppingCart,
  Shovel,
  ShowerHead,
  Shrink,
  Shuffle,
  Sigma,
  Signal,
  Siren,
  SkipBack,
  SkipForward,
  Skull,
  Slack,
  Slash,
  Smile,
  Snowflake,
  Sofa,
  Speaker,
  Sprout,
  Square,
  Stamp,
  Stethoscope,
  Sticker,
  StickyNote,
  StopCircle,
  SunMoon,
  Sunrise,
  Sunset,
  Tablet,
  Tent,
  Thermometer,
  ThumbsDown,
  Tornado,
  ToyBrick,
  Train,
  TramFront,
  TreeDeciduous,
  TreePine,
  Trees,
  Truck,
  Tv,
  Tv2,
  Type,
  Umbrella,
  Underline,
  Unlock,
  Upload,
  UploadCloud,
  Usb,
  UserCheck,
  UserMinus,
  Variable,
  Vibrate,
  Video,
  VideoOff,
  View,
  Voicemail,
  Volume,
  Volume1,
  Volume2,
  VolumeX,
  Wallet,
  Wand,
  Watch,
  Waves,
  Webcam,
  Webhook,
  Wheat,
  WholeWord,
  Wifi,
  Wind,
  Wine,
  Workflow,
  XCircle,
  XOctagon,
  XSquare,
  Youtube,
  Sparkles,
  Plus,
  Grid,
  Box,
  HardHat,
  Construction,
  Settings2,
  BugPlay,
  FlaskRound,
  TestTube,
  Beaker,
  HeartPulse,
  Syringe,
  Pill,
  Atom,
  Binary,
  Flower2,
  Maximize2,
  Minimize2,
  DownloadCloud,
  FileCheck,
  FileWarning,
  HelpCircle,
  BarChart2,
  Presentation,
  MousePointer2,
  Keyboard,
  Server,
  TerminalSquare,
  Shell,
  Undo2,
  Redo2,
  Repeat2,
  Clock3,
  FileDigit,
  Contact,
  Building,
  Trophy,
  Medal,
  Gem,
  Bitcoin,
  Euro,
  PoundSterling,
  IndianRupee,
  JapaneseYen,
  UserX,
  Verified,
  Focus,
  ThermometerSnowflake,
  CloudHail,
  HandMetal,
  Dices,
  Brain,
  Pointer,
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  FilePlus,
  MessageSquarePlus,
  UserPlus2,
  FileUp,
  Unlink,
  Lock as LockIcon,
  Link2 as Link2Icon,
  BellRing,
  RefreshCcw,
  PlusSquare,
  PackageOpen,
  Users,
  LogOut,
  Settings,
} from "lucide-react";
import { Toaster, toast } from "sonner";
import { useAuthNotification } from "./components/AuthToastContainer";
import { motion, AnimatePresence } from "motion/react";
import {
  format,
  isSameDay,
  isToday,
  differenceInDays,
  addDays,
  subDays,
  eachDayOfInterval,
  startOfMonth,
  endOfMonth,
  isSameMonth,
  eachMonthOfInterval,
  formatDistanceToNow,
  startOfWeek,
  endOfWeek,
  eachWeekOfInterval,
  startOfYear,
  endOfYear,
  eachYearOfInterval,
} from "date-fns";
import { id } from "date-fns/locale";
import {
  DragDropContext,
  Droppable as _Droppable,
  Draggable as _Draggable,
} from "@hello-pangea/dnd";
import { Modal } from "./components/ui/Modal";
import { ConfirmationModal } from "./components/ui/ConfirmationModal";
import { formatNotification } from "./utils/notificationFormatter";

const Droppable = _Droppable as any;
const Draggable = _Draggable as any;

const chunkArray = <T,>(arr: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  if (!arr) return chunks;
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
};

// --- Recharts ---
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  LineChart,
  Line,
} from "recharts";

// --- Utils ---
const cn = (...classes: any[]) => classes.filter(Boolean).join(" ");

const ensureDate = (dateValue: any): Date => {
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

const safeFormat = (
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
const TimelineDatePills = ({
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
const Button = ({
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

const Input = ({
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

const Textarea = ({
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

const GoogleIcon = () => (
  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
  </svg>
);

const VelzonFloatingParticles = () => {
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

const AuthHeroPanel = () => (
  <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-[#364574] via-[#405189] to-[#212529] items-center justify-center p-8 xl:p-12 select-none min-h-screen z-10 overflow-hidden">
    {/* Floating White Particles Effect */}
    <VelzonFloatingParticles />

    {/* Subtle Ambient Mesh Gradient */}
    <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
      <div className="absolute top-[-15%] right-[-10%] w-[60%] h-[60%] bg-indigo-500/30 rounded-full blur-[140px] animate-pulse" />
      <div className="absolute bottom-[-15%] left-[-10%] w-[60%] h-[60%] bg-cyan-400/20 rounded-full blur-[140px]" />
      <div className="absolute top-[35%] left-[15%] w-[45%] h-[45%] bg-blue-600/20 rounded-full blur-[130px]" />
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10" />
    </div>

    {/* Organic S-Curve Wave Divider Overlay */}
    <svg
      className="absolute top-0 -right-[79px] xl:-right-[119px] h-full w-[80px] xl:w-[120px] pointer-events-none z-20 drop-shadow-[8px_0_16px_rgba(0,0,0,0.3)]"
      viewBox="0 0 120 1000"
      preserveAspectRatio="none"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="wave-glow" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#818cf8" stopOpacity="0.9" />
          <stop offset="50%" stopColor="#06b6d4" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#a855f7" stopOpacity="0.9" />
        </linearGradient>
        <filter id="glow-shadow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Solid S-Curve Fill matching Velzon #405189 */}
      <path
        d="M 0 0 C 85 200, 115 380, 55 520 C -5 660, 80 840, 0 1000 L 0 0 Z"
        fill="#405189"
      />

      {/* Glowing Border Accent along the S-Curve Edge */}
      <path
        d="M 0 0 C 85 200, 115 380, 55 520 C -5 660, 80 840, 0 1000"
        fill="none"
        stroke="url(#wave-glow)"
        strokeWidth="3"
        filter="url(#glow-shadow)"
        vectorEffect="non-scaling-stroke"
      />
    </svg>

    <div className="relative z-10 max-w-lg w-full text-center pr-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        <h1 className="text-6xl font-black text-white leading-[0.9] tracking-tighter drop-shadow-md">
          LAN <span className="text-amber-400">PRO</span>
        </h1>
        <p className="text-xs font-semibold text-slate-200 mt-3 tracking-widest uppercase">
          Project Management Platform
        </p>
      </motion.div>
    </div>
  </div>
);

const AuthWatermarkPattern = () => (
  <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden opacity-3 lg:opacity-[0.04] select-none">
    <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 900" preserveAspectRatio="none">
      <g stroke="#0f172a" strokeWidth="1.5" fill="none">
        {/* Kanban Wireframe Columns */}
        <rect x="60" y="80" width="200" height="340" rx="14" strokeDasharray="6 6" />
        <rect x="290" y="80" width="200" height="440" rx="14" />
        <rect x="520" y="80" width="200" height="300" rx="14" strokeDasharray="6 6" />
        
        {/* Kanban Task Cards */}
        <rect x="80" y="110" width="160" height="75" rx="8" fill="#0f172a" fillOpacity="0.04" />
        <rect x="80" y="200" width="160" height="95" rx="8" fill="#0f172a" fillOpacity="0.04" />
        
        <rect x="310" y="110" width="160" height="85" rx="8" fill="#0f172a" fillOpacity="0.06" />
        <rect x="310" y="215" width="160" height="120" rx="8" fill="#0f172a" fillOpacity="0.06" />
        <rect x="310" y="350" width="160" height="85" rx="8" fill="#0f172a" fillOpacity="0.06" />

        <rect x="540" y="110" width="160" height="110" rx="8" fill="#0f172a" fillOpacity="0.04" />
        <rect x="540" y="240" width="160" height="75" rx="8" fill="#0f172a" fillOpacity="0.04" />

        {/* Sprint Velocity & Network Connection Curves */}
        <path d="M 80 620 Q 240 520 400 640 T 720 540 T 820 480" strokeWidth="3" stroke="#6366f1" />
        <path d="M 80 700 L 260 580 L 440 660 L 620 520 L 800 600" strokeWidth="2" strokeDasharray="5 5" stroke="#06b6d4" />
        
        {/* Nodes */}
        <circle cx="80" cy="620" r="7" fill="#6366f1" />
        <circle cx="400" cy="640" r="9" fill="#6366f1" />
        <circle cx="720" cy="540" r="7" fill="#6366f1" />
        <circle cx="820" cy="480" r="8" fill="#6366f1" />

        <circle cx="80" cy="700" r="6" fill="#06b6d4" />
        <circle cx="260" cy="580" r="6" fill="#06b6d4" />
        <circle cx="440" cy="660" r="6" fill="#06b6d4" />
        <circle cx="620" cy="520" r="6" fill="#06b6d4" />
        <circle cx="800" cy="600" r="6" fill="#06b6d4" />
      </g>
      <text x="750" y="850" fontSize="13" fontWeight="900" fill="#0f172a" opacity="0.25" fontFamily="sans-serif" textAnchor="end" letterSpacing="2">LANPRO AGILE WORKSPACE</text>
    </svg>
  </div>
);

const RegisterScreen = ({
  onRegister,
  onBackToLogin,
}: {
  onRegister: (u: string, p: string, n: string, e: string) => Promise<any>;
  onBackToLogin: () => void;
}) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  
  // Validation errors
  const [fieldErrors, setFieldErrors] = useState<{
    name?: string;
    email?: string;
    username?: string;
    password?: string;
  }>({});

  // Success Modal state
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Evaluate password strength
  const passStrength = useMemo(() => evaluatePasswordStrength(password), [password]);

  const handleNameChange = (val: string) => {
    if (val.length > 25) return;
    setName(val);
    if (fieldErrors.name) setFieldErrors(prev => ({ ...prev, name: undefined }));
  };

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    // Allow only alphabetic letters
    const filteredVal = rawVal.replace(/[^a-zA-Z]/g, "").slice(0, 10);
    
    if (rawVal !== filteredVal) {
      setFieldErrors(prev => ({ ...prev, username: "Username hanya boleh berupa huruf" }));
    } else if (filteredVal.length > 10) {
      setFieldErrors(prev => ({ ...prev, username: "Username maksimal 10 karakter" }));
    } else {
      setFieldErrors(prev => ({ ...prev, username: undefined }));
    }
    setUsername(filteredVal);
  };

  const handleEmailChange = (val: string) => {
    setEmail(val);
    if (fieldErrors.email) setFieldErrors(prev => ({ ...prev, email: undefined }));
  };

  const handlePasswordChange = (val: string) => {
    setPassword(val);
    if (fieldErrors.password) setFieldErrors(prev => ({ ...prev, password: undefined }));
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});

    // Client-side Zod validation
    const result = registrationSchema.safeParse({ name, email, username, password });
    if (!result.success) {
      const formattedErrors: Record<string, string> = {};
      result.error.issues.forEach((err) => {
        if (err.path[0]) {
          formattedErrors[err.path[0] as string] = err.message;
        }
      });
      setFieldErrors(formattedErrors);
      return;
    }

    if (isRegistering) return;
    setIsRegistering(true);
    try {
      const res = await onRegister(username, password, name, email);
      if (res && res.success) {
        setShowSuccessModal(true);
      }
    } finally {
      setIsRegistering(false);
    }
  };

  const handleSuccessModalConfirm = () => {
    setShowSuccessModal(false);
    setName("");
    setEmail("");
    setUsername("");
    setPassword("");
    setFieldErrors({});
    onBackToLogin();
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.25 }}
      className="w-full max-w-md space-y-6 mx-auto relative z-10 font-sans"
    >
      <div className="space-y-1.5">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">
            Create Account
          </h2>
          <p className="text-slate-500 text-xs font-semibold mt-1">
            Join LanPro to manage projects and workflows
          </p>
        </motion.div>
      </div>

      <form className="space-y-3.5" onSubmit={handleRegisterSubmit}>
        {/* FULL NAME INPUT */}
        <div className="space-y-1">
          <label className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider ml-0.5">
            Full Name <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            maxLength={25}
            required
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="John Doe"
            className={cn(
              "w-full px-4 py-3 bg-slate-50 border rounded-xl focus:bg-white focus:ring-2 transition-all outline-none text-sm font-semibold text-slate-900 placeholder:text-slate-400",
              fieldErrors.name ? "border-rose-400 focus:ring-rose-500/20 focus:border-rose-600" : "border-slate-200 focus:ring-[#405189]/20 focus:border-[#405189]"
            )}
          />
          {fieldErrors.name && (
            <p className="text-[11px] font-bold text-rose-500 ml-0.5 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{fieldErrors.name}</span>
            </p>
          )}
        </div>

        {/* EMAIL ADDRESS INPUT */}
        <div className="space-y-1">
          <label className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider ml-0.5">
            Email Address <span className="text-rose-500">*</span>
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => handleEmailChange(e.target.value)}
            placeholder="john.doe@company.com"
            className={cn(
              "w-full px-4 py-3 bg-slate-50 border rounded-xl focus:bg-white focus:ring-2 transition-all outline-none text-sm font-semibold text-slate-900 placeholder:text-slate-400",
              fieldErrors.email ? "border-rose-400 focus:ring-rose-500/20 focus:border-rose-600" : "border-slate-200 focus:ring-[#405189]/20 focus:border-[#405189]"
            )}
          />
          {fieldErrors.email && (
            <p className="text-[11px] font-bold text-rose-500 ml-0.5 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{fieldErrors.email}</span>
            </p>
          )}
        </div>

        {/* USERNAME INPUT */}
        <div className="space-y-1">
          <label className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider ml-0.5">
            Username <span className="text-rose-500">*</span> (Huruf saja)
          </label>
          <input
            type="text"
            maxLength={10}
            required
            value={username}
            onChange={handleUsernameChange}
            placeholder="johndoe"
            className={cn(
              "w-full px-4 py-3 bg-slate-50 border rounded-xl focus:bg-white focus:ring-2 transition-all outline-none text-sm font-semibold text-slate-900 placeholder:text-slate-400",
              fieldErrors.username ? "border-rose-400 focus:ring-rose-500/20 focus:border-rose-600" : "border-slate-200 focus:ring-[#405189]/20 focus:border-[#405189]"
            )}
          />
          {fieldErrors.username && (
            <p className="text-[11px] font-bold text-rose-500 ml-0.5 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{fieldErrors.username}</span>
            </p>
          )}
        </div>

        {/* PASSWORD INPUT & STRENGTH METER */}
        <div className="space-y-1">
          <label className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider ml-0.5">
            Password <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              required
              value={password}
              onChange={(e) => handlePasswordChange(e.target.value)}
              placeholder="••••••••"
              className={cn(
                "w-full pl-4 pr-11 py-3 bg-slate-50 border rounded-xl focus:bg-white focus:ring-2 transition-all outline-none text-sm font-semibold text-slate-900 placeholder:text-slate-400",
                fieldErrors.password ? "border-rose-400 focus:ring-rose-500/20 focus:border-rose-600" : "border-slate-200 focus:ring-[#405189]/20 focus:border-[#405189]"
              )}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer transition-colors"
              title={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {/* Password Strength Indicator Bar */}
          {password.length > 0 && (
            <div className="mt-2 space-y-1.5 p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl">
              <div className="flex items-center justify-between text-[11px] font-extrabold">
                <span className="text-slate-600">Password Strength:</span>
                <span className={passStrength.color}>{passStrength.label}</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                <div
                  className={cn("h-full transition-all duration-300 rounded-full", passStrength.barColor)}
                  style={{ width: `${passStrength.percentage}%` }}
                />
              </div>

              {/* Criteria Checklist */}
              <div className="grid grid-cols-2 gap-1 text-[10px] font-bold mt-1.5 text-slate-500">
                <div className={cn("flex items-center gap-1", passStrength.criteria.minLength ? "text-emerald-600 font-extrabold" : "text-slate-400")}>
                  <span>{passStrength.criteria.minLength ? "[✓]" : "[ ]"}</span> Min 8 Karakter
                </div>
                <div className={cn("flex items-center gap-1", passStrength.criteria.upper ? "text-emerald-600 font-extrabold" : "text-slate-400")}>
                  <span>{passStrength.criteria.upper ? "[✓]" : "[ ]"}</span> Huruf Besar (A-Z)
                </div>
                <div className={cn("flex items-center gap-1", passStrength.criteria.digit ? "text-emerald-600 font-extrabold" : "text-slate-400")}>
                  <span>{passStrength.criteria.digit ? "[✓]" : "[ ]"}</span> Angka (0-9)
                </div>
                <div className={cn("flex items-center gap-1", passStrength.criteria.special ? "text-emerald-600 font-extrabold" : "text-slate-400")}>
                  <span>{passStrength.criteria.special ? "[✓]" : "[ ]"}</span> Simbol (@$!%*?&)
                </div>
              </div>
            </div>
          )}

          {fieldErrors.password && (
            <p className="text-[11px] font-bold text-rose-500 ml-0.5 flex items-center gap-1 mt-1">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{fieldErrors.password}</span>
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={isRegistering}
          className="w-full bg-[#405189] text-white py-3.5 rounded-xl font-bold uppercase tracking-wider text-xs hover:bg-[#364574] transition-all shadow-lg shadow-[#405189]/25 active:scale-[0.98] mt-4 flex items-center justify-center gap-2 group cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {isRegistering ? (
            <>
              <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              <span>Creating Account...</span>
            </>
          ) : (
            <>
              <span>Sign Up</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </>
          )}
        </button>
      </form>

      <p className="text-center text-xs font-medium text-slate-500 pt-4 border-t border-slate-100">
        Already have an account?{" "}
        <button
          type="button"
          onClick={onBackToLogin}
          className="text-[#405189] font-bold hover:text-[#364574] transition-colors ml-1 cursor-pointer hover:underline"
        >
          Sign In
        </button>
      </p>

      {/* REGISTRATION SUCCESS MODAL (VELZON SWEETALERT STYLE) */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 font-sans">
          <motion.div
            initial={{ scale: 0.85, opacity: 0, y: 15 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            className="bg-white rounded-xl p-8 max-w-md w-full shadow-2xl border border-slate-100 text-center relative overflow-hidden space-y-4"
          >
            <button 
              onClick={handleSuccessModalConfirm}
              className="absolute top-4 right-4 text-slate-300 hover:text-slate-600 transition-colors p-1 rounded-md"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Velzon Party Cone Animated Icon */}
            <VelzonSuccessIcon />

            <div className="space-y-2">
              <h3 className="text-xl font-bold text-slate-800 tracking-tight">
                Well done !
              </h3>
              <p className="text-sm text-slate-500 font-normal leading-relaxed px-2">
                Akun Anda telah berhasil didaftarkan di platform LanPro. Silakan hubungi Admin untuk diaktifkan sebelum Anda dapat masuk.
              </p>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleSuccessModalConfirm}
              className="px-8 py-2.5 bg-[#405189] hover:bg-[#364574] text-white rounded-md text-sm font-semibold shadow-md transition-all cursor-pointer min-w-[120px] mt-2"
            >
              Ke Halaman Login
            </motion.button>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
};

const LoginSkeletonState = ({ loadingText }: { loadingText?: string }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.25 }}
      className="w-full max-w-md space-y-6 mx-auto relative z-10 font-sans"
    >
      {/* Title & Subtitle Skeleton */}
      <div className="space-y-2">
        <div className="h-8 w-32 bg-slate-200 rounded-lg animate-pulse" />
        <div className="h-3.5 w-60 bg-slate-100 rounded animate-pulse" />
      </div>

      {/* Shimmer Input Skeleton Cards */}
      <div className="space-y-4 pt-2">
        <div className="space-y-1.5">
          <div className="h-3 w-20 bg-slate-200 rounded animate-pulse" />
          <div className="w-full h-12 bg-slate-50 border border-slate-200 rounded-xl relative overflow-hidden">
            <motion.div 
              className="absolute inset-0 bg-gradient-to-r from-transparent via-slate-200/60 to-transparent"
              animate={{ x: ["-100%", "200%"] }}
              transition={{ duration: 1.6, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="h-3 w-20 bg-slate-200 rounded animate-pulse" />
          <div className="w-full h-12 bg-slate-50 border border-slate-200 rounded-xl relative overflow-hidden">
            <motion.div 
              className="absolute inset-0 bg-gradient-to-r from-transparent via-slate-200/60 to-transparent"
              animate={{ x: ["-100%", "200%"] }}
              transition={{ duration: 1.6, repeat: Number.POSITIVE_INFINITY, delay: 0.2, ease: "linear" }}
            />
          </div>
        </div>

        {/* Remember Me Skeleton */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-slate-200 animate-pulse" />
            <div className="h-3 w-24 bg-slate-200 rounded animate-pulse" />
          </div>
        </div>

        {/* Skeleton Submit Button */}
        <div className="w-full h-12 bg-slate-100 border border-slate-200/60 rounded-xl relative overflow-hidden mt-3">
          <motion.div 
            className="absolute inset-0 bg-gradient-to-r from-transparent via-slate-200/40 to-transparent"
            animate={{ x: ["-100%", "200%"] }}
            transition={{ duration: 1.6, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
          />
        </div>
      </div>

      {/* Floating Status Box */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-4 rounded-xl bg-slate-900/5 border border-[#405189]/20 backdrop-blur-xs flex items-center gap-3.5 mt-2 shadow-xs"
      >
        <div className="w-9 h-9 rounded-lg bg-[#405189] flex items-center justify-center shrink-0 shadow-sm relative overflow-hidden">
          <motion.div 
            className="absolute inset-0 bg-gradient-to-tr from-amber-400/40 via-indigo-500/40 to-cyan-400/40"
            animate={{ opacity: [0.3, 0.9, 0.3] }}
            transition={{ duration: 1.8, repeat: Number.POSITIVE_INFINITY }}
          />
          <span className="text-white text-xs font-bold relative z-10">LP</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-bold text-slate-800 tracking-tight flex items-center gap-1.5">
            <span>{loadingText || "Memverifikasi Akses Workspace"}</span>
            <span className="flex space-x-1">
              <span className="w-1 h-1 bg-[#405189] rounded-full animate-bounce" />
              <span className="w-1 h-1 bg-[#405189] rounded-full animate-bounce [animation-delay:0.2s]" />
              <span className="w-1 h-1 bg-[#405189] rounded-full animate-bounce [animation-delay:0.4s]" />
            </span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-1.5 mt-2 overflow-hidden relative">
            <motion.div 
              className="bg-gradient-to-r from-amber-400 via-[#3577f1] to-cyan-400 h-full rounded-full"
              animate={{ width: ["10%", "90%", "35%", "95%"] }}
              transition={{ duration: 2.2, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
            />
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

const LoginScreen = ({
  onLogin,
  onRegisterClick,
  loading,
  loadingText = "Authenticating...",
}: {
  onLogin: (u: string, p: string, remember: boolean) => void;
  onRegisterClick: () => void;
  loading?: boolean;
  loadingText?: string;
}) => {
  const [username, setUsername] = useState(
    () => localStorage.getItem("savedUsername") || "",
  );
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(
    () => localStorage.getItem("rememberUser") === "true",
  );
  const [showPassword, setShowPassword] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ username?: string; password?: string }>({});

  useEffect(() => {
    if (rememberMe) {
      localStorage.setItem("savedUsername", username);
      localStorage.setItem("rememberUser", "true");
    } else {
      localStorage.removeItem("savedUsername");
      localStorage.setItem("rememberUser", "false");
    }
  }, [username, rememberMe]);

  const handleUsernameChange = (val: string) => {
    setUsername(val);
    if (fieldErrors.username) {
      setFieldErrors((prev) => ({ ...prev, username: undefined }));
    }
  };

  const handlePasswordChange = (val: string) => {
    setPassword(val);
    if (fieldErrors.password) {
      setFieldErrors((prev) => ({ ...prev, password: undefined }));
    }
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: { username?: string; password?: string } = {};

    if (!username.trim()) {
      errors.username = "Username wajib diisi";
    }
    if (!password.trim()) {
      errors.password = "Password wajib diisi";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      toast.error("Gagal Masuk", {
        description: "Username dan Password wajib diisi terlebih dahulu.",
      });
      return;
    }

    setFieldErrors({});
    onLogin(username.trim(), password.trim(), rememberMe);
  };

  const handleGoogleAuth = async () => {
    setIsGoogleLoading(true);
    try {
      const res = await googleSignIn();
      if (!res) return;
      const verifyRes = await apiRequest("/api/auth/google-verify", {
        method: "POST",
        body: JSON.stringify({ idToken: res.idToken }),
      });
      if (verifyRes.status === "success") {
        setAuthToken(verifyRes.token);
        window.location.reload();
      } else {
        toast.error(verifyRes.message || "Google sign-in failed");
      }
    } catch (e: any) {
      console.error("Google sign-in error", e);
      if (e?.status === 403) {
        toast.error("Email Tidak Terdaftar", {
          description: "Email Google Anda belum terdaftar dalam sistem. Silakan hubungi Administrator.",
          duration: 5000,
        });
      } else {
        toast.error(e?.message || "Google sign-in failed");
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 grid-rows-1 w-full max-w-md mx-auto relative">
      <AnimatePresence>
        {loading ? (
          <div key="login-skeleton" className="col-start-1 row-start-1 w-full">
            <LoginSkeletonState loadingText={loadingText} />
          </div>
        ) : (
          <motion.div 
            key="login-form"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.25 }}
            className="col-start-1 row-start-1 w-full space-y-6 relative z-10 font-sans"
          >
            <div className="space-y-1.5">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
              >
                <h2 className="text-3xl font-black text-slate-900 tracking-tight">
                  Sign In
                </h2>
                <p className="text-slate-500 text-xs font-semibold mt-1">
                  Enter your credentials to access your workspace
                </p>
              </motion.div>
            </div>

            <form
              className="space-y-4"
              onSubmit={handleLoginSubmit}
            >
              <div className="space-y-1">
                <label className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider ml-0.5">
                  Username <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => handleUsernameChange(e.target.value)}
                  className={cn(
                    "w-full px-4 py-3.5 bg-slate-50 border rounded-xl focus:bg-white focus:ring-2 transition-all outline-none text-sm font-semibold text-slate-900 placeholder:text-slate-400",
                    fieldErrors.username ? "border-rose-400 focus:ring-rose-500/20 focus:border-rose-600" : "border-slate-200 focus:ring-[#405189]/20 focus:border-[#405189]"
                  )}
                />
                {fieldErrors.username && (
                  <p className="text-[11px] font-bold text-rose-500 ml-0.5 flex items-center gap-1 mt-0.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{fieldErrors.username}</span>
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider ml-0.5">
                  Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => handlePasswordChange(e.target.value)}
                    className={cn(
                      "w-full pl-4 pr-11 py-3.5 bg-slate-50 border rounded-xl focus:bg-white focus:ring-2 transition-all outline-none text-sm font-semibold text-slate-900 placeholder:text-slate-400",
                      fieldErrors.password ? "border-rose-400 focus:ring-rose-500/20 focus:border-rose-600" : "border-slate-200 focus:ring-[#405189]/20 focus:border-[#405189]"
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer transition-colors"
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {fieldErrors.password && (
                  <p className="text-[11px] font-bold text-rose-500 ml-0.5 flex items-center gap-1 mt-0.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{fieldErrors.password}</span>
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-[#405189] focus:ring-[#405189] cursor-pointer"
                  />
                  <span className="text-xs font-semibold text-slate-600">
                    Remember Me
                  </span>
                </label>
              </div>

              <button
                type="submit"
                disabled={loading || !username.trim() || !password.trim()}
                className="w-full bg-[#405189] text-white py-3.5 rounded-xl font-bold uppercase tracking-wider text-xs hover:bg-[#364574] transition-all shadow-lg shadow-[#405189]/25 active:scale-[0.98] mt-2 flex items-center justify-center gap-2.5 group cursor-pointer disabled:bg-[#405189]/60 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <span>Sign In</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </form>

            <p className="text-center text-xs font-medium text-slate-500 pt-4 border-t border-slate-100">
              Don't have an account?{" "}
              <button
                type="button"
                onClick={onRegisterClick}
                className="text-[#405189] font-bold hover:text-[#364574] transition-colors ml-1 cursor-pointer hover:underline"
              >
                Sign Up
              </button>
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const ProfileEditModal = ({
  isOpen,
  onClose,
  userProfile,
  onProfileUpdated,
}: {
  isOpen: boolean;
  onClose: () => void;
  userProfile: UserProfile | null;
  onProfileUpdated?: (updatedProfile: Partial<UserProfile>) => void;
}) => {
  const [displayName, setDisplayName] = useState(
    userProfile?.displayName || "",
  );
  const [username, setUsername] = useState(userProfile?.username || "");
  const [email, setEmail] = useState(userProfile?.email || "");
  const [phone, setPhone] = useState(userProfile?.phone || "");
  const [error, setError] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setDisplayName(userProfile?.displayName || "");
      setUsername(userProfile?.username || "");
      setEmail(userProfile?.email || "");
      setPhone(userProfile?.phone || "");
    }
  }, [isOpen, userProfile]);

  const handleUpdateProfile = async () => {
    const docId = userProfile?.id || userProfile?.uid;
    if (!docId) return;
    setLoading(true);
    setError(null);
    try {
      await apiRequest(`/api/profile/update`, {
        method: "PUT",
        body: { 
          displayName, 
          username, 
          email, 
          phone, 
          currentPassword: currentPassword || undefined, 
          newPassword: newPassword || undefined 
        },
      });

      if (onProfileUpdated) {
        onProfileUpdated({
          displayName,
          username,
          email,
          phone,
        });
      }

      toast.success("Profile updated successfully.");
      onClose();
    } catch (error: any) {
      console.error("Error updating profile", error);
      const errorMessage = error.message || "Failed to update profile";
      if (errorMessage === "Password lama yang Anda masukkan salah!") {
        setError(errorMessage);
      } else {
        toast.error(`Failed to update profile: ${errorMessage}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Profil">
      <div className="space-y-6">
        <div className="flex gap-4 items-center bg-slate-50 p-4 rounded-xl border border-slate-100">
          <div className="w-16 h-16 rounded-full bg-indigo-100 border border-indigo-200 flex items-center justify-center text-indigo-700 text-2xl font-bold shadow-sm">
            {displayName.substring(0, 2).toUpperCase()}
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-slate-800">
              {displayName}
            </p>
            <p className="text-xs text-slate-500">{email}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
              Nama Lengkap
            </label>
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
              Username
            </label>
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          <div className="space-y-1 md:col-span-2">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
              Email
            </label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>

          <div className="space-y-1 md:col-span-2">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
              Nomor Telepon
            </label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 space-y-3">
          <h4 className="text-sm font-bold text-slate-800">Ubah Password</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1 relative">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                Password Lama
              </label>
              <Input
                type={showCurrentPassword ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => {
                  setCurrentPassword(e.target.value);
                  setError(null);
                }}
                placeholder="••••••••"
                className="pr-10"
              />
              {error && <p className="text-[10px] text-red-500 font-bold">{error}</p>}
              <button
                type="button"
                className="absolute right-3 top-8 text-slate-400 hover:text-slate-600"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
              >
                {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <div className="space-y-1 relative">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                Password Baru
              </label>
              <Input
                type={showNewPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="pr-10"
              />
              <button
                type="button"
                className="absolute right-3 top-8 text-slate-400 hover:text-slate-600"
                onClick={() => setShowNewPassword(!showNewPassword)}
              >
                {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleUpdateProfile}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-4 py-2 font-medium transition-all disabled:opacity-50"
        >
          {loading ? (
            "Saving..."
          ) : (
            <>
              <Save className="w-4 h-4" />
              Save Changes
            </>
          )}
        </button>
      </div>
    </Modal>
  );
};

const BROWSER_SESSION_ID = Math.random().toString(36).substring(2, 15) + Date.now().toString(36);

function App() {
  const [swimlaneType, setSwimlaneType] = useState<
    "epics" | "assignees" | "none"
  >("epics");
  const [loading, setLoading] = useState(true);
  const [loginStatusText, setLoginStatusText] = useState<string>("Authenticating...");
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [isInitialDataLoading, setIsInitialDataLoading] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [qaInitialStatusFilter, setQaInitialStatusFilter] = useState<"ALL" | "Passed" | "Failed" | "Blocked" | "Retest" | "Pending">("ALL");
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const themeDropdownRef = useRef<HTMLDivElement>(null);
  
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>(() => {
    return (localStorage.getItem('theme') as 'light' | 'dark' | 'system') || 'system';
  });
  const [isThemeOpen, setIsThemeOpen] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    
    const applyTheme = (currentTheme: 'light' | 'dark' | 'system') => {
      if (currentTheme === 'dark') {
        root.classList.add('dark');
      } else if (currentTheme === 'light') {
        root.classList.remove('dark');
      } else {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        if (mediaQuery.matches) {
          root.classList.add('dark');
        } else {
          root.classList.remove('dark');
        }
      }
    };

    applyTheme(theme);
    localStorage.setItem('theme', theme);

    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const listener = () => applyTheme('system');
      mediaQuery.addEventListener('change', listener);
      return () => mediaQuery.removeEventListener('change', listener);
    }
  }, [theme]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        themeDropdownRef.current &&
        !themeDropdownRef.current.contains(event.target as Node)
      ) {
        setIsThemeOpen(false);
      }
    }
    if (isThemeOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isThemeOpen]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    document.addEventListener("mozfullscreenchange", handleFullscreenChange);
    document.addEventListener("MSFullscreenChange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
      document.removeEventListener("mozfullscreenchange", handleFullscreenChange);
      document.removeEventListener("MSFullscreenChange", handleFullscreenChange);
    };
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        notificationsRef.current &&
        !notificationsRef.current.contains(event.target as Node)
      ) {
        setIsNotificationsOpen(false);
      }
    }
    if (isNotificationsOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isNotificationsOpen]);

  useEffect(() => {

    // Initial Auth Restoration (LanPro v1.3)
    const token = localStorage.getItem("lanpro_jwt_token");

    if (!token) {
        setIsLoggedIn(false);
        setLoading(false);
        return;
    }
    
    // Restoration logic from session user if exists
    const sessionPayload =
      sessionStorage.getItem("sessionUser") ||
      localStorage.getItem("sessionUser");
    


    let localUser = null;
    if (sessionPayload) {
      try {
        localUser = JSON.parse(sessionPayload);
        setCurrentUser(localUser);
        setCurrentUserProfile(localUser);
        setUserRole(localUser.role);
        setIsLoggedIn(true);
      } catch (e) {
        console.error("Failed to restore session", e);
      }
    }

    // Verify token with backend to prevent expired/invalid session and parallel error toasts
    const verifySession = async () => {
      const token = localStorage.getItem("lanpro_jwt_token");
      if (!token) {
        setLoading(false);

        return;
      }
      try {
        const data = await apiRequest("/api/auth/verify");
        if (data && data.status === "success") {

          const verifiedUser = data.user || data.data || localUser;
          if (verifiedUser) {
            if (verifiedUser.permissions && typeof verifiedUser.permissions === 'string') {
              try {
                verifiedUser.permissions = JSON.parse(verifiedUser.permissions);
              } catch (e) {
                console.error("Failed to parse verifiedUser permissions:", e);
              }
            }
            setCurrentUser(verifiedUser);
            setCurrentUserProfile(verifiedUser);
            setUserRole(verifiedUser.role);
            setIsLoggedIn(true);
          }
        } else {
          console.warn("Token verification returned non-success state");
          await handleLogout(true);
        }
      } catch (e: any) {
        console.warn("Token verification failed (session expired or invalid):", e?.message || e);
        // Silent logout - clear state and go back to login without throwing loud error toasts
        await handleLogout(true);
      } finally {
        setLoading(false);

      }
    };

    verifySession();
  }, []);

  const handleLogout = async (silent = false) => {
    const wasLoggedIn = isLoggedIn || !!currentUser || !!localStorage.getItem("lanpro_jwt_token");
    const activeUserId = currentUser?.id || currentUser?.uid;

    if (activeUserId) {
      try {
        await apiRequest("/api/auth/logout", {
          method: "POST",
          body: { userId: activeUserId }
        }).catch(() => {
          // Ignore network or API errors on logout to allow local session clearance
        });
      } catch (e) {
        // Silently ignore logout network exceptions
      }
    }
    localStorage.removeItem("isAdminMode");
    localStorage.removeItem("sessionUser");
    sessionStorage.removeItem("sessionUser");
    clearAuthToken();
    
    if (socket) {
      socket.emit("leave_presence");
    }

    // Clear all significant states
    setCurrentUserProfile(null);
    setCurrentUser(null);
    setIsLoggedIn(false);
    setSelectedProject(null);
    setProjects([]);
    setTasks([]);
    setSprints([]);
    setProjectMembers([]);
    setActivityLogs([]);
    setCurrentView("dashboard");
    setAuthView("login");

    if (wasLoggedIn && !silent) {
      toast.success("Logged out successfully");
    }

    // Hard check to ensure we are back at login if state doesn't trigger immediately
    setTimeout(() => {
      if (window.location.hash !== "" || window.location.search !== "") {
        window.location.href = window.location.origin;
      }
    }, 500);
  };

  const handleLogoutRequest = () => {
    setConfirmAction({
      isOpen: true,
      title: "Logout Akun",
      message: "Apakah Anda yakin ingin keluar dari LanPro? Sesi Anda akan diakhiri.",
      variant: "warning",
      confirmText: "Ya, Keluar",
      cancelText: "Batal",
      onConfirm: async () => {
        await handleLogout(false);
      },
    });
  };

  useEffect(() => {
    const handleAuthExpired = () => {
       handleLogout();
    };
    window.addEventListener("auth_expired", handleAuthExpired);
    return () => window.removeEventListener("auth_expired", handleAuthExpired);
  }, []);

  // Auth States
  const {
    currentView,
    setCurrentView,
    projects,
    setProjects,
    selectedProject,
    setSelectedProject,
    tasks,
    setTasks,
    sprints,
    setSprints,
    activityLogs,
    setActivityLogs,
    masterData,
    setMasterData,
    allUsers,
    setAllUsers,
    density,
    setDensity,
  } = useAppStore();
  const { handleAuthApiResponse, triggerNotification } = useAuthNotification();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [userRole, setUserRole] = useState<AppRole | null>(null);
  const [currentUserProfile, setCurrentUserProfile] =
    useState<UserProfile | null>(null);
  const [authView, setAuthView] = useState<"login" | "register">("login");
  const [isPendingModalOpen, setIsPendingModalOpen] = useState(false);
  const [pendingModalMessage, setPendingModalMessage] = useState<string>("");
  const [socket, setSocket] = useState<any>(null);
  const [showCollisionModal, setShowCollisionModal] = useState(false);
  const [activeSessionData, setActiveSessionData] = useState<any>(null);
  const [pendingLoginCredentials, setPendingLoginCredentials] = useState<any>(null);

  const user: any = currentUser;
  const effectiveRole = useMemo(() => {
    const usernameLower = (currentUser?.username || currentUserProfile?.username || user?.username || "").toLowerCase().trim();
    const roleLower = (userRole || currentUser?.role || currentUserProfile?.role || "").toLowerCase().trim();
    if (usernameLower === "admin" || roleLower === "admin" || roleLower === "administrator" || roleLower === "superadmin") return "admin";
    if (selectedProject && currentUser?.uid && selectedProject.memberRoles?.[currentUser?.uid]) {
        const pr = selectedProject.memberRoles[currentUser?.uid];
        if ((pr || "").toLowerCase() === "admin") return "admin";
        if (pr === "developer" || pr === "member") return "user";
        if (pr === "viewer") return "viewer";
        return pr as AppRole;
    }
    return (userRole || "user") as AppRole;
  }, [userRole, selectedProject, currentUser?.uid, currentUser?.role, currentUser?.username, currentUserProfile?.username]);

  const fetchAllUsers = async () => {
    if (!isLoggedIn || !getAuthToken()) return;
    try {
      const data = await apiRequest("/api/users");
      if (data.status === "success") {
        setAllUsers(data.data as UserProfile[]);
      }
    } catch (error) {
      console.warn("Silent failure fetching all users:", error);
    }
  };

  useEffect(() => {
    if (isLoggedIn) {
      const timer = setTimeout(() => {
        fetchAllUsers();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isLoggedIn]);

  useEffect(() => {
    const handleProfileUpdated = (e: Event) => {
      const customEvent = e as CustomEvent;
      const updatedUser = customEvent.detail;
      if (updatedUser) {
        const currentUid = currentUser?.uid || user?.uid || currentUserProfile?.id || currentUserProfile?.uid;
        const targetUid = updatedUser.uid || updatedUser.id;
        
        if (currentUid && targetUid && String(currentUid) === String(targetUid)) {
          setCurrentUserProfile(prev => ({
            ...prev,
            ...updatedUser,
            permissions: updatedUser.permissions
          }));
          if (updatedUser.role) {
            setUserRole(updatedUser.role);
          }
        }
        fetchAllUsers();
      }
    };
    window.addEventListener("user_profile_updated", handleProfileUpdated);
    return () => window.removeEventListener("user_profile_updated", handleProfileUpdated);
  }, [currentUser?.uid, user?.uid, currentUserProfile?.id, currentUserProfile?.uid]);

  const [listPage, setListPage] = useState(1);
  const [masterPage, setMasterPage] = useState(1);
  const [backlogPage, setBacklogPage] = useState(1);

  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);
  const [expandedSprintId, setExpandedSprintId] = useState<string | null>(null);
  const [isUpdatingTask, setIsUpdatingTask] = useState<Record<string, boolean>>({});
  const [isNewSprintModalOpen, setIsNewSprintModalOpen] = useState(false);
  const [newSprintName, setNewSprintName] = useState("");
  const [newSprintGoal, setNewSprintGoal] = useState("");
  const [newSprintStartDate, setNewSprintStartDate] = useState(
    format(new Date(), "yyyy-MM-dd"),
  );
  const [newSprintEndDate, setNewSprintEndDate] = useState(
    format(addDays(new Date(), 14), "yyyy-MM-dd"),
  );
  const [selectedSprintBacklog, setSelectedSprintBacklog] = useState<
    Set<string>
  >(new Set());
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isInviteSuccessModalOpen, setIsInviteSuccessModalOpen] =
    useState(false);
  const [lastInvitedEmail, setLastInvitedEmail] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectKey, setNewProjectKey] = useState("");
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskAssigneeId, setNewTaskAssigneeId] = useState("");
  const [newTaskType, setNewTaskType] = useState<"epic" | "task" | "subtask">(
    "task",
  );

  const { newTaskStatus, setNewTaskStatus, newTaskPriority, setNewTaskPriority } = useMasterData(isLoggedIn, currentUser?.uid);
  const [newTaskCategory, setNewTaskCategory] = useState("");
  const [newTaskRelease, setNewTaskRelease] = useState("");
  const [newTaskParentId, setNewTaskParentId] = useState<string>("");
  const [newTaskSprintId, setNewTaskSprintId] = useState<string>("");

  const [newTaskStartDate, setNewTaskStartDate] = useState(
    format(new Date(), "yyyy-MM-dd"),
  );
  const [newTaskEndDate, setNewTaskEndDate] = useState(
    format(new Date(Date.now() + 86400000), "yyyy-MM-dd"),
  );
  const [newTaskDueDate, setNewTaskDueDate] = useState("");
  const [newTaskDescription, setNewTaskDescription] = useState("");
  const [newTaskAttachments, setNewTaskAttachments] = useState<File[]>([]);
  const [newTaskBusinessValue, setNewTaskBusinessValue] = useState<string>("");
  const [newTaskProjectRisk, setNewTaskProjectRisk] = useState<string>("");
  const [newTaskStoryPoints, setNewTaskStoryPoints] = useState<number>(0);
  const [newTaskAcceptanceCriteria, setNewTaskAcceptanceCriteria] =
    useState<string>("");
  const [newTaskLabels, setNewTaskLabels] = useState<string>("");
  const [newTaskFigmaUrl, setNewTaskFigmaUrl] = useState<string>("");
  const [newTaskEnvironment, setNewTaskEnvironment] = useState<string>("");

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [allProjectTasksForStats, setAllProjectTasksForStats] = useState<
    Task[]
  >([]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [auditLogSearch, setAuditLogSearch] = useState("");
  const [backlogSearch, setBacklogSearch] = useState("");
  const [backlogPriorityFilter, setBacklogPriorityFilter] =
    useState<string>("all");
  const [isQuickCreateOpen, setIsQuickCreateOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState<Record<string, boolean>>({});

  const wrapAppSubmit = (key: string, fn: () => Promise<void> | void) => async () => {
    setIsSubmitting(prev => ({ ...prev, [key]: true }));
    try {
      await fn();
    } finally {
      setIsSubmitting(prev => ({ ...prev, [key]: false }));
    }
  };
  const [editingSprint, setEditingSprint] = useState<Sprint | null>(null);
  const [isEditSprintModalOpen, setIsEditSprintModalOpen] = useState(false);
  const [isEditTaskModalOpen, setIsEditTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isEditProjectModalOpen, setIsEditProjectModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [selectedTaskForDetail, setSelectedTaskForDetail] = useState<Task | null>(null);
  const [selectedUserForDetail, setSelectedUserForDetail] = useState<UserProfile | null>(null);

  // We keep a history of the last view before opening issue detail so we can go back
  const [previousView, setPreviousView] = useState<string>('list');

  const setIsTaskDetailModalOpen = (open: boolean) => {
    if (open) {
      if (currentView !== 'issueDetail') {
        setPreviousView(currentView);
      }
      setCurrentView('issueDetail' as any);
    } else {
      setCurrentView(previousView as any);
    }
  };

  const handleSetIsTaskDetailModalOpen = setIsTaskDetailModalOpen;

  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);

  // Latency & Ping Monitor States
  const [apiLatency, setApiLatency] = useState<number | null>(null);
  const [latencyStatus, setLatencyStatus] = useState<'excellent' | 'warning' | 'poor' | 'offline'>('excellent');

  const checkLatency = async () => {
    const startTime = performance.now();
    try {
      const response = await fetch("/api/health-check", { 
        method: "GET",
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" }
      });
      const duration = Math.round(performance.now() - startTime);
      
      if (response.ok) {
        setApiLatency(duration);
        if (duration < 150) {
          setLatencyStatus('excellent');
        } else if (duration < 500) {
          setLatencyStatus('warning');
        } else {
          setLatencyStatus('poor');
        }
      } else {
        setApiLatency(null);
        setLatencyStatus('offline');
      }
    } catch (e) {
      setApiLatency(null);
      setLatencyStatus('offline');
    }
  };

  useEffect(() => {
    checkLatency();
    const interval = setInterval(checkLatency, 15000);
    return () => clearInterval(interval);
  }, []);

  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [cacheStats, setCacheStats] = useState<any>(null);
  const [lastSyncedTime, setLastSyncedTime] = useState<string>("Baru saja");

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isInputActive = activeEl && (
        activeEl.tagName === "INPUT" ||
        activeEl.tagName === "TEXTAREA" ||
        (activeEl instanceof HTMLElement && activeEl.isContentEditable) ||
        activeEl.getAttribute("role") === "textbox"
      );

      if (isInputActive) {
        return;
      }

      // 1. ? -> Keyboard Shortcuts Modal
      if (e.key === '?') {
        e.preventDefault();
        setIsShortcutsModalOpen((prev) => !prev);
        return;
      }

      // 2. n -> New Issue / Task modal
      if ((e.key === 'n' || e.key === 'N') && !e.ctrlKey && !e.altKey && !e.metaKey) {
        e.preventDefault();
        setIsNewTaskModalOpen(true);
        return;
      }

      // 3. p -> Create Project modal
      if ((e.key === 'p' || e.key === 'P') && !e.ctrlKey && !e.altKey && !e.metaKey) {
        e.preventDefault();
        setIsNewProjectModalOpen(true);
        return;
      }

      // 4. / -> Focus Search Input
      if (e.key === '/') {
        e.preventDefault();
        const searchInput = document.querySelector('input[placeholder*="Search" i], input[placeholder*="search" i], input[type="search"]');
        if (searchInput) {
          (searchInput as HTMLInputElement).focus();
          (searchInput as HTMLInputElement).select();
        }
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Sync selectedTaskForDetail when tasks state changes (e.g. from real-time socket refresh)
  useEffect(() => {
     if (currentView === 'issueDetail' && selectedTaskForDetail) {
         const updatedTask = tasks.find(t => t.id === selectedTaskForDetail.id);
         if (updatedTask && JSON.stringify(updatedTask) !== JSON.stringify(selectedTaskForDetail)) {
             setSelectedTaskForDetail(updatedTask);
         }
     }
  }, [tasks, currentView, selectedTaskForDetail]);

  // Attachments & Links states
  const [newLinkTitle, setNewLinkTitle] = useState("");
  const [newExternalLinkTitle, setNewExternalLinkTitle] = useState("");
  const [newExternalLinkUrl, setNewExternalLinkUrl] = useState("");
  const [isAddingExternalLink, setIsAddingExternalLink] = useState(false);
  const [newLinkUrl, setNewLinkUrl] = useState("");
  const [isAddingLink, setIsAddingLink] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>(
    {},
  );

  // Linked Tasks states
  const [isAddingTaskLink, setIsAddingTaskLink] = useState(false);
  const [taskLinkRelation, setTaskLinkRelation] = useState<
    "blocks" | "is_blocked_by" | "relates_to" | "clones" | "is_cloned_by"
  >("blocks");
  const [taskLinkTargetId, setTaskLinkTargetId] = useState("");

  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(
    new Set(),
  );
  const [projectMembers, setProjectMembers] = useState<UserProfile[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newCommentText, setNewCommentText] = useState("");
  const [mentionState, setMentionState] = useState<{
    active: boolean;
    query: string;
    index: number;
  }>({ active: false, query: "", index: -1 });
  const [confirmAction, setConfirmAction] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    variant?: 'danger' | 'warning' | 'info';
    confirmText?: string;
    cancelText?: string;
    isAlert?: boolean;
    isLoading?: boolean;
    closeOnBackdropClick?: boolean;
  } | null>(null);

  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const exportTasksToCSV = () => {
    if (!selectedProject || tasks.length === 0) {
      toast.error("Tidak ada tugas untuk diexport.");
      return;
    }
    const headers = [
      "Task ID",
      "Type",
      "Title",
      "Status",
      "Priority",
      "Category",
      "Assignee",
      "Reporter",
      "Sprint ID",
      "Created At",
      "End Date",
    ];
    const csvContent = [
      headers.join(","),
      ...tasks.map((t) => {
        const assigneeName =
          projectMembers.find((m) => m.uid === t.assigneeId)?.displayName ||
          "Belum Ditugaskan";
        const reporterName =
          (t as any).reporter?.name ||
          (t as any).reporter?.displayName ||
          projectMembers.find((m) => m.uid === t.reporterId || (m as any).id === t.reporterId)?.displayName ||
          "Unknown";
        const createdDate = t.createdAt
          ? format(ensureDate(t.createdAt), "yyyy-MM-dd HH:mm")
          : "";
        const endDate = t.endDate
          ? format(ensureDate(t.endDate), "yyyy-MM-dd")
          : "";
        return [
          t.key,
          t.type || "Task",
          '"' + (t.title || "").replace(/"/g, '""') + '"',
          t.status,
          t.priority,
          t.category || "",
          '"' + assigneeName + '"',
          '"' + reporterName + '"',
          t.sprintId || "",
          createdDate,
          endDate,
        ].join(",");
      }),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `Tasks_${selectedProject.key}_${format(new Date(), "yyyyMMdd")}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Successfully exported tasks to CSV");
  };

  const handleManualLogin = async (
    username: string,
    password: string,
    remember: boolean,
    force: boolean = false,
  ) => {
    if (!username || !password) {
        toast.error("Username/Email dan Password wajib diisi.");
        return;
    }
    if (isAuthLoading && !force) return;


    try {
      setIsAuthLoading(true);
      setLoginStatusText("Authenticating...");

      // Special Hardcoded Admin bypass
      if (
        username === "admin" &&
        (password === "admin" || password === "admin123")
      ) {
        const adminData = {
          uid: "admin-fixed-id",
          username: "admin",
          status: "approved",
          role: "admin",
          displayName: "Admin Manager",
        };

        // Try to ensure standard users table has the admin
        try {
           await apiRequest('/api/auth/register', {
             method: "POST",
             body: { ...adminData, password: password, id: "admin-fixed-id" }
           })
        } catch (e) {}

        if (remember) {
          localStorage.setItem("isAdminMode", "true");
        } else {
          sessionStorage.setItem("isAdminMode", "true");
        }
      }

      // MySQL login with session collision check
      const endpoint = force ? '/api/auth/force-logout' : '/api/auth/login';
      const data = await apiRequest(endpoint, {
        method: 'POST',
        body: { username, password, force, browserSessionId: BROWSER_SESSION_ID }
      });
      
      if (data.status !== 'success') {
         handleAuthApiResponse(401, data);
         setIsAuthLoading(false);
         return;
      }

      if (data.token) {
        setAuthToken(data.token);
      }
      
      const userData = data.user as UserProfile;
      userData.permissions = typeof userData.permissions === 'string' ? JSON.parse(userData.permissions) : userData.permissions;
      
      // Prefetch critical dashboard data to prevent blank shell flashing
      try {
        const canSeeAllProjects = userData.role === "admin" || userData.role === "head";
        const url = canSeeAllProjects ? "/api/projects" : `/api/projects?userId=${userData.uid}`;
        const [projectsRes, masterRes] = await Promise.all([
           apiRequest(url).catch(() => null),
           apiRequest("/api/master-data").catch(() => null)
        ]);
        
        if (projectsRes?.status === "success") {
           const projs = projectsRes.data as Project[];
           setProjects(projs);
           setSelectedProject(projs.length > 0 ? projs[0] : null);
        }
        
        if (masterRes?.status === "success") {
           const result = masterRes.data as MasterData[];
           const uniqueData = Array.from(new Map(result.map((m) => [`${m.type}-${m.label}`, m])).values());
           setMasterData(uniqueData);
           if (uniqueData.length > 0) {
              const statuses = uniqueData.filter((d) => d.type === "status");
              const priorities = uniqueData.filter((d) => d.type === "priority");
              if (statuses.length > 0) setNewTaskStatus(statuses[0].label);
              if (priorities.length > 0) setNewTaskPriority(priorities[0].label);
           }
        }
      } catch (e) {
         console.warn("Failed to prefetch data:", e);
      }

      // Security delay to allow browser password managers (like Chrome) to trigger warnings/saves
      // while keeping the login screen visible with a loading indicator. Skip if force logout.
      if (!force) {
        setLoginStatusText("Memverifikasi keamanan sesi...");
        await new Promise((resolve) => setTimeout(resolve, 800));
      }

      setIsAuthLoading(false);
      setIsLoggedIn(true);
      setUserRole(userData.role);
      setCurrentUser(userData);
      setCurrentUserProfile(userData);
      setShowCollisionModal(false);
      setActiveSessionData(null);
      setPendingLoginCredentials(null);

      if (remember) {
        localStorage.setItem("sessionUser", JSON.stringify(userData));
        localStorage.setItem("rememberUser", "true");
      } else {
        sessionStorage.setItem("sessionUser", JSON.stringify(userData));
        localStorage.removeItem("rememberUser");
      }

      toast.success(
        `Selamat datang kembali, ${userData?.displayName || username}`,
      );
    } catch (e: any) {
      if (e instanceof ApiError && e.status === 409) {
        console.warn("Session collision detected");
        setActiveSessionData(e.data.activeSession);
        setPendingLoginCredentials({ username, password, remember });
        setShowCollisionModal(true);
        setIsAuthLoading(false);
        return;
      }

      setIsAuthLoading(false);
      const errStatus = e.status || 500;
      const isExpectedAuthError = errStatus === 429 || errStatus === 403 || (e.message && (
        e.message.includes("belum aktif") ||
        e.message.includes("belum di aktifkan") ||
        e.message.includes("pending") ||
        e.message.toLowerCase().includes("terblokir") ||
        e.message.toLowerCase().includes("salah") ||
        e.message.toLowerCase().includes("credentials") ||
        e.message.toLowerCase().includes("tidak ditemukan") ||
        e.message.toLowerCase().includes("gagal terhubung") ||
        e.message.toLowerCase().includes("failed to fetch")
      ));
      if (isExpectedAuthError) {
        console.warn("Login issue:", e.message);
      } else {
        console.error("Login error:", e);
      }
      if (errStatus === 403 || (e.message && (e.message.includes("belum aktif") || e.message.includes("belum di aktifkan") || e.message.includes("pending")))) {
        let cleanMsg = e.message || "";
        if (!cleanMsg || cleanMsg.includes("Rute API") || cleanMsg.includes("Status: 403") || cleanMsg.includes("Response bukan") || cleanMsg.includes("Server error")) {
          cleanMsg = `halo ${username} akun anda belum di aktifkan, silahkan hubungi admin ya`;
        }
        setPendingModalMessage(cleanMsg);
        setIsPendingModalOpen(true);
      } else if (errStatus === 429 || (e.message && e.message.toLowerCase().includes("terblokir"))) {
        handleAuthApiResponse(429, { message: e.message });
      } else if (e.message && (e.message.toLowerCase().includes("salah") || e.message.toLowerCase().includes("credentials") || e.message.toLowerCase().includes("tidak ditemukan"))) {
        handleAuthApiResponse(401, { message: e.message });
      } else if (e.message && (e.message.toLowerCase().includes("gagal terhubung") || e.message.toLowerCase().includes("failed to fetch"))) {
        toast.error("Gagal terhubung ke server. Silakan periksa koneksi Anda dan coba lagi.");
      } else {
        handleAuthApiResponse(errStatus, { message: e.message || "Terjadi kesalahan saat login." });
      }
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleRegister = async (
    username: string,
    password: string,
    name: string,
    email: string,
  ) => {
    try {
      setIsAuthLoading(true);

      const data = await apiRequest('/api/auth/register', {
        method: 'POST',
        body: { username, password, nama_lengkap: name, email }
      });
      
      if (data.status !== 'success') {
        toast.error(data.message || "Pendaftaran gagal.");
        return { success: false, message: data.message };
      }

      return { success: true, message: data.message };
    } catch (e: any) {
      console.error("Registration error:", e);
      toast.error(e?.message || "Terjadi kesalahan pendaftaran.");
      return { success: false, message: e?.message };
    } finally {
      setIsAuthLoading(false);
    }
  };

  const fetchProjects = async () => {
    if (!getAuthToken()) return;
    const effectiveUserId = currentUser?.uid || user?.uid;
    const canSeeAllProjects = userRole === "admin" || userRole === "head";
    if (!effectiveUserId && !canSeeAllProjects) return;

    try {
      const url = canSeeAllProjects ? "/api/projects" : `/api/projects?userId=${effectiveUserId}`;
      const data = await apiRequest(url);
      
      if (data.status === "success") {
        const projs = data.data as Project[];
        setProjects(projs);
        setSelectedProject((prev) => {
          if (projs.length === 0) return null;
          if (!prev) return projs[0];
          const updated = projs.find((p) => p.id === prev.id);
          return updated || projs[0];
        });
      }
    } catch (e: any) {
      const msg = e?.message || String(e);
      if (msg.includes("429") || msg.includes("Server error: 429")) {
        console.warn("fetchProjects: Terlalu banyak permintaan (429). Mencoba lagi dalam 5 detik...");
        setTimeout(fetchProjects, 5000);
        return;
      }
      if (msg.includes("Sesi Anda telah berakhir") || msg.includes("Sesi berakhir") || msg.includes("token tidak valid") || msg.includes("Failed to fetch") || msg.includes("fetch")) {
        console.warn("fetchProjects: Sesi pengguna berakhir atau tidak valid.");
      } else {
        console.error("fetchProjects error:", e);
      }
    }
  };

  useEffect(() => {
    if (!isLoggedIn) return;
    if (projects.length === 0) {
      setIsInitialDataLoading(true);
    }
    const timer = setTimeout(async () => {
      await fetchProjects();
      setIsInitialDataLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [currentUser?.uid, userRole, isLoggedIn]);

  const fetchMasterData = async () => {
    if (!getAuthToken()) return;
    try {
      const data = await apiRequest("/api/master-data");
      if (data.status === "success") {
        const result = data.data as MasterData[];
        const uniqueData = Array.from(
          new Map(result.map((m) => [`${m.type}-${m.label}`, m])).values(),
        );
        setMasterData(uniqueData);

        if (uniqueData.length > 0) {
          const statuses = uniqueData.filter((d) => d.type === "status");
          const priorities = uniqueData.filter((d) => d.type === "priority");
          if (statuses.length > 0 && !newTaskStatus) {
            setNewTaskStatus(statuses[0].label);
          }
          if (priorities.length > 0 && !newTaskPriority) {
            setNewTaskPriority(priorities[0].label);
          }
        }
      }
    } catch (error: any) {
       const msg = error?.message || String(error);
       if (msg.includes("Sesi Anda telah berakhir") || msg.includes("Sesi berakhir") || msg.includes("token tidak valid") || msg.includes("Failed to fetch") || msg.includes("fetch")) {
         console.warn("fetchMasterData: Sesi pengguna berakhir atau tidak valid.");
       } else {
         console.error("fetchMasterData error", error);
       }
    }
  };

  useEffect(() => {
    if (!isLoggedIn) return;
    const timer = setTimeout(() => {
      fetchMasterData();
    }, 300);
    return () => clearTimeout(timer);
  }, [currentUser?.uid, isLoggedIn]);

  const fetchTasks = async () => {
    if (!getAuthToken()) return;
    if (!selectedProject) {
      setTasks([]);
      return;
    }
    const isAdmin = hasPermission(
      effectiveRole,
      "configuration",
      "update",
      false,
      currentUserProfile?.permissions,
    );
    const effectiveUserId = currentUser?.uid || user?.uid;

    try {
      const data = await apiRequest(`/api/projects/${selectedProject.id}/tasks`);
      if (data.status === "success") {
        let allTasks = data.data as Task[];
        const uniqueAllTasks = Array.from(
          new Map((allTasks || []).filter((t) => t && t.id).map((t) => [t.id, t])).values()
        );
        setAllProjectTasksForStats(uniqueAllTasks);

        const effectiveUsername = currentUser?.username || currentUserProfile?.username;
        const effectiveEmail = currentUser?.email || currentUserProfile?.email;
        const effectiveDisplayName = currentUser?.displayName || currentUserProfile?.displayName;
        const effectiveNamaLengkap = (currentUser as any)?.nama_lengkap || (currentUserProfile as any)?.nama_lengkap;

        const validIdentifiers = [
          effectiveUserId,
          currentUser?.uid,
          currentUser?.id,
          currentUserProfile?.uid,
          currentUserProfile?.id,
          effectiveUsername,
          effectiveEmail,
          effectiveDisplayName,
          effectiveNamaLengkap
        ].filter(Boolean);

        let filteredTasks = uniqueAllTasks.filter((t) => {
          if (!t) return false;
          const aId = t.assigneeId;
          const rId = t.reporterId;
          return (
            validIdentifiers.includes(aId) ||
            validIdentifiers.includes(rId)
          );
        });

        const uniqueFilteredTasks = Array.from(
          new Map((filteredTasks || []).filter((t) => t && t.id).map((t) => [t.id, t])).values()
        );
        setTasks(uniqueFilteredTasks);
      }
    } catch (e: any) {
      const errorMsg = e?.message || String(e);
      if (errorMsg.includes("Failed to fetch") || errorMsg.includes("fetch")) {
        console.warn("fetchTasks: Server is temporarily unavailable or connection is offline. Will automatically retry.");
      } else {
        console.error("fetchTasks error:", e);
      }
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchTasks();
    }, 300);
    return () => clearTimeout(timer);
  }, [selectedProject?.id, userRole, currentUser?.uid]);

  const realTimeRefs = useRef<any>({});

  useEffect(() => {
    realTimeRefs.current = {
      fetchProjects,
      fetchAllUsers,
      fetchMasterData,
      fetchTasks,
      fetchSprints,
      fetchActivityLogs,
      fetchComments,
      fetchNotifications,
      selectedProject
    };
  });

  const [socketConnected, setSocketConnected] = useState(false);

  useEffect(() => {
    // Vercel friendly socket config
    let socket: any;
    try {
      socket = io({
        reconnectionAttempts: 3,
        timeout: 5000,
        transports: ['polling', 'websocket']
      });
      
      // Safe handlers to prevent unhandled rejections
      socket.on("error", (err: any) => {
        console.warn("[SOCKET ERROR] Safe socket error caught internally:", err);
      });
      socket.on("connect_error", (err: any) => {
        console.warn("[SOCKET ERROR] Safe socket connect_error caught internally:", err);
      });
      
      socket.onerror = (err: any) => {
        console.warn("[SOCKET ERROR] Native-like socket onerror caught internally:", err);
      };
      socket.onclose = () => {

      };

      if (socket.io) {
        socket.io.on("error", (err: any) => {
          console.warn("[SOCKET IO ERROR] Engine.io error suppressed:", err);
        });
      }
      if (socket.io && socket.io.engine) {
        socket.io.engine.on("error", (err: any) => {
          console.warn("[SOCKET ENGINE ERROR] Engine error suppressed:", err);
        });
        socket.io.engine.onerror = (err: any) => {
          console.warn("[SOCKET ENGINE ERROR] Engine onerror suppressed:", err);
        };
        socket.io.engine.onclose = () => {

        };
      }
    } catch (err) {
      console.error("[SOCKET FATAL] Failed to initialize socket safely:", err);
      return;
    }
    
    setSocket(socket);

    
    socket.on("FORCE_LOGOUT_EVENT", (data: any) => {
      if (data.browserSessionId === BROWSER_SESSION_ID) {

        return;
      }
      const storedUser = localStorage.getItem("sessionUser");
      const activeUser = currentUser || (storedUser ? JSON.parse(storedUser) : null);
      const currentUserId = activeUser?.id || activeUser?.uid;
      const currentToken = localStorage.getItem("lanpro_jwt_token");
      
      if (currentUserId && currentUserId.toString() === data.userId && currentToken !== data.newToken) {
        toast.error("Sesi Anda telah diakhiri karena login di perangkat/browser lain.");
        handleLogout(true);
      }
    });

    socket.on("connect", () => {

       setSocketConnected(true);
    });
    
    socket.on("connect_error", (err) => {
       // Suppress loud socket errors to avoid Vercel console spam
       setSocketConnected(false);
    });
    
    socket.on("disconnect", () => {
       setSocketConnected(false);
    });

    socket.on("project_updated", (event) => {
       const refs = realTimeRefs.current;
       if (event && event.projectId === refs.selectedProject?.id) {
          refs. fetchTasks();
       }
    });

    socket.on("data_changed", (event) => {
       const path = event.path || "";
       const refs = realTimeRefs.current;
       
       if (path.includes("/tasks") || path.includes("/sprint-tasks")) {
          if (refs.selectedProject) {
              refs. fetchTasks();
              refs.fetchSprints();
              refs.fetchActivityLogs();
          }
       }
       if (path.includes("/activity")) {
          if (refs.selectedProject) refs.fetchActivityLogs();
       }
       if (path.includes("/comments")) {
          if (refs.selectedProject) {
              refs.fetchComments();
              refs.fetchActivityLogs();
          }
       }
       if (path.includes("/projects") && !path.includes("/tasks") && !path.includes("/sprints")) {
          refs.fetchProjects();
       }
       if (path.includes("/users") || path.includes("/project-members")) {
          refs.fetchAllUsers();
       }
       if (path.includes("/sprints")) {
          if (refs.selectedProject) {
              refs.fetchSprints();
              refs.fetchActivityLogs();
          }
       }
       if (path.includes("/master-data")) {
          // Debounce master data fetch
          if (!refs.masterDataDebounceTimer) {
             refs.masterDataDebounceTimer = setTimeout(() => {
                 refs.fetchMasterData();
                 refs.masterDataDebounceTimer = null;
             }, 1000);
          }
       }
       if (path.includes("/notifications")) {
          // Debounce notifications fetch
          if (!refs.notificationsDebounceTimer) {
             refs.notificationsDebounceTimer = setTimeout(() => {
                 refs.fetchNotifications();
                 refs.notificationsDebounceTimer = null;
             }, 1000);
          }
       }
       if (path.includes("/db-query")) {
          // A raw query might have modified anything. Safest is to refresh all.
          refs.fetchProjects();
          refs.fetchAllUsers();
          
          // Debounce master data
          if (!refs.masterDataDebounceTimer) {
             refs.masterDataDebounceTimer = setTimeout(() => {
                 refs.fetchMasterData();
                 refs.masterDataDebounceTimer = null;
             }, 1000);
          }

          if (refs.selectedProject) {
              refs. fetchTasks();
              refs.fetchSprints();
              refs.fetchActivityLogs();
              refs.fetchComments();
          }

          // Debounce notifications
          if (!refs.notificationsDebounceTimer) {
             refs.notificationsDebounceTimer = setTimeout(() => {
                 refs.fetchNotifications();
                 refs.notificationsDebounceTimer = null;
             }, 1000);
          }
       }
    });

    socket.on("PRESENCE_UPDATE", (users: any[]) => {
       // Deprecated in favor of global presence_sync
    });

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, []);

  // Serverless Heartbeat Fallback
  useEffect(() => {
    if (!currentUser) return;
    let intervalId;
    if (!socketConnected) {
      const pingHeartbeat = async () => {
        try {
          await apiRequest('/api/users/heartbeat', { method: 'POST' });
          fetchAllUsers(); // GET latest users including their lastSeen
        } catch(e) {
          // silent fail
        }
      };
      pingHeartbeat();
      intervalId = setInterval(pingHeartbeat, 30000); // 30 seconds
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [socketConnected, currentUser]);

  useEffect(() => {
    if (!socket || !selectedProject || !currentUser) return;
    
    // Join Project Room for real-time presence (v1.3)
    socket.emit("join_project", { 
      projectId: selectedProject.id, 
      user: currentUser 
    });

    return () => {
      socket.emit("leave_project", { 
        projectId: selectedProject.id,
        userId: currentUser.uid || currentUser.id
      });
    };
  }, [socket, selectedProject?.id, currentUser?.id]);

  useEffect(() => {
    let isMounted = true;

    const fetchMembers = async () => {
      if (!isLoggedIn || !getAuthToken()) return;
      try {
        const data = await apiRequest("/api/users");
        if (data.status === "success") {
          const allUsersList = data.data || [];
          if (selectedProject && Array.isArray(selectedProject.members) && selectedProject.members.length > 0) {
            const m = allUsersList.filter((u: any) => selectedProject.members.includes(u.uid) || selectedProject.members.includes(u.id));
            if (isMounted) setProjectMembers(m.length > 0 ? m : allUsersList);
          } else {
            if (isMounted) setProjectMembers(allUsersList);
          }
        }
      } catch (error: any) {
        const msg = error?.message || String(error);
        if (msg.includes("Sesi Anda telah berakhir") || msg.includes("Sesi berakhir") || msg.includes("token tidak valid") || msg.includes("Failed to fetch") || msg.includes("fetch") || msg.includes("Token autentikasi") || msg.includes("Akses ditolak")) {
          console.warn("fetchMembers: Sesi pengguna berakhir atau belum terautentikasi.");
        } else {
          console.error("fetchMembers error:", error);
        }
      }
    };
    fetchMembers();
    return () => {
      isMounted = false;
    };
  }, [selectedProject?.members?.join(','), selectedProject?.id, isLoggedIn]);

  const fetchSprints = async () => {
    if (!getAuthToken()) return;
    if (!selectedProject) {
      setSprints([]);
      return;
    }

    try {
      const data = await apiRequest(`/api/projects/${selectedProject.id}/sprints`);
      if (data.status === "success") {
         setSprints(data.data as Sprint[]);
      }
    } catch (e: any) {
      const msg = e?.message || String(e);
      if (msg.includes("429") || msg.includes("Server error: 429")) {
        console.warn("fetchSprints: Terlalu banyak permintaan (429). Mencoba lagi dalam 5 detik...");
        setTimeout(fetchSprints, 5000);
        return;
      }
      if (msg.includes("Sesi Anda telah berakhir") || msg.includes("Sesi berakhir") || msg.includes("token tidak valid") || msg.includes("Failed to fetch") || msg.includes("fetch")) {
        console.warn("fetchSprints: Sesi pengguna berakhir atau tidak valid.");
      } else {
        console.error("fetchSprints error:", e);
      }
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchSprints();
    }, 300);
    return () => clearTimeout(timer);
  }, [selectedProject?.id]);

  useEffect(() => {
    if (newProjectName && !newProjectKey) {
      const suggestedKey = newProjectName
        .split(" ")
        .filter((word) => word.length > 0)
        .map((word) => word[0])
        .filter((char) => char && char.match(/[a-zA-Z]/))
        .join("")
        .toUpperCase()
        .slice(0, 5);
      if (suggestedKey) {
        setNewProjectKey(suggestedKey);
      }
    }
  }, [newProjectName]);

  const fetchComments = async () => {
    if (!getAuthToken()) return;
    if (!selectedProject || !selectedTaskForDetail) {
      setComments([]);
      return;
    }
    try {
      const data = await apiRequest(`/api/projects/${selectedProject.id}/tasks/${selectedTaskForDetail.id}/comments`);
      if (data.status === "success") {
        setComments(data.data as Comment[]);
      }
    } catch (error: any) {
      const msg = error?.message || String(error);
      if (msg.includes("Sesi Anda telah berakhir") || msg.includes("Sesi berakhir") || msg.includes("token tidak valid") || msg.includes("Failed to fetch") || msg.includes("fetch")) {
        console.warn("fetchComments: Sesi pengguna berakhir atau tidak valid.");
      } else {
        console.error("fetchComments error:", error);
      }
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchComments();
    }, 300);
    return () => clearTimeout(timer);
  }, [selectedProject?.id, selectedTaskForDetail?.id]);

  const fetchActivityLogs = async () => {
    if (!getAuthToken()) return;
    if (!selectedProject) {
      setActivityLogs([]);
      return;
    }
    try {
      const data = await apiRequest(`/api/projects/${selectedProject.id}/activity`);
      if (data.status === "success") {
        setActivityLogs(data.data as ActivityLog[]);
      }
    } catch (error: any) {
      const msg = error?.message || String(error);
      if (msg.includes("429") || msg.includes("Server error: 429")) {
        console.warn("fetchActivityLogs: Terlalu banyak permintaan (429). Mencoba lagi dalam 5 detik...");
        setTimeout(fetchActivityLogs, 5000);
        return;
      }
      if (msg.includes("Sesi Anda telah berakhir") || msg.includes("Sesi berakhir") || msg.includes("token tidak valid") || msg.includes("Failed to fetch") || msg.includes("fetch")) {
        console.warn("fetchActivityLogs: Sesi pengguna berakhir atau tidak valid.");
      } else {
        console.error("fetchActivityLogs error:", error);
      }
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchActivityLogs();
    }, 300);
    return () => clearTimeout(timer);
  }, [selectedProject?.id]);

  const fetchNotifications = async () => {
    if (!getAuthToken()) return;
    if (!user && !currentUser) return;
    const effectiveUserId = currentUser?.uid || user?.uid;
    if (!effectiveUserId) return;

    try {
      const data = await apiRequest(`/api/users/${effectiveUserId}/notifications`);
      if (data.status === "success") {
        // Map isRead if needed, DB uses isRead
        setNotifications(data.data.map((d: any) => ({ ...d, read: d.isRead === 1 || d.read })));
      }
    } catch (error: any) {
      const msg = error?.message || String(error);
      if (msg.includes("Sesi Anda telah berakhir") || msg.includes("Sesi berakhir") || msg.includes("token tidak valid") || msg.includes("Failed to fetch") || msg.includes("fetch")) {
        console.warn("fetchNotifications: Sesi pengguna berakhir atau tidak valid.");
      } else {
        console.error("fetchNotifications error:", error);
      }
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchNotifications();
    }, 300);
    return () => clearTimeout(timer);
  }, [currentUser?.uid]);

  const handleSyncAll = async () => {
    setIsSyncing(true);
    toast.info("Memulai sinkronisasi data dengan server...");
    try {
      await Promise.all([
        fetchProjects(),
        fetchMasterData(),
        fetchAllUsers()
      ]);
      if (selectedProject) {
        await Promise.all([
          fetchTasks(),
          fetchSprints(),
          fetchActivityLogs()
        ]);
      }
      setLastSyncedTime(new Date().toLocaleTimeString());
      setCacheStats(CacheManager.getStats());
      toast.success("Sinkronisasi data berhasil diselesaikan!");
    } catch (e: any) {
      toast.error("Gagal sinkronisasi: " + (e?.message || e));
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    if (isSyncModalOpen) {
      setCacheStats(CacheManager.getStats());
    }
  }, [isSyncModalOpen]);

  const handleCreateSprint = async () => {
    if (!selectedProject || !newSprintName.trim()) return;

    if (newSprintStartDate && newSprintEndDate) {
      if (new Date(newSprintStartDate) > new Date(newSprintEndDate)) {
        setConfirmAction({
          isOpen: true,
          title: "Validasi Tanggal",
          message:
            "Tanggal selesari target fase tidak boleh sebelum tanggal mulai target fase (tidak bisa backdate).",
          onConfirm: () => {},
          isAlert: true,
        });
        return;
      }
    }

    try {
      const data = await apiRequest(`/api/projects/${selectedProject.id}/sprints`, {
        method: "POST",
        body: {
          name: newSprintName,
          goal: newSprintGoal,
          startDate: newSprintStartDate,
          endDate: newSprintEndDate,
          status: "planned"
        }
      });
      
      const sprintId = data.data.id;

      // Assign selected backlog items

      // Sprint backlog assignment
      if (selectedSprintBacklog.size > 0) {
        const promises = Array.from(selectedSprintBacklog as Set<string>).map(
          (taskId) =>
            apiRequest(`/api/projects/${selectedProject.id}/tasks/${taskId}`, {
              method: "PUT",
              body: { sprintId }
            })
              .then(() => { /* task updated */ })
.catch((err) => console.error("Failed to update task:", taskId, err))
        );
        await Promise.all(promises);

        setTasks((prevTasks) =>
          prevTasks.map((t) =>
            selectedSprintBacklog.has(t.id) ? { ...t, sprintId } : t
          )
        );
      }

      setNewSprintName("");
      setNewSprintGoal("");
      setSelectedSprintBacklog(new Set());
      setIsNewSprintModalOpen(false);
      fetchSprints();
      toast.success("Sprint created successfully");
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Failed to create sprint");
    }
  };

  const handleUpdateSprint = async () => {
    if (!selectedProject || !editingSprint) return;

    if (editingSprint.startDate && editingSprint.endDate) {
      if (
        ensureDate(editingSprint.startDate) > ensureDate(editingSprint.endDate)
      ) {
        setConfirmAction({
          isOpen: true,
          title: "Validasi Tanggal",
          message:
            "Tanggal selesai target fase tidak boleh sebelum tanggal mulai target fase (tidak bisa backdate).",
          onConfirm: () => {},
          isAlert: true,
        });
        return;
      }
    }

    try {
      const data = await apiRequest(`/api/projects/${selectedProject.id}/sprints/${editingSprint.id}`, {
        method: "PUT",
        body: {
          name: editingSprint.name,
          goal: editingSprint.goal,
          startDate: editingSprint.startDate,
          endDate: editingSprint.endDate,
          status: editingSprint.status,
        }
      });
      if (data.status !== "success") throw new Error(data.message);
      
      fetchSprints();

      setIsEditSprintModalOpen(false);
      toast.success("Sprint updated successfully");
    } catch (e: any) {
      console.error(e);
      toast.error("Failed to update sprint: " + (e.message || e));
    }
  };

  const handleStartSprint = async (sprintId: string) => {
    if (!selectedProject) return;
    if (
      !hasPermission(
        effectiveRole,
        "planning",
        "update",
        false,
        currentUserProfile?.permissions,
      )
    ) {
      toast.error("Anda tidak memiliki izin untuk memulai sprint.");
      return;
    }

    try {
      const data = await apiRequest(`/api/projects/${selectedProject.id}/sprints/${sprintId}`, {
        method: "PUT",
        body: { status: "active" }
      });
      if (data.status === "success") {
        fetchSprints();
        toast.success("Sprint successfully started.");
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Failed to start sprint");
    }
  };

  const handleCompleteSprint = async (sprintId: string) => {
    if (!selectedProject) return;
    if (
      !hasPermission(
        effectiveRole,
        "planning",
        "update",
        false,
        currentUserProfile?.permissions,
      )
    ) {
      toast.error("Anda tidak memiliki izin untuk menyelesaikan sprint.");
      return;
    }

    const sprintToComplete = sprints.find((s) => s.id === sprintId);
    if (!sprintToComplete) return;

    setConfirmAction({
      isOpen: true,
      title: "Complete Sprint",
      message: `Are you sure you want to complete "${sprintToComplete.name}"? Incomplete tasks will be moved back to the backlog automatically.`,
      onConfirm: async () => {
        try {
          const sprintTasks = tasks.filter((t) => t.sprintId === sprintId);
          const undoneTasks = sprintTasks.filter(
            (t) =>
              !t.status.toLowerCase().includes("done") &&
              !t.status.toLowerCase().includes("completed"),
          );

          if (undoneTasks.length > 0) {
            const promises = undoneTasks.map((t) =>
              apiRequest(`/api/projects/${selectedProject.id}/tasks/${t.id}`, {
                method: "PUT",
                body: { sprintId: null }
              })
            );
            await Promise.all(promises);
            await fetchTasks();
          }

          const data = await apiRequest(`/api/projects/${selectedProject.id}/sprints/${sprintId}`, {
            method: "PUT",
            body: { status: "completed" }
          });
          
          if (data.status === "success") {
            fetchSprints();

            await logActivity(
              "sprint_completed",
              `Sprint ${sprintToComplete.name} has been completed.`,
            );
            toast.success("Sprint successfully completed.");
          }
        } catch (e: any) {
          console.error(e);
          toast.error(e.message || "Failed to complete sprint");
        }
      },
    });
  };

  const handleDeleteSprint = async (sprintId: string) => {
    if (!selectedProject) return;

    // Check if there are tasks in this sprint
    const sprintTasks = tasks.filter((t) => t.sprintId === sprintId);

    setConfirmAction({
      isOpen: true,
      title: "Delete Phase",
      message: `Are you sure you want to delete this phase? ${sprintTasks.length > 0 ? `The ${sprintTasks.length} tasks in it will be moved back to the backlog.` : ""}`,
      onConfirm: async () => {
        try {
          // 1. Move tasks back to backlog
          const promises = sprintTasks.map((t) =>
            apiRequest(`/api/projects/${selectedProject.id}/tasks/${t.id}`, {
              method: "PUT",
              body: { sprintId: null }
            })
          );
          await Promise.all(promises);

          // 2. Delete the sprint
          await apiRequest(`/api/projects/${selectedProject.id}/sprints/${sprintId}`, {
            method: "DELETE"
          });

          await fetchTasks();
          fetchSprints();

          setConfirmAction(null);
          toast.success("Phase deleted successfully");
        } catch (e: any) {
          console.error(e);
          toast.error(e.message || "Failed to delete phase");
        }
      },
    });
  };

  const moveTaskToSprint = async (taskId: string, sprintId: string | null) => {
    if (!selectedProject) return;

    const task = tasks.find((t) => t.id === taskId);
    if (task) {
      const isOwner =
        task.assigneeId === user?.uid ||
        task.reporterId === currentUserProfile?.uid;
      if (
        !hasPermission(
          effectiveRole,
          "planning",
          "update",
          isOwner,
          currentUserProfile?.permissions,
        )
      ) {
        toast.error("Failed: You do not have permission to move this task.");
        return;
      }

      if (sprintId) {
        const targetSprint = sprints.find((s) => s.id === sprintId);
        if (targetSprint && targetSprint.startDate && targetSprint.endDate) {
          const sprintStart = ensureDate(targetSprint.startDate);
          const sprintEnd = ensureDate(targetSprint.endDate);

          if (task.startDate || task.endDate || task.dueDate) {
            const tStart = task.startDate ? ensureDate(task.startDate) : null;
            const tEnd = task.endDate
              ? ensureDate(task.endDate)
              : task.dueDate
                ? ensureDate(task.dueDate)
                : null;

            // Set boundaries for sprint times (start of day, end of day)
            sprintStart.setHours(0, 0, 0, 0);
            sprintEnd.setHours(23, 59, 59, 999);

            if (tStart && tEnd) {
              if (tStart < sprintStart || tEnd > sprintEnd) {
                setConfirmAction({
                  isOpen: true,
                  title: "Validasi Tanggal",
                  message: `Tanggal task (${format(tStart, "dd MMM")} - ${format(tEnd, "dd MMM")}) di luar periode fase ini (${format(sprintStart, "dd MMM")} - ${format(sprintEnd, "dd MMM")}).`,
                  onConfirm: () => {},
                  isAlert: true,
                });
                return;
              }
            } else if (tStart) {
              if (tStart < sprintStart || tStart > sprintEnd) {
                setConfirmAction({
                  isOpen: true,
                  title: "Validasi Tanggal",
                  message: `Waktu mulai task (${format(tStart, "dd MMM")}) di luar periode fase ini (${format(sprintStart, "dd MMM")} - ${format(sprintEnd, "dd MMM")}).`,
                  onConfirm: () => {},
                  isAlert: true,
                });
                return;
              }
            } else if (tEnd) {
              if (tEnd < sprintStart || tEnd > sprintEnd) {
                setConfirmAction({
                  isOpen: true,
                  title: "Validasi Tanggal",
                  message: `Eksekusi task melebih timeline fase ini (${format(sprintStart, "dd MMM")} - ${format(sprintEnd, "dd MMM")}).`,
                  onConfirm: () => {},
                  isAlert: true,
                });
                return;
              }
            }
          }
        }
      }
    }

    try {
      const data = await apiRequest(`/api/projects/${selectedProject.id}/tasks/${taskId}`, {
        method: "PUT",
        body: { sprintId }
      });
      if (data.status !== "success") throw new Error(data.message);

      // Update local state immediately
      setTasks((prevTasks) =>
        prevTasks.map((t) => (t.id === taskId ? { ...t, sprintId } : t)),
      );
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Failed to move task");
    }
  };

  const bulkMoveTasksToSprint = async (
    taskIds: string[],
    sprintId: string | null,
  ) => {
    if (!selectedProject) return;

    if (
      !hasPermission(
        effectiveRole,
        "planning",
        "update",
        false,
        currentUserProfile?.permissions,
      )
    ) {
      toast.error("Failed: You do not have permission to perform this action.");
      return;
    }

    if (sprintId) {
      const targetSprint = sprints.find((s) => s.id === sprintId);
      if (targetSprint && targetSprint.startDate && targetSprint.endDate) {
        const sprintStart = ensureDate(targetSprint.startDate);
        const sprintEnd = ensureDate(targetSprint.endDate);
        sprintStart.setHours(0, 0, 0, 0);
        sprintEnd.setHours(23, 59, 59, 999);

        for (const taskId of taskIds) {
          const task = tasks.find((t) => t.id === taskId);
          if (task && (task.startDate || task.endDate || task.dueDate)) {
            const tStart = task.startDate ? ensureDate(task.startDate) : null;
            const tEnd = task.endDate
              ? ensureDate(task.endDate)
              : task.dueDate
                ? ensureDate(task.dueDate)
                : null;

            if (tStart && tEnd && (tStart < sprintStart || tEnd > sprintEnd)) {
              setConfirmAction({
                isOpen: true,
                title: "Validasi Tanggal",
                message: `Ada task yang melewati timeline fase ini (${format(sprintStart, "dd MMM")} - ${format(sprintEnd, "dd MMM")}).`,
                onConfirm: () => {},
                isAlert: true,
              });
              return;
            } else if (tStart && (tStart < sprintStart || tStart > sprintEnd)) {
              setConfirmAction({
                isOpen: true,
                title: "Validasi Tanggal",
                message: `Waktu mulai task di luar periode fase ini (${format(sprintStart, "dd MMM")} - ${format(sprintEnd, "dd MMM")}).`,
                onConfirm: () => {},
                isAlert: true,
              });
              return;
            } else if (tEnd && (tEnd < sprintStart || tEnd > sprintEnd)) {
              setConfirmAction({
                isOpen: true,
                title: "Validasi Tanggal",
                message: `Eksekusi task melebih timeline fase ini (${format(sprintStart, "dd MMM")} - ${format(sprintEnd, "dd MMM")}).`,
                onConfirm: () => {},
                isAlert: true,
              });
              return;
            }
          }
        }
      }
    }

    try {
      const promises = taskIds.map((taskId) =>
        apiRequest(`/api/projects/${selectedProject.id}/tasks/${taskId}`, {
          method: "PUT",
          body: { sprintId }
        })
      );
      await Promise.all(promises);
      await fetchTasks();
      toast.success(`${taskIds.length} tasks moved successfully`);
      setSelectedTaskIds(new Set());
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Failed to move tasks");
    }
  };

  const [newProjectDescription, setNewProjectDescription] = useState("");

  const handleCreateProject = async () => {
    const effectiveUserId = currentUser?.uid || user?.uid;
    if (!effectiveUserId || !newProjectName.trim() || !newProjectKey.trim()) {
      if (!effectiveUserId) toast.error("Sesi tidak ditemukan");
      return;
    }
    try {
      const data = await apiRequest("/api/projects", {
        method: "POST",
        body: {
          name: newProjectName,
          projectKey: newProjectKey.toUpperCase(),
          description: newProjectDescription,
          ownerId: effectiveUserId,
          status: "Active",
        }
      });

      if (data.status === "success") {
        setNewProjectName("");
        setNewProjectKey("");
        setNewProjectDescription("");
        setIsNewProjectModalOpen(false);
        toast.success("Project created successfully");
        fetchProjects();
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Failed to create project");
    }
  };

  const handleCreateTask = async () => {
    const activeUid = currentUser?.uid || user?.uid;
    if (!selectedProject || !newTaskTitle.trim() || !activeUid) return;

    if (
      !hasPermission(
        effectiveRole,
        "issueList",
        "create",
        false,
        currentUserProfile?.permissions,
      )
    ) {
      toast.error("Anda tidak memiliki izin untuk menambahkan tugas baru.");
      return;
    }

    if (newTaskParentId && (newTaskStartDate || newTaskEndDate)) {
      const parentEpic = tasks.find(t => t.id === newTaskParentId);
      if (parentEpic && (parentEpic.startDate || parentEpic.endDate)) {
        const epicStart = parentEpic.startDate ? new Date(parentEpic.startDate).getTime() : null;
        const epicEnd = parentEpic.endDate ? new Date(parentEpic.endDate).getTime() : null;
        const taskStart = newTaskStartDate ? new Date(newTaskStartDate).getTime() : null;
        const taskEnd = newTaskEndDate ? new Date(newTaskEndDate).getTime() : null;

        if (epicStart && taskStart && taskStart < epicStart) {
          setConfirmAction({
            isOpen: true,
            title: "Validasi Batas Jadwal Epic Timeline",
            message: "Peringatan: Tanggal mulai task tidak boleh lebih awal dari rentang tanggal Epic induk.",
            onConfirm: () => {},
            isAlert: true,
          });
          return;
        }
        if (epicEnd && taskStart && taskStart > epicEnd) {
          setConfirmAction({
            isOpen: true,
            title: "Validasi Batas Jadwal Epic Timeline",
            message: "Peringatan: Tanggal mulai task tidak boleh melebihi rentang tanggal Epic induk.",
            onConfirm: () => {},
            isAlert: true,
          });
          return;
        }
        if (epicStart && taskEnd && taskEnd < epicStart) {
          setConfirmAction({
            isOpen: true,
            title: "Validasi Batas Jadwal Epic Timeline",
            message: "Peringatan: Tanggal selesai task tidak boleh lebih awal dari rentang tanggal Epic induk.",
            onConfirm: () => {},
            isAlert: true,
          });
          return;
        }
        if (epicEnd && taskEnd && taskEnd > epicEnd) {
          setConfirmAction({
            isOpen: true,
            title: "Validasi Batas Jadwal Epic Timeline",
            message: "Peringatan: Tanggal selesai task tidak boleh melebihi rentang tanggal Epic induk.",
            onConfirm: () => {},
            isAlert: true,
          });
          return;
        }
      }
    }

    if (newTaskStartDate && newTaskEndDate) {
      if (new Date(newTaskStartDate) > new Date(newTaskEndDate)) {
        setConfirmAction({
          isOpen: true,
          title: "Validasi Tanggal",
          message:
            "Tanggal selesai tugas tidak boleh sebelum tanggal mulai tugas (tidak bisa backdate).",
          onConfirm: () => {},
          isAlert: true,
        });
        return;
      }
    }

    try {
      const assigneeIsEmail = newTaskAssigneeId.includes("@");

      const data = await apiRequest(`/api/projects/${selectedProject.id}/tasks`, {
        method: "POST",
        body: {
          title: newTaskTitle,
          description: newTaskDescription,
          acceptanceCriteria: newTaskAcceptanceCriteria,
          storyPoints: newTaskStoryPoints,
          projectRisk: newTaskProjectRisk,
          status: newTaskStatus || "todo",
          type: newTaskType,
          parentId: newTaskParentId || null,
          sprintId: newTaskSprintId || null,
          assigneeId: assigneeIsEmail ? null : newTaskAssigneeId || null,
          reporterId: activeUid,
          priority: newTaskPriority || "medium",
          startDate: newTaskStartDate || null,
          endDate: newTaskEndDate || null,
        }
      });
      
      const createdTaskKey = data.data.taskKey;

      if (data && data.data) {
        const createdTask = data.data;
        setTasks((prev) => [createdTask, ...prev.filter((t) => t.id !== createdTask.id)]);
        setAllProjectTasksForStats((prev) => [createdTask, ...prev.filter((t) => t.id !== createdTask.id)]);
      }

      await logActivity(
        "task_created",
        `Created task ${createdTaskKey}: ${newTaskTitle}`,
      );

      await fetchTasks(); // Refresh list

      setNewTaskTitle("");
      setNewTaskDescription("");
      setNewTaskAcceptanceCriteria("");
      setNewTaskLabels("");
      setNewTaskStoryPoints(0);
      setNewTaskBusinessValue("");
      setNewTaskProjectRisk("");
      setNewTaskFigmaUrl("");
      setNewTaskEnvironment("");
      setNewTaskParentId("");
      setNewTaskStartDate("");
      setNewTaskEndDate("");
      setNewTaskCategory("");
      setNewTaskRelease("");
      setIsNewTaskModalOpen(false);
      toast.success("Data added successfully");
    } catch (e: any) {
      console.error(e, 'error', `projects/${selectedProject.id}/tasks`);
      const errMessage = e?.message || "";
      const errCode = e?.data?.code || "";
      if (errCode === "EPIC_TIMELINE_EXCEEDED" || errMessage.includes("Epic") || errMessage.includes("melebihi")) {
        setConfirmAction({
          isOpen: true,
          title: "Validasi Batas Jadwal Epic Timeline",
          message: "Peringatan: Tanggal task tidak boleh melewati rentang tanggal Epic induk!",
          onConfirm: () => {},
          isAlert: true,
        });
      } else {
        toast.error(errMessage || "Failed to create task");
      }
    }
  };

  const handleQuickCreate = async (title: string, type: string) => {
    const activeUid = currentUser?.uid || user?.uid;
    if (!selectedProject || !title.trim() || !activeUid) return;
    try {
      const data = await apiRequest(`/api/projects/${selectedProject.id}/tasks`, {
        method: "POST",
        body: {
          title: title,
          status: "To Do",
          type: type,
          assigneeId: null,
          priority: "Medium",
          reporterId: activeUid,
        }
      });

      if (data.status === "success" && data.data) {
        const newTask = data.data;
        setTasks((prev) => [newTask, ...prev.filter((t) => t.id !== newTask.id)]);
        setAllProjectTasksForStats((prev) => [newTask, ...prev.filter((t) => t.id !== newTask.id)]);
        await fetchTasks();
        toast.success(`Task ${data.data.taskKey} created successfully`);
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Failed to create task");
    }
  };

  const handleSuggestStoryPoints = async (task: Task) => {
    if (!task.title || !task.description) {
      toast.warning("Please provide title and description for AI estimation.");
      return;
    }

    const toastId = toast.loading("Calculating story points...");
    try {
      const { GoogleGenAI } = await import("@google/genai");
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

      const prompt = `Analyze this task and suggest story points (Fibonacci: 1, 2, 3, 5, 8, 13).
Task Title: ${task.title}
Description: ${task.description}
Type: ${task.type}

Respond ONLY with a single JSON object: {"points": number, "reasoning": "string"}`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        },
      });

      const result = JSON.parse(response.text || "{}");
      if (result.points) {
        toast.success(
          `AI suggests ${result.points} points: ${result.reasoning}`,
          { duration: 5000 },
        );

        // Update task if in edit mode
        const effectiveUserId = currentUser?.uid || user?.uid || "guest";
        if (editingTask && editingTask.id === task.id) {
          setEditingTask({ ...editingTask, storyPoints: result.points });
        } else {
          await apiRequest(`/api/projects/${selectedProject!.id}/tasks/${task.id}`, {
            method: "PUT",
            body: { storyPoints: result.points }
          });
          await fetchTasks();
        }
      } else {
        throw new Error("Invalid response from AI");
      }
    } catch (e) {
      console.error(e);
      toast.error("AI Estimation failed");
    } finally {
      toast.dismiss(toastId);
    }
  };

  const handleAddExternalLink = async () => {
    if (!selectedTaskForDetail || !newExternalLinkTitle || !newExternalLinkUrl)
      return;

    const newLink = {
      id: crypto.randomUUID(),
      title: newExternalLinkTitle,
      url: newExternalLinkUrl,
      createdAt: new Date(),
    };

    const updatedLinks = [
      ...(selectedTaskForDetail.externalLinks || []),
      newLink,
    ];
    await updateTaskField(
      selectedTaskForDetail.id,
      "externalLinks",
      updatedLinks,
    );
    setNewExternalLinkTitle("");
    setNewExternalLinkUrl("");
    setIsAddingExternalLink(false);
  };

  const removeExternalLink = async (taskId: string, linkId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task || !task.externalLinks) return;
    const updatedLinks = task.externalLinks.filter((l) => l.id !== linkId);
    await updateTaskField(taskId, "externalLinks", updatedLinks);
  };

  const toggleBlockedStatus = async (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    await updateTaskField(taskId, "isBlocked", !task.isBlocked);
  };

  const handleUpdateTask = async () => {
    if (!selectedProject || !editingTask) return;

    if (editingTask.startDate && editingTask.endDate) {
      if (new Date(editingTask.startDate) > new Date(editingTask.endDate)) {
        setConfirmAction({
          isOpen: true,
          title: "Validasi Tanggal",
          message:
            "Tanggal selesai tugas tidak boleh sebelum tanggal mulai tugas (tidak bisa backdate).",
          onConfirm: () => {},
          isAlert: true,
        });
        return;
      }
    }

    // Check blockers if status is changed to Done
    if (!checkTaskBlockers(editingTask.id, editingTask.status)) return;

    try {
      const assigneeIsEmail = editingTask.assigneeId?.includes("@");

      const data = await apiRequest(`/api/projects/${selectedProject.id}/tasks/${editingTask.id}`, {
        method: "PUT",
        body: {
          title: editingTask.title,
          status: editingTask.status,
          type: editingTask.type,
          priority: editingTask.priority,
          assigneeId: assigneeIsEmail ? null : editingTask.assigneeId || null,
          dueDate: editingTask.dueDate || null,
        }
      });
      if (data.status === "success") {
        await await fetchTasks(); // Refresh list

        setIsEditTaskModalOpen(false);
        setEditingTask(null);
        toast.success("Task updated successfully");
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Failed to update task");
    }
  };

  const updateProjectRole = async (userId: string, role: string) => {
    if (!selectedProject) return;
    try {
      const roles = { ...(selectedProject.memberRoles || {}), [userId]: role };
      await apiRequest(`/api/projects/${selectedProject.id}/members`, {
        method: "PUT",
        body: { memberRoles: roles }
      });
      fetchProjects();
    } catch (e: any) {
      console.error(e);
      toast.error("Failed to update member role: " + (e.message || e));
    }
  };

  const removeProjectMember = async (userId: string) => {
    if (!selectedProject) return;
    try {
      const data = await apiRequest(`/api/projects/${selectedProject.id}/members/${userId}`, {
        method: "DELETE"
      });
      if (data.status === "success") {
        toast.success("Member removed from project successfully");
        fetchProjects();
      } else {
        toast.error(data.message || "Failed to remove member");
      }
    } catch (e: any) {
      console.error(e);
      toast.error("Failed to remove member: " + (e.message || e));
    }
  };

  const handleInviteMember = async () => {
    if (!selectedProject) {
      toast.error("No project selected");
      return;
    }
    if (!inviteEmail.trim()) {
      toast.error("Please enter an email address");
      return;
    }

    const toastId = toast.loading("Sending invitation...");
    try {
      const emailToInvite = inviteEmail.trim().toLowerCase();
      // allUsers is available locally from the /api/users fetch
      const userToInvite = allUsers.find(u => u.email === emailToInvite);

      if (!userToInvite) {
        // User not found, add to pending invites
        const pending = selectedProject.pendingInvites || [];
        if (pending.includes(emailToInvite)) {
          toast.error("An invitation is already pending for this email.", {
            id: toastId,
          });
          return;
        }
        await apiRequest(`/api/projects/${selectedProject.id}/invites`, {
          method: "PUT",
          body: { emailToInvite }
        });
        await logActivity(
          "user_invited",
          `Invited ${emailToInvite} to the project (pending registration)`,
        );

        toast.success(`Invitation saved for ${emailToInvite}!`, {
          id: toastId,
        });
        setLastInvitedEmail(emailToInvite);
        setIsInviteModalOpen(false);
        setIsInviteSuccessModalOpen(true);
        setInviteEmail("");
        fetchProjects(); // Refresh!
        return;
      }

      const uid = userToInvite.uid;

      if ((selectedProject.members || []).includes(uid)) {
        toast.error("User is already in the project", { id: toastId });
        return;
      }

      const effectiveUserId = currentUser?.uid || user?.uid || "guest";
      await apiRequest(`/api/projects/${selectedProject.id}/members`, {
        method: "PUT",
        headers: { 
          "x-user-id": effectiveUserId
        },
        body: { newMemberId: uid, newMemberRole: "member" }
      });
      await logActivity("user_added", `Added ${emailToInvite} to the project`);

      toast.success(`Added ${emailToInvite} to the project!`, { id: toastId });
      setLastInvitedEmail(emailToInvite);
      setIsInviteModalOpen(false);
      setIsInviteSuccessModalOpen(true);
      setInviteEmail("");
      fetchProjects();
    } catch (e) {
      console.error("Invite error:", e);
      toast.error("Failed to send invitation. Please check your permissions.", {
        id: toastId,
      });
    }
  };

  const sendInviteEmail = (email: string) => {
    if (!selectedProject) return;
    const inviteLink = window.location.origin;
    const subject = encodeURIComponent(
      `Invitation to join project: ${selectedProject.name}`,
    );
    const body = encodeURIComponent(
      `Hello,\n\nYou have been invited to join the project "${selectedProject.name}".\n\nPlease click the link below to sign in and join the project:\n${inviteLink}\n\nBest regards,\nYour Team`,
    );
    window.open(`mailto:${email}?subject=${subject}&body=${body}`, "_blank");
  };

  const logActivity = async (action: string, details: string, taskId?: string) => {
    const activeUid = currentUser?.uid || user?.uid;
    if (!selectedProject || !activeUid) return;
    try {
      await apiRequest(`/api/projects/${selectedProject.id}/activity`, {
        method: "POST",
        body: { userId: activeUid, action, details, taskId: taskId || null }
      });
      fetchActivityLogs();
    } catch (e) {
      console.error("Failed to log activity", e);
    }
  };

  const handleUpdateProject = async () => {
    if (!editingProject) return;
    try {
      const data = await apiRequest(`/api/projects/${editingProject.id}`, {
        method: "PUT",
        body: {
          name: editingProject.name,
          description: editingProject.description || "",
          status: editingProject.status || "Active",
        }
      });

      if (data.status === "success") {
        setIsEditProjectModalOpen(false);
        setEditingProject(null);
        toast.success("Project updated successfully");
        fetchProjects();
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Failed to update project");
    }
  };

  const handleAddLink = async () => {
    if (!selectedTaskForDetail || !newLinkTitle || !newLinkUrl) return;
    try {
      const activeUid =
        currentUserProfile?.uid || currentUser?.uid || user?.uid;
      const activeUserName =
        currentUserProfile?.displayName ||
        currentUserProfile?.username ||
        currentUser?.displayName ||
        user?.displayName ||
        "Unknown";
      const urlWithProtocol = newLinkUrl.startsWith("http")
        ? newLinkUrl
        : `https://${newLinkUrl}`;
      const newAttachment: Attachment = {
        id: crypto.randomUUID(),
        name: newLinkTitle,
        url: urlWithProtocol,
        type: "link",
        createdAt: new Date().toISOString(),
        uploadedByUserId: activeUid,
        uploadedByName: activeUserName,
      };
      const updatedAttachments = [
        ...(selectedTaskForDetail.attachments || []),
        newAttachment,
      ];
      await updateTaskField(
        selectedTaskForDetail.id,
        "attachments",
        updatedAttachments,
      );
      setSelectedTaskForDetail({
        ...selectedTaskForDetail,
        attachments: updatedAttachments,
      });
      setNewLinkTitle("");
      setNewLinkUrl("");
      setIsAddingLink(false);
      toast.success("Link added successfully");
    } catch (error) {
      console.error(error);
      toast.error("Failed to add link");
    }
  };

  const handleRemoveAttachment = async (attachmentId: string) => {
    if (!selectedTaskForDetail) return;
    const attachment = (selectedTaskForDetail.attachments || []).find((a) => a.id === attachmentId);
    if (!attachment) return;

    setConfirmAction({
      isOpen: true,
      title: "Hapus Lampiran?",
      message: `Apakah Anda yakin ingin menghapus lampiran "${attachment.name}"?`,
      onConfirm: async () => {
        try {
          setConfirmAction(null);
          const updatedAttachments = (
            selectedTaskForDetail.attachments || []
          ).filter((a) => a.id !== attachmentId);
          await updateTaskField(
            selectedTaskForDetail.id,
            "attachments",
            updatedAttachments,
          );
          setSelectedTaskForDetail({
            ...selectedTaskForDetail,
            attachments: updatedAttachments,
          });
          toast.success("Lampiran berhasil dihapus");
        } catch (error: any) {
          console.error(error);
          toast.error("Gagal menghapus lampiran: " + (error.message || error));
        }
      }
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => { toast.error("File attachments are disabled for MySQL backend."); e.target.value = ""; };


  const handleTaskCompletionDependencies = async (completedTaskId: string) => {
    // Find tasks that are blocked by this task
    const blockedTasks = tasks.filter((t) =>
      t.linkedTasks?.some(
        (lt) =>
          lt.targetTaskId === completedTaskId &&
          lt.relationType === "is_blocked_by",
      ),
    );

    for (const task of blockedTasks) {
      await logActivity(
        "task_dependency_updated",
        `Task ${task.key} is now unblocked by completion of ${completedTaskId}`,
      );
      // Notify via toast
      toast.info(
        `Task ${task.key} is now unblocked by completion of ${completedTaskId}`,
      );
    }
  };

  const triggerBugDoneFlow = async (taskToUpdate: Task, newStatusVal: string): Promise<string> => {
    if (!selectedProject) return newStatusVal;

    const taskAny = taskToUpdate as any;
    const isBug = 
      (taskToUpdate.type && taskToUpdate.type.toLowerCase() === 'bug') ||
      (taskAny.taskKey && String(taskAny.taskKey).toUpperCase().startsWith('BUG')) ||
      (taskToUpdate.key && String(taskToUpdate.key).toUpperCase().startsWith('BUG')) ||
      (taskToUpdate.title && taskToUpdate.title.toLowerCase().includes('bug'));

    const isDoneStatus = newStatusVal.toUpperCase() === 'DONE' || newStatusVal.toLowerCase() === 'selesai';
    const targetStatus = (isBug && isDoneStatus) ? "Ready for Retest" : newStatusVal;

    const devName = currentUserProfile?.displayName || user?.displayName || currentUser?.displayName || "Developer";
    const bugKey = taskAny.taskKey || taskToUpdate.key || `BUG-${taskToUpdate.id.slice(0, 4)}`;
    const bugTitle = taskToUpdate.title || "Bug";

    // 1. Update QA Test Case status in localStorage / suites to "Retest"
    try {
      const cachedSuites = localStorage.getItem(`lanpro_qa_suites_${selectedProject.id}`);
      if (cachedSuites) {
        const parsedSuites = JSON.parse(cachedSuites);
        let updatedAny = false;
        const updatedSuites = parsedSuites.map((suite: any) => ({
          ...suite,
          cases: suite.cases.map((c: any) => {
            if (
              c.linkedBugKey === bugKey ||
              c.linkedBugKey === taskToUpdate.id ||
              c.linkedBugKey === taskToUpdate.key ||
              c.linkedBugKey === taskAny.taskKey
            ) {
              updatedAny = true;
              return { ...c, status: "Retest" };
            }
            return c;
          })
        }));

        if (updatedAny) {
          localStorage.setItem(`lanpro_qa_suites_${selectedProject.id}`, JSON.stringify(updatedSuites));
        }
      }
      window.dispatchEvent(new CustomEvent("lanpro_qa_retest_updated", { detail: { bugKey, taskId: taskToUpdate.id } }));
    } catch (err) {
      console.error("Error updating QA test cases to Retest:", err);
    }

    // Trigger toast & notification if bug or converted to Ready for Retest or status is Done
    if (isBug || isDoneStatus || targetStatus === "Ready for Retest") {
      const notifTitle = "🐛 Bug Ready for Retest";
      const notifMessage = `${devName} telah menyelesaikan Bug #${bugKey} [${bugTitle}]. Silakan lakukan Retest.`;

      const newNotif: AppNotification = {
        id: crypto.randomUUID(),
        recipientId: taskToUpdate.reporterId || user?.uid || currentUser?.uid || "qa-lead",
        title: notifTitle,
        message: notifMessage,
        type: "bug_retest",
        read: false,
        createdAt: new Date().toISOString(),
        relatedId: taskToUpdate.id,
      };

      setNotifications(prev => [newNotif, ...prev.filter(n => n.id !== newNotif.id)]);

      // Save notification to backend
      try {
        const targetUserId = taskToUpdate.reporterId || user?.uid || currentUser?.uid;
        if (targetUserId) {
          await apiRequest(`/api/users/${targetUserId}/notifications`, {
            method: "POST",
            body: {
              title: notifTitle,
              message: notifMessage,
              type: "bug_retest",
              relatedId: taskToUpdate.id
            }
          });
        }
      } catch (err) {
        console.error("Failed to persist notification:", err);
      }

      // Real-time Floating Toast Alert
      toast.custom((t: any) => (
        <div className="max-w-md w-full bg-slate-900 border border-emerald-500/60 shadow-2xl rounded-xl pointer-events-auto flex p-4 items-center justify-between gap-3 text-white ring-1 ring-emerald-500/30">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl shrink-0">
              <Bug className="w-5 h-5 animate-bounce text-emerald-400" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest flex items-center gap-1">
                <span>🔔</span> QA Notification
              </p>
              <p className="text-xs font-semibold text-slate-100 mt-0.5 leading-snug">
                Bug <span className="font-mono font-extrabold text-emerald-300">#{bugKey}</span> telah diperbaiki oleh Developer. Klik untuk lakukan Retest.
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              toast.dismiss(t);
              setCurrentView("qa");
              setQaInitialStatusFilter("Retest");
              window.dispatchEvent(new CustomEvent("lanpro_qa_retest_updated", { detail: { bugKey } }));
            }}
            className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-slate-950 text-xs font-black rounded-xl uppercase tracking-wider shrink-0 transition-all cursor-pointer shadow-md flex items-center gap-1"
          >
            <span>LIHAT BUG</span>
          </button>
        </div>
      ), { duration: 6000, position: "top-right" });
    }

    return targetStatus;
  };

  const updateTaskField = async (taskId: string, field: string, value: any) => {
    if (!selectedProject) return;
    const previousTasks = tasks;

    // Permission Check using RBAC
    const taskToUpdate = tasks.find((t) => t.id === taskId);
    if (!taskToUpdate) return;

    const isOwner =
      taskToUpdate.assigneeId === user?.uid ||
      taskToUpdate.reporterId === user?.uid;
    if (
      !hasPermission(
        effectiveRole,
        "issueList",
        "update",
        isOwner,
        currentUserProfile?.permissions,
      )
    ) {
      toast.error("Failed: You do not have permission to edit this task.");
      return;
    }

    // Check blockers
    if (field === "status") {
      if (!checkTaskBlockers(taskId, value)) return;
    }

    // Date validations
    if (
      field === "startDate" ||
      field === "endDate" ||
      field === "dueDate" ||
      field === "sprintId" ||
      field === "dates"
    ) {
      const getVal = (f: string) => {
        if (field === "dates") {
          return value[f] !== undefined ? value[f] : (taskToUpdate as any)[f];
        }
        return field === f ? value : (taskToUpdate as any)[f];
      };

      const tStartStr = getVal("startDate");
      const tEndStr = getVal("endDate");
      const targetSprintId = getVal("sprintId");

      const tStart = tStartStr ? ensureDate(tStartStr) : null;
      const tEnd = tEndStr ? ensureDate(tEndStr) : null;

      if (tStart && tEnd && tStart > tEnd) {
        setConfirmAction({
          isOpen: true,
          title: "Validasi Tanggal",
          message:
            "Tanggal selesai tugas tidak boleh sebelum tanggal mulai tugas (tidak bisa backdate).",
          onConfirm: () => {},
          isAlert: true,
        });
        return;
      }

      // Epic Timeline Boundary Check
      const effectiveParentId = taskToUpdate.parentId;
      if (effectiveParentId && (tStart || tEnd)) {
        const parentEpic = tasks.find(t => t.id === effectiveParentId);
        if (parentEpic && (parentEpic.startDate || parentEpic.endDate)) {
          const epicStart = parentEpic.startDate ? new Date(parentEpic.startDate).getTime() : null;
          const epicEnd = parentEpic.endDate ? new Date(parentEpic.endDate).getTime() : null;
          const taskStart = tStart ? tStart.getTime() : null;
          const taskEnd = tEnd ? tEnd.getTime() : null;

          if (epicStart && taskStart && taskStart < epicStart) {
            setConfirmAction({
              isOpen: true,
              title: "Validasi Batas Jadwal Epic Timeline",
              message: "Peringatan: Tanggal mulai task tidak boleh lebih awal dari rentang tanggal Epic induk.",
              onConfirm: () => {},
              isAlert: true,
            });
            return;
          }
          if (epicEnd && taskStart && taskStart > epicEnd) {
            setConfirmAction({
              isOpen: true,
              title: "Validasi Batas Jadwal Epic Timeline",
              message: "Peringatan: Tanggal mulai task tidak boleh melebihi rentang tanggal Epic induk.",
              onConfirm: () => {},
              isAlert: true,
            });
            return;
          }
          if (epicStart && taskEnd && taskEnd < epicStart) {
            setConfirmAction({
              isOpen: true,
              title: "Validasi Batas Jadwal Epic Timeline",
              message: "Peringatan: Tanggal selesai task tidak boleh lebih awal dari rentang tanggal Epic induk.",
              onConfirm: () => {},
              isAlert: true,
            });
            return;
          }
          if (epicEnd && taskEnd && taskEnd > epicEnd) {
            setConfirmAction({
              isOpen: true,
              title: "Validasi Batas Jadwal Epic Timeline",
              message: "Peringatan: Tanggal selesai task tidak boleh melebihi rentang tanggal Epic induk.",
              onConfirm: () => {},
              isAlert: true,
            });
            return;
          }
        }
      }

      if (targetSprintId) {
        const targetSprint = sprints.find((s) => s.id === targetSprintId);
        if (targetSprint && targetSprint.startDate && targetSprint.endDate) {
          const sprintStart = ensureDate(targetSprint.startDate);
          const sprintEnd = ensureDate(targetSprint.endDate);
          sprintStart.setHours(0, 0, 0, 0);
          sprintEnd.setHours(23, 59, 59, 999);

          if (tStart && tEnd && (tStart < sprintStart || tEnd > sprintEnd)) {
            setConfirmAction({
              isOpen: true,
              title: "Validasi Tanggal",
              message: `Range tanggal tugas (${format(tStart, "dd MMM")} - ${format(tEnd, "dd MMM")}) di luar periode fase ini (${format(sprintStart, "dd MMM")} - ${format(sprintEnd, "dd MMM")}).`,
              onConfirm: () => {},
              isAlert: true,
            });
            return;
          } else if (tStart && (tStart < sprintStart || tStart > sprintEnd)) {
            setConfirmAction({
              isOpen: true,
              title: "Validasi Tanggal",
              message: `Waktu mulai tugas (${format(tStart, "dd MMM")}) di luar periode fase ini (${format(sprintStart, "dd MMM")} - ${format(sprintEnd, "dd MMM")}).`,
              onConfirm: () => {},
              isAlert: true,
            });
            return;
          } else if (tEnd && (tEnd < sprintStart || tEnd > sprintEnd)) {
            setConfirmAction({
              isOpen: true,
              title: "Validasi Tanggal",
              message: `Eksekusi tugas melebihi timeline fase ini (${format(sprintStart, "dd MMM")} - ${format(sprintEnd, "dd MMM")}).`,
              onConfirm: () => {},
              isAlert: true,
            });
            return;
          }
        }
      }
    }

    try {
      let updateData: any = {};
      if (field === "dates") {
        updateData = {
          startDate: value.startDate,
          endDate: value.endDate,
        };
      } else if (field === "assigneeId") {
        const isEmail = typeof value === 'string' && value.includes("@");
        if (isEmail) {
          updateData = {
            assigneeId: null,
            assigneeEmail: value,
          };
        } else {
          updateData = {
            assigneeId: value || null,
            assigneeEmail: null,
          };
        }
      } else if (field === "status") {
        const finalVal = await triggerBugDoneFlow(taskToUpdate, value);
        updateData = { status: finalVal };
      } else {
        updateData = {
          [field]: value,
        };
      }

      const previousTasks = tasks;
      // Optimistic UI update
      setTasks((prev) => 
        prev.map((t) => (t.id === taskId ? { ...t, ...updateData } : t))
      );

      setIsUpdatingTask((prev) => ({ ...prev, [taskId]: true }));
      let data;
      try {
        data = await apiRequest(`/api/projects/${selectedProject.id}/tasks/${taskId}`, {
          method: "PUT",
          body: updateData
        });
        if (data.status !== "success") throw new Error(data.message);
      } finally {
        setIsUpdatingTask((prev) => ({ ...prev, [taskId]: false }));
      }
      
      // Explicit refresh removed to prevent UI freezing. Real-time updates handled by socket.

      if (field === "status") {
        await logActivity(
          "task_status_updated",
          `Task ${taskId} status updated to ${value}`,
        );
        // Notify blocked tasks if status is Done
        if (value === "Done") {
          await handleTaskCompletionDependencies(taskId);
        }
      } else if (field === "assigneeId") {
        await logActivity(
          "task_assigned",
          `Task ${taskId} assigned to ${value}`,
        );
      }

      if (selectedTaskForDetail?.id === taskId) {
        setSelectedTaskForDetail((prev) =>
          prev ? { ...prev, ...updateData } : null,
        );
      }
    } catch (e: any) {
      console.error(e);
      setTasks(previousTasks || tasks); // Revert optimistic UI immediately
      const errMessage = e?.message || "";
      const errCode = e?.data?.code || "";
      if (errCode === "EPIC_TIMELINE_EXCEEDED" || errMessage.includes("Epic") || errMessage.includes("melebihi")) {
        setConfirmAction({
          isOpen: true,
          title: "Validasi Batas Jadwal Epic Timeline",
          message: "Peringatan: Tanggal task tidak boleh melewati rentang tanggal Epic induk!",
          onConfirm: () => {},
          isAlert: true,
        });
      } else {
        toast.error(errMessage || "Failed to update task");
      }
    }
  };

  const addTaskLink = async (
    taskId: string,
    targetTaskId: string,
    relationType: LinkedTask["relationType"],
  ) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    const newLink: LinkedTask = {
      id: Math.random().toString(36).substr(2, 9),
      targetTaskId,
      relationType,
      createdAt: new Date(),
    };

    const updatedLinkedTasks = [...(task.linkedTasks || []), newLink];
    await updateTaskField(taskId, "linkedTasks", updatedLinkedTasks);
  };

  const removeTaskLink = async (taskId: string, linkId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    const updatedLinkedTasks = (task.linkedTasks || []).filter(
      (l) => l.id !== linkId,
    );
    await updateTaskField(taskId, "linkedTasks", updatedLinkedTasks);
  };

  const handleAddLinkedTask = async () => {
    if (!selectedProject || !selectedTaskForDetail || !taskLinkTargetId) {
      toast.error("Failed to add relation, make sure a task is selected.");
      return;
    }

    // Validasi ngga boleh link ke diri sendiri
    if (taskLinkTargetId === selectedTaskForDetail.id) {
      toast.error("Tidak bisa membuat relasi ke task ini sendiri.");
      return;
    }

    try {
      const sourceId = selectedTaskForDetail.id;
      const targetId = taskLinkTargetId;

      const newLinkedTaskForSource: LinkedTask = {
        id: crypto.randomUUID(),
        targetTaskId: targetId,
        relationType: taskLinkRelation as any,
        createdAt: new Date().toISOString(),
      };

      const mapInverseRelation = (rel: string) => {
        if (rel === "blocks") return "is_blocked_by";
        if (rel === "is_blocked_by") return "blocks";
        if (rel === "relates_to") return "relates_to";
        if (rel === "clones") return "is_cloned_by";
        if (rel === "is_cloned_by") return "clones";
        return "relates_to";
      };

      const newLinkedTaskForTarget: LinkedTask = {
        id: crypto.randomUUID(),
        targetTaskId: sourceId,
        relationType: mapInverseRelation(taskLinkRelation) as any,
        createdAt: new Date().toISOString(),
      };

      const existingSourceRelation = selectedTaskForDetail.linkedTasks?.find(
        (t) =>
          t.targetTaskId === targetId && t.relationType === taskLinkRelation,
      );
      if (existingSourceRelation) {
        toast.error("Relasi ini sudah ada.");
        return;
      }

      const data1 = await apiRequest(`/api/projects/${selectedProject.id}/tasks/${sourceId}/links`, {
        method: "POST",
        body: { targetTaskId: targetId, relationType: taskLinkRelation }
      });

      const data2 = await apiRequest(`/api/projects/${selectedProject.id}/tasks/${targetId}/links`, {
        method: "POST",
        body: { targetTaskId: sourceId, relationType: mapInverseRelation(taskLinkRelation) }
      });

      await fetchTasks();

      setSelectedTaskForDetail((prev) =>
        prev
          ? {
              ...prev,
              linkedTasks: [
                ...(prev.linkedTasks || []),
                newLinkedTaskForSource,
              ],
            }
          : null,
      );

      setIsAddingTaskLink(false);
      setTaskLinkTargetId("");
      setTaskLinkRelation("blocks");
      toast.success("Linked task added successfully");

      await logActivity(
        "task_linked",
        `Task ${selectedTaskForDetail.key} linked to a task ${targetId}`,
      );
    } catch (e) {
      console.error(e);
      toast.error("Failed to add link");
    }
  };

  const handleRemoveLinkedTask = async (
    sourceId: string,
    linkIdToRemove: string,
  ) => {
    if (!selectedProject || !selectedTaskForDetail) return;
    const linkToRemove = selectedTaskForDetail.linkedTasks?.find(
      (t) => t.id === linkIdToRemove,
    );
    if (!linkToRemove) return;

    setConfirmAction({
      isOpen: true,
      title: "Hapus Tautan Tugas?",
      message: "Apakah Anda yakin ingin menghapus tautan hubungan antar-tugas ini?",
      onConfirm: async () => {
        try {
          setConfirmAction(null);
          const data = await apiRequest(`/api/projects/${selectedProject.id}/tasks/${sourceId}/links/${linkIdToRemove}`, {
            method: "DELETE"
          });
          if (data.status !== "success") throw new Error(data.message);

          await fetchTasks();

          const newSourceLinks = selectedTaskForDetail.linkedTasks!.filter(
            (t) => t.id !== linkIdToRemove,
          );
          setSelectedTaskForDetail((prev) =>
            prev
              ? {
                  ...prev,
                  linkedTasks: newSourceLinks,
                }
              : null,
          );

          toast.success("Hubungan tugas berhasil dihapus");
        } catch (e: any) {
          console.error(e);
          toast.error("Gagal menghapus hubungan tugas: " + (e.message || e));
        }
      }
    });
  };

  const handleQuickAddSubtask = async (
    parentId: string,
    type: "task" | "subtask",
  ) => {
    const activeUid = currentUser?.uid || user?.uid;
    const effectiveUserId = currentUser?.uid || user?.uid || "guest";
    if (!selectedProject || !activeUid) return;
    try {
      const data = await apiRequest(`/api/projects/${selectedProject.id}/tasks`, {
        method: "POST",
        body: {
          parentId: parentId,
          title: `New ${type}`,
          type: type,
          status: masterData.find((d) => d.type === "status")?.label || "To Do",
          priority: masterData.find((d) => d.type === "priority")?.label || "Medium",
          reporterId: activeUid,
        }
      });
      
      if (data.status === "success") {
        await await fetchTasks();
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Failed to add subtask");
    }
  };

  const checkTaskBlockers = (taskId: string, targetStatus: string) => {
    // Only block if moving to "Done" (or similar terminal status)
    const isTerminalStatus =
      targetStatus.toLowerCase().includes("done") ||
      targetStatus.toLowerCase().includes("completed");
    if (!isTerminalStatus) return true;

    const task = tasks.find((t) => t.id === taskId);
    if (!task || !task.linkedTasks) return true;

    // Find links where this task "is blocked by" someone
    const blockers = task.linkedTasks.filter(
      (l) => l.relationType === "is_blocked_by",
    );

    for (const blocker of blockers) {
      const blockingTask = tasks.find((t) => t.id === blocker.targetTaskId);
      if (
        blockingTask &&
        !blockingTask.status.toLowerCase().includes("done") &&
        !blockingTask.status.toLowerCase().includes("completed")
      ) {
        toast.error(
          `Tidak dapat menyelesaikan ${task.key}: tugas ini terblokir oleh ${blockingTask.key} (${blockingTask.status}).`,
        );
        return false;
      }
    }
    return true;
  };

  const updateTaskStatus = async (taskId: string, newStatus: string) => {
    if (!selectedProject) return;
    if (!checkTaskBlockers(taskId, newStatus)) return;
    try {
      const taskToUpdate = tasks.find((t) => t.id === taskId);
      let statusToSave = newStatus;
      if (taskToUpdate) {
        statusToSave = await triggerBugDoneFlow(taskToUpdate, newStatus);
      }
      const effectiveUserId = currentUser?.uid || user?.uid || "guest";
      const data = await apiRequest(`/api/projects/${selectedProject.id}/tasks/${taskId}`, {
        method: "PUT",
        headers: { 
          "x-user-id": effectiveUserId
        },
        body: { status: statusToSave }
      });
      if (data.status !== "success") throw new Error(data.message);
      await fetchTasks();
    } catch (e: any) {
      console.error(e);
      toast.error("Failed to update status: " + (e.message || e));
    }
  };

  const handleReorderMasterData = async (result: any) => {
    if (!result.destination || !selectedProject) return;

    const type = result.source.droppableId;
    const items = masterData
      .filter((d) => d.type === type)
      .sort((a, b) => (a.order || 0) - (b.order || 0));
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    try {
      const batch = items.map((item, index) => {
        return apiRequest(`/api/master-data/${item.id}`, {
          method: 'PUT',
          body: { order: index }
        });
      });
      await Promise.all(batch);
      fetchMasterData();
    } catch (e) {
      console.error(e);
      toast.error('Failed to change order');
    }
  };

  const handleDragEndPlanning = async (result: any) => {
    if (!result.destination || !selectedProject) return;

    const { draggableId, destination } = result;

    // Permission Check: Admin & Manager always allowed, otherwise only Assignee or Reporter
    const taskToMove = tasks.find((t) => t.id === draggableId);
    if (taskToMove && !["admin", "manager"].includes(userRole)) {
      if (
        taskToMove.assigneeId !== user?.uid &&
        taskToMove.reporterId !== user?.uid
      ) {
        toast.error(
          "Akses Ditolak: Anda hanya dapat memindahkan tugas yang ditugaskan kepada Anda atau yang Anda buat.",
        );
        return;
      }
    }

    const sprintId =
      destination.droppableId === "backlog" ? null : destination.droppableId;

    try {
      await moveTaskToSprint(draggableId, sprintId);
    } catch (e) {
      console.error("Failed to move task via drag and drop:", e);
    }
  };

  const deleteProject = async (project: Project) => {
    const effectiveUserId = currentUser?.uid || user?.uid;
    if (!effectiveUserId) {
      toast.error("Sesi tidak ditemukan");
      return;
    }

    // Check permission
    const isOwner = project.ownerId === effectiveUserId;
    if (
      !hasPermission(
        effectiveRole,
        "configuration",
        "delete",
        isOwner,
        currentUserProfile?.permissions,
      )
    ) {
      toast.error(
        "Only project owners or workspace administrators can delete this project.",
      );
      return;
    }

    setConfirmAction({
      isOpen: true,
      title: "BAHAYA: Hapus Proyek Secara Permanen?",
      message: `Anda akan menghapus "${project.name}" secara PERMANEN beserta SELURUH datanya (tugas, komentar, sprint, log, pertemuan). Tindakan ini tidak dapat dibatalkan.`,
      onConfirm: async () => {
        try {
          const loadingToast = toast.loading("Sedang menghapus secara permanen...");
          setConfirmAction(null);

          setIsEditProjectModalOpen(false);
          setSelectedProject(null);
          setCurrentView("dashboard");

          // Hard delete project from MySQL (Cascades to tasks, sprints, etc)
          const data = await apiRequest(`/api/projects/${project.id}`, { 
            method: "DELETE",
            headers: { 'x-user-id': effectiveUserId }
          });
          if (data.status !== "success") throw new Error(data.message);

          // Optimistic update
          setProjects((prev) => prev.filter((p) => p.id !== project.id));

          toast.dismiss(loadingToast);
          toast.success(
            "Proyek dan seluruh data terkait telah berhasil dihapus secara permanen.",
          );
        } catch (e: any) {
          console.error(e);
          toast.error("Gagal menghapus proyek: " + (e.message || e));
        }
      },
    });
  };

  const deleteTask = async (taskId: string) => {
    if (!selectedProject) return;
    const taskToDelete = tasks.find((t) => t.id === taskId);
    if (!taskToDelete) return;

    const effectiveUserId = currentUser?.uid || user?.uid || currentUserProfile?.uid || currentUserProfile?.id;
    const effectiveUsername = currentUser?.username || user?.username || currentUserProfile?.username;
    const isReporter =
      taskToDelete.reporterId === effectiveUserId ||
      taskToDelete.reporterId === effectiveUsername;
    if (!isReporter) {
      toast.error("Hanya pelapor (reporter) asli yang memiliki izin untuk menghapus tugas ini.");
      return;
    }

    setConfirmAction({
      isOpen: true,
      title: "Hapus Tugas?",
      message: `Apakah Anda yakin ingin menghapus tugas "${taskToDelete.title}"? Semua data turunan termasuk komentar juga akan terhapus.`,
      onConfirm: async () => {
        try {
          setConfirmAction(null);
          const loadingToast = toast.loading("Sedang menghapus tugas...");

          try {
             const effectiveUserId = currentUser?.uid || user?.uid || "guest";
             const data = await apiRequest(`/api/projects/${selectedProject.id}/tasks/${taskId}`, { 
               method: "DELETE",
               headers: { 'x-user-id': effectiveUserId }
             });
             if (data.status !== "success") throw new Error(data.message);

             setTasks((prev) => prev.filter((t) => t.id !== taskId));
             await fetchTasks(); // Refresh explicitly

             toast.success("Tugas dan data turunan berhasil dihapus");
          } catch(e: any) {
             console.error(e);
             toast.error("Gagal menghapus tugas: " + (e.message || e));
          } finally {
             toast.dismiss(loadingToast);
             if (selectedTaskForDetail?.id === taskId) {
               setSelectedTaskForDetail(null);
               setIsTaskDetailModalOpen(false);
             }
          }
        } catch (e: any) {
          setConfirmAction(null);
          console.error(
            e,
            'error',
            `projects/${selectedProject.id}/tasks/${taskId}`,
          );
        }
      },
    });
  };

  const bulkDeleteTasks = async (taskIds: string[]) => {
    if (!selectedProject || !Array.isArray(taskIds) || taskIds.length === 0) return;

    setConfirmAction({
      isOpen: true,
      title: "Hapus Beberapa Tugas?",
      message: `Apakah Anda yakin ingin menghapus ${taskIds.length} tugas terpilih secara permanen? Semua data turunan seperti komentar juga akan terhapus.`,
      onConfirm: async () => {
        try {
          setConfirmAction(null);
          const loadingToast = toast.loading(`Sedang menghapus ${taskIds.length} tugas...`);

          try {
            const effectiveUserId = currentUser?.uid || user?.uid || "guest";
            const data = await apiRequest(`/api/projects/${selectedProject.id}/tasks/bulk-delete`, {
              method: "POST",
              headers: { 'x-user-id': effectiveUserId },
              body: JSON.stringify({ taskIds })
            });

            if (data.status !== "success") throw new Error(data.message);

            const deletedSet = new Set(data.deletedIds || taskIds);
            setTasks((prev) => prev.filter((t) => !deletedSet.has(t.id)));
            setAllProjectTasksForStats((prev) => prev.filter((t) => !deletedSet.has(t.id)));
            await fetchTasks();

            toast.success(`Berhasil menghapus ${deletedSet.size} tugas`);
          } catch (e: any) {
            console.error(e);
            toast.error("Gagal menghapus beberapa tugas: " + (e.message || e));
          } finally {
            toast.dismiss(loadingToast);
          }
        } catch (e: any) {
          setConfirmAction(null);
          console.error(e);
        }
      },
    });
  };

  const handleCommentChange = (e: any) => {
    const val = e.target.value;
    setNewCommentText(val);

    const cursorPosition = e.target.selectionStart;
    const textBeforeCursor = val.slice(0, cursorPosition);
    const lastAtSymbolIndex = textBeforeCursor.lastIndexOf("@");

    if (lastAtSymbolIndex !== -1) {
      const textAfterAt = textBeforeCursor.slice(lastAtSymbolIndex + 1);
      // Check if there are no spaces after the @
      if (!/\s/.test(textAfterAt)) {
        setMentionState({
          active: true,
          query: textAfterAt,
          index: lastAtSymbolIndex,
        });
        return;
      }
    }

    setMentionState({ active: false, query: "", index: -1 });
  };

  const handleSelectMention = (username: string) => {
    const beforeMention = newCommentText.slice(0, mentionState.index);
    const afterMention = newCommentText.slice(
      mentionState.index + mentionState.query.length + 1,
    );
    setNewCommentText(`${beforeMention}@${username} ${afterMention}`);
    setMentionState({ active: false, query: "", index: -1 });
  };

  const handleAddComment = async () => {
    const activeUid = currentUser?.uid || user?.uid;
    const authorName =
      currentUser?.displayName || user?.displayName || "Seseorang";
    if (
      !selectedProject ||
      !selectedTaskForDetail ||
      !newCommentText.trim() ||
      !activeUid
    )
      return;

    try {
      await apiRequest(`/api/projects/${selectedProject.id}/tasks/${selectedTaskForDetail.id}/comments`, {
        method: "POST",
        body: {
          text: newCommentText.trim(),
          authorId: activeUid,
        }
      });

      // Parse mentions
      const mentionRegex = /@(\w+)/g;
      const mentions = Array.from(newCommentText.matchAll(mentionRegex)).map(
        (m) => m[1].toLowerCase(),
      );
      if (mentions.length > 0) {
        const mentionedUsers = projectMembers.filter(
          (m) =>
            m?.username &&
            mentions.includes(m?.username.toLowerCase()) &&
            m.uid !== activeUid,
        );
        for (const u of mentionedUsers) {
          await apiRequest(`/api/users/${u.uid}/notifications`, {
            method: "POST",
            body: {
              senderId: activeUid,
              title: "Anda di-mention",
              message: `${authorName} me-mention Anda di komentar tugas "${selectedTaskForDetail.title}"`,
              type: "mention",
              relatedId: selectedTaskForDetail.id,
              projectId: selectedProject.id
            }
          });
        }
      }

      setNewCommentText("");
      fetchComments();
    } catch (e) {
      console.error("Failed to add comment", e);
    }
  };


  if (loading) {
    return <GlobalSkeleton />;
  }

  if (isInitialDataLoading) {
    return <GlobalSkeleton />;
  }

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex flex-col lg:flex-row font-sans bg-slate-50 overflow-x-hidden">
        <Toaster position="top-right" richColors />
        <RateLimitIndicator />

        {/* Visual Hero Side (Desktop) - Stationary across login/register transitions */}
        <AuthHeroPanel />

        {/* Form Side with Watermark & Animated Form Switching */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-10 lg:p-12 bg-white relative overflow-y-auto min-h-screen">
          <AuthWatermarkPattern />

          <AnimatePresence mode="wait">
            {authView === "login" ? (
              <LoginScreen
                key="login-screen-view"
                onLogin={handleManualLogin}
                onRegisterClick={() => setAuthView("register")}
                loading={isAuthLoading}
                loadingText={loginStatusText}
              />
            ) : (
              <RegisterScreen
                key="register-screen-view"
                onRegister={handleRegister}
                onBackToLogin={() => setAuthView("login")}
              />
            )}
          </AnimatePresence>

          {/* Micro logo for mobile (<1024px) */}
          <div className="absolute top-6 left-6 lg:hidden flex items-center gap-2">
            <div className="w-7 h-7 bg-[#405189] rounded-lg flex items-center justify-center shadow-md shadow-[#405189]/20">
              <ShieldCheck className="text-white w-4 h-4" />
            </div>
            <span className="text-sm font-black text-slate-900 tracking-tight">
              LANPRO
            </span>
          </div>
        </div>

        {/* Single Login Collision Modal */}
        <SingleLoginCollisionModal
          isOpen={showCollisionModal}
          activeSession={activeSessionData}
          onClose={() => {
            setShowCollisionModal(false);
            setPendingLoginCredentials(null);
          }}
          onForceLogout={() => {
            if (pendingLoginCredentials) {
              handleManualLogin(
                pendingLoginCredentials.username,
                pendingLoginCredentials.password,
                pendingLoginCredentials.remember,
                true
              );
            }
          }}
          isLoading={loading}
        />

        {/* Pending Approval Modal */}
        <Modal
          isOpen={isPendingModalOpen}
          onClose={() => setIsPendingModalOpen(false)}
          title="Akun Belum Aktif / Pending Approval"
        >
          <div className="space-y-4 font-sans">
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-800 leading-relaxed font-medium">
                {pendingModalMessage || "Akun Anda telah terdaftar tetapi belum diaktifkan oleh Administrator Sistem. Semua akun baru memerlukan peninjauan dan persetujuan keamanan sebelum dapat mengakses dasbor utama."}
              </div>
            </div>
            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setIsPendingModalOpen(false)}
                className="px-4 py-2 bg-[#405189] text-white rounded-xl text-xs font-bold hover:bg-[#364574] transition-all"
              >
                Dimengerti
              </button>
            </div>
          </div>
        </Modal>
      </div>
    );
  }

  return (
  <PresenceProvider currentUser={currentUser} socket={socket} allUsers={allUsers}>
    <Toaster position="top-right" richColors closeButton duration={5000} />
    <RateLimitIndicator />
    <div className="min-h-screen flex h-screen bg-slate-50 dark:bg-slate-950 text-slate-950 dark:text-slate-100 transition-colors duration-200">
      {/* Mobile Menu Button */}
      <button
        className="md:hidden p-2 text-gray-500 z-50 absolute top-4 left-4"
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      >
        <Menu className="w-6 h-6" />
      </button>

      {/* Sidebar - MODULARIZED */}
      <Sidebar
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
        isSidebarCollapsed={isSidebarCollapsed}
        setIsSidebarCollapsed={setIsSidebarCollapsed}
        userRole={effectiveRole}
        currentUserProfile={currentUserProfile}
        setIsNewProjectModalOpen={setIsNewProjectModalOpen}
        projects={projects}
        selectedProject={selectedProject}
        setSelectedProject={setSelectedProject}
        currentView={currentView}
        setCurrentView={setCurrentView}
        hasPermission={hasPermission}
        currentUser={currentUser}
        user={user}
        setIsProfileModalOpen={setIsProfileModalOpen}
        onOpenProfile={() => {
          setSelectedUserForDetail(currentUserProfile || currentUser || user);
          setCurrentView('userDetail' as any);
        }}
        handleLogout={handleLogoutRequest}
      />

      {/* Live Chat Widget */}
      <LiveChatWidget
        socket={socket}
        currentUser={currentUserProfile}
        allUsers={allUsers}
      />

      {/* Client-Side Session Expiry Warning System */}
      <SessionExpiryWarning
        isLoggedIn={isLoggedIn}
        currentUser={currentUser}
        onLogout={handleLogout}
        onSessionExtended={(newUser) => {
          setCurrentUser(newUser);
          setCurrentUserProfile(newUser);
          localStorage.setItem("sessionUser", JSON.stringify(newUser));
        }}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        <div className="absolute inset-0 bg-[#f8fafc]/50 backdrop-blur-3xl z-[-1]" />

        {/* Global Top Header Bar */}
        <header className="flex items-center justify-between w-full px-6 py-3 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0 pl-14 md:pl-6 text-slate-800 dark:text-white transition-all z-20">
          <div className="flex items-center gap-4">
            {selectedProject && !['userDetail', 'users', 'master', 'auditLog', 'auditLogs', 'dbExplorer', 'explorer', 'settings', 'settingsIntegration', 'configuration'].includes(currentView as string) ? (
              <>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                  {selectedProject.name}
                </h2>
                <div className="h-4 w-px bg-gray-200 dark:bg-slate-800 mx-2" />
                <HeaderAvatarGroup allUsers={allUsers} currentUserUid={currentUser?.uid || currentUser?.id} />
              </>
            ) : null}
          </div>

          {/* Area Ikon Navigasi Kanan */}
          <div className="flex items-center gap-2">
            {/* Density Toggle (Compact vs Comfortable) */}
            {effectiveRole === 'admin' && (
              <>
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200/60 dark:border-slate-700 select-none mr-2">
                  <button
                    onClick={() => setDensity("comfortable")}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                      density === "comfortable"
                        ? "bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-xs font-extrabold"
                        : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                    }`}
                    title="Comfortable Spacing"
                  >
                    Comfortable
                  </button>
                  <button
                    onClick={() => setDensity("compact")}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                      density === "compact"
                        ? "bg-indigo-600 text-white shadow-xs font-extrabold"
                        : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                    }`}
                    title="Compact Spacing"
                  >
                    Compact
                  </button>
                </div>

                {/* Cache & Sync Status Button */}
                <button
                  onClick={() => setIsSyncModalOpen(true)}
                  className={`p-2 rounded-full transition-all flex items-center gap-1.5 ${
                    isSyncing 
                      ? "text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40" 
                      : "text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-800"
                  }`}
                  title="Sinkronisasi & Cache Diagnostik"
                >
                  <DBIcon className="w-5 h-5" />
                  <span className="relative flex h-2 w-2 -mt-3 -ml-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                </button>

                {/* Keyboard Shortcuts Button */}
                <button
                  onClick={() => setIsShortcutsModalOpen(true)}
                  className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-800 rounded-full transition-all"
                  title="Keyboard Shortcuts (?)"
                >
                  <Keyboard className="w-5 h-5" />
                </button>
              </>
            )}

            {/* Tombol Pengaturan Proyek */}
            {selectedProject && hasPermission(
              effectiveRole,
              "configuration",
              "read",
              selectedProject?.ownerId === (currentUser?.uid || user?.uid),
              currentUserProfile?.permissions,
            ) && (
              <button
                onClick={() => {
                  setEditingProject(selectedProject);
                  setIsEditProjectModalOpen(true);
                }}
                className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-full text-slate-400 hover:text-slate-600 group transition-all"
                title="Pengaturan Proyek"
              >
                <Settings className="w-5 h-5 group-hover:rotate-90 transition-transform" />
              </button>
            )}

            {/* Fullscreen Toggle Button */}
            <button
              onClick={toggleFullscreen}
              className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-800 rounded-full transition-all flex items-center justify-center"
              title={isFullscreen ? "Keluar Layar Penuh" : "Layar Penuh"}
            >
              {isFullscreen ? (
                <Minimize2 className="w-5 h-5" />
              ) : (
                <Maximize className="w-5 h-5" />
              )}
            </button>

            {/* Theme Switcher Button & Dropdown */}
            <div className="relative" ref={themeDropdownRef}>
              <button
                onClick={() => setIsThemeOpen(!isThemeOpen)}
                className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:text-indigo-400 dark:hover:bg-slate-800 rounded-full transition-all flex items-center justify-center relative"
                title="Ubah Tema"
              >
                {theme === 'light' ? (
                  <Sun className="w-5 h-5 text-amber-500" />
                ) : theme === 'dark' ? (
                  <Moon className="w-5 h-5 text-indigo-400" />
                ) : (
                  <Monitor className="w-5 h-5" />
                )}
              </button>

              <AnimatePresence>
                {isThemeOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.15, ease: "easeOut" }}
                    className="absolute right-0 mt-2 w-36 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg z-50 py-1.5 overflow-hidden origin-top-right"
                  >
                    <button
                      onClick={() => { setTheme('light'); setIsThemeOpen(false); }}
                      className={`w-full text-left px-4 py-2.5 text-xs font-bold flex items-center gap-2.5 transition-colors ${theme === 'light' ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}
                    >
                      <Sun className={`w-4 h-4 ${theme === 'light' ? 'text-amber-500' : 'text-slate-400 dark:text-slate-500'}`} />
                      <span>Light</span>
                    </button>
                    <button
                      onClick={() => { setTheme('dark'); setIsThemeOpen(false); }}
                      className={`w-full text-left px-4 py-2.5 text-xs font-bold flex items-center gap-2.5 transition-colors ${theme === 'dark' ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}
                    >
                      <Moon className={`w-4 h-4 ${theme === 'dark' ? 'text-indigo-400' : 'text-slate-400 dark:text-slate-500'}`} />
                      <span>Dark</span>
                    </button>
                    <button
                      onClick={() => { setTheme('system'); setIsThemeOpen(false); }}
                      className={`w-full text-left px-4 py-2.5 text-xs font-bold flex items-center gap-2.5 transition-colors ${theme === 'system' ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}
                    >
                      <Monitor className={`w-4 h-4 ${theme === 'system' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'}`} />
                      <span>Auto</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="relative" ref={notificationsRef}>
              <button
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                className="p-2 text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded-full transition-all relative"
                title="Notifikasi"
              >
                <Bell className="w-5 h-5" />
                {notifications.filter((n) => !n.read).length > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white"></span>
                )}
              </button>

              {/* Notifications Dropdown */}
              <AnimatePresence>
                {isNotificationsOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.18, ease: "easeOut" }}
                    className="absolute right-0 mt-2 w-80 sm:w-[380px] bg-white rounded-xl shadow-lg border border-slate-200 z-50 overflow-hidden origin-top-right"
                  >
                  {/* Dropdown Header */}
                  <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-white">
                    <h3 className="font-semibold text-slate-900 text-[16px]">
                      Notification
                    </h3>
                    <div className="flex items-center gap-2.5">
                      <span className="bg-violet-100 text-violet-700 text-xs font-semibold px-2.5 py-1 rounded-md">
                        {notifications.filter((n) => !n.read).length} New
                      </span>
                      <button
                        className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-all"
                        title="Mark all read"
                        onClick={async () => {
                          try {
                            const unread = notifications.filter(
                              (n) => !n.read,
                            );
                            for (const n of unread) {
                              await apiRequest(`/api/users/${user?.uid || currentUser?.uid}/notifications/${n.id}`, {
                                method: "PUT",
                                body: {read: true}
                              });
                            }
                            fetchNotifications();
                          } catch (e) {}
                        }}
                      >
                        <Mail className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {/* Notification Items List */}
                  <div className="max-h-[380px] overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center text-slate-400 text-sm italic">
                        Belum ada notifikasi
                      </div>
                    ) : (
                      <div className="flex flex-col">
                        {notifications.map((n, index) => {
                          const parsed = formatNotification(n.type, n.title, n.message);
                          
                          const getRelativeTime = (createdAt: any): string => {
                            if (!createdAt) return "-";
                            try {
                              const date = typeof createdAt.toMillis === "function"
                                ? new Date(createdAt.toMillis())
                                : new Date(createdAt);
                              const diffMs = Date.now() - date.getTime();
                              const diffSec = Math.floor(diffMs / 1000);
                              const diffMin = Math.floor(diffSec / 60);
                              const diffHr = Math.floor(diffMin / 60);
                              const diffDay = Math.floor(diffHr / 24);

                              if (diffSec < 60) return "Just now";
                              if (diffMin < 60) return `${diffMin}m ago`;
                              if (diffHr < 24) return `${diffHr}h ago`;
                              if (diffDay === 1) return "1 day ago";
                              if (diffDay < 7) return `${diffDay} days ago`;
                              
                              return format(date, "dd MMM, HH:mm");
                            } catch (e) {
                              return "-";
                            }
                          };

                          const formattedTime = getRelativeTime(n.createdAt);

                          return (
                            <div
                              key={n.id ? `${n.id}-${index}` : `notif-${index}`}
                              onClick={async () => {
                                try {
                                  if (!n.read) {
                                    await apiRequest(`/api/users/${user?.uid || currentUser?.uid}/notifications/${n.id}`, {
                                      method: "PUT",
                                      body: {read: true}
                                    });
                                    fetchNotifications();
                                  }
                                } catch (e) {
                                  console.error(e);
                                }
                                if (n.type === "bug_retest" || (n.title && n.title.toLowerCase().includes("retest")) || (n.message && n.message.toLowerCase().includes("retest"))) {
                                  setCurrentView("qa");
                                  setQaInitialStatusFilter("Retest");
                                  setIsNotificationsOpen(false);
                                  window.dispatchEvent(new CustomEvent("lanpro_qa_retest_updated", { detail: { taskId: n.relatedId } }));
                                } else if (n.relatedId) {
                                  // if it's a task id
                                  const t = tasks.find(
                                    (x) => x.id === n.relatedId,
                                  );
                                  if (t) {
                                    setSelectedTaskForDetail(t);
                                    setIsTaskDetailModalOpen(true);
                                    setIsNotificationsOpen(false);
                                  }
                                }
                              }}
                              className="py-3.5 px-5 hover:bg-slate-50/60 transition-all cursor-pointer flex gap-3 items-start relative border-b border-slate-100 last:border-b-0"
                            >
                              {/* Left Icon - Compact & circular */}
                              <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${parsed.iconBgClass || "bg-violet-50 text-violet-600"}`}>
                                {parsed.icon}
                              </div>

                              {/* Content Stack */}
                              <div className="flex-1 min-w-0 pr-4">
                                <h4 className="text-sm font-semibold text-slate-900 leading-snug break-words">
                                  {parsed.formattedMessage}
                                </h4>
                                <span className="mt-1 block text-xs text-slate-400 font-medium">
                                  {formattedTime}
                                </span>
                              </div>

                              {/* Unread indicator dot */}
                              {!n.read && (
                                <div className="absolute right-5 top-5 flex h-2 w-2 shrink-0">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-600 shadow-xs shadow-indigo-300"></span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Dropdown Footer */}
                  <div className="p-4 border-t border-slate-100 bg-white">
                    <button
                      onClick={() => {
                        setIsNotificationsOpen(false);
                      }}
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 px-4 rounded-xl text-sm font-semibold transition-all duration-150 text-center block shadow-xs"
                    >
                      View all notifications
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
        </header>

        {currentView === "userDetail" ? (
          <UserDetailView
            user={selectedUserForDetail}
            onBack={() => setCurrentView('users')}
            projects={projects}
            tasks={tasks}
            departments={masterData.filter(m => m.type === 'department')}
            positions={masterData.filter(m => m.type === 'position' || m.type === 'jabatan')}
            masterData={masterData}
            onUserUpdated={() => {
              fetchProjects();
            }}
          />
        ) : currentView === "users" ? (
          <AdminUserPanel
            projects={projects}
            tasks={tasks}
            masterData={masterData}
            userRole={effectiveRole}
            currentUserId={currentUser?.uid || user?.uid}
            onAddUser={() => {}}
            onRefreshProjects={fetchProjects}
            onSelectUserForDetail={(u) => {
              setSelectedUserForDetail(u);
              setCurrentView('userDetail' as any);
            }}
          />
        ) : currentView === "master" ? (
          <MasterDataPanel
            projects={projects}
            tasks={tasks}
            masterData={masterData}
            userRole={effectiveRole}
            currentUserProfile={currentUserProfile!}
            hasPermission={hasPermission}
            onRefresh={fetchMasterData}
          />
        ) : selectedProject ? (
          <React.Fragment>
            <AnimatePresence mode="wait">
              <motion.div 
                key={currentView + (selectedProject?.id || "")}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
                className="flex-1 flex flex-col min-h-0 bg-slate-50 dark:bg-slate-950 transition-colors duration-200"
              >
              {currentView === "issueDetail" && (
                <div className="w-full flex-1 flex flex-col p-3 md:p-4 min-h-0 overflow-hidden bg-[#f3f3f9] text-left">
                  <div className="flex-1 flex flex-col min-h-0 bg-white border border-slate-200/80 rounded-lg shadow-sm overflow-hidden">
                     {/* Velzon-style Action / Title Bar */}
                     <div className="px-4 py-3 md:px-6 md:py-3.5 border-b border-slate-200/80 bg-white flex items-center justify-between gap-4 shrink-0 shadow-2xs">
                        <div className="flex items-center gap-3">
                          <button 
                            onClick={() => setIsTaskDetailModalOpen(false)} 
                            className="h-8 w-8 rounded-md bg-slate-50 border border-slate-200/80 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-100 flex items-center justify-center transition-all shadow-2xs"
                            title="Back"
                          >
                            <ArrowLeft className="w-4 h-4" />
                          </button>
                          <div className="flex items-center gap-2.5">
                            <h3 className="text-sm font-bold text-slate-800 tracking-tight">Issue Details</h3>
                            <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-md border border-indigo-100/70">
                              {selectedTaskForDetail?.key || 'TASK'}
                            </span>
                          </div>
                        </div>
                     </div>
                     
                     <div className="flex-1 overflow-auto bg-white custom-scrollbar w-full h-full relative">
                      <TaskDetailModal
                        projectRole={
                          selectedProject && currentUser?.uid
                            ? selectedProject.memberRoles?.[currentUser.uid]
                            : undefined
                        }
                        isUpdatingTask={isUpdatingTask}
                        isOpen={true}
                        onClose={() => setIsTaskDetailModalOpen(false)}
                        task={selectedTaskForDetail}
                        tasks={tasks || []}
                        projectMembers={projectMembers || []}
                        masterData={masterData || []}
                        userRole={effectiveRole}
                        user={currentUser}
                        currentUserProfile={currentUserProfile!}
                        sprints={sprints || []}
                        updateTaskField={updateTaskField}
                        hasPermission={hasPermission}
                        activityLogs={activityLogs || []}
                        comments={comments || []}
                        newCommentText={newCommentText}
                        setNewCommentText={setNewCommentText}
                        handleAddComment={handleAddComment}
                        handleFileUpload={handleFileUpload}
                        handleRemoveAttachment={handleRemoveAttachment}
                        uploadProgress={uploadProgress}
                        isLoggedIn={!!currentUser}
                        handleQuickAddSubtask={handleQuickAddSubtask}
                        mentionState={mentionState}
                        handleSelectMention={handleSelectMention}
                        handleCommentChange={handleCommentChange}
                        removeTaskLink={removeTaskLink}
                        handleAddLinkedTask={handleAddLinkedTask}
                        handleRemoveLinkedTask={handleRemoveLinkedTask}
                        taskLinkTargetId={taskLinkTargetId}
                        setTaskLinkTargetId={setTaskLinkTargetId}
                        taskLinkRelation={taskLinkRelation}
                        setTaskLinkRelation={setTaskLinkRelation}
                        isAddingTaskLink={isAddingTaskLink}
                        setIsAddingTaskLink={setIsAddingTaskLink}
                        isAddingExternalLink={isAddingExternalLink}
                        setIsAddingExternalLink={setIsAddingExternalLink}
                        newExternalLinkTitle={newExternalLinkTitle}
                        setNewExternalLinkTitle={setNewExternalLinkTitle}
                        newExternalLinkUrl={newExternalLinkUrl}
                        setNewExternalLinkUrl={setNewExternalLinkUrl}
                        handleAddExternalLink={handleAddExternalLink}
                        removeExternalLink={removeExternalLink}
                        toggleBlockedStatus={toggleBlockedStatus}
                        handleSuggestStoryPoints={handleSuggestStoryPoints}
                        handleAddLink={handleAddLink}
                        newLinkTitle={newLinkTitle}
                        setNewLinkTitle={setNewLinkTitle}
                        newLinkUrl={newLinkUrl}
                        setNewLinkUrl={setNewLinkUrl}
                        isAddingLink={isAddingLink}
                        setIsAddingLink={setIsAddingLink}
                        deleteTask={deleteTask}
                      />
                    </div>
                  </div>
                </div>
              )}
                <AppRoutes
                  currentView={currentView}
                  setCurrentView={setCurrentView}
                  selectedProject={selectedProject}
                  effectiveRole={effectiveRole}
                  currentUser={currentUser}
                  currentUserProfile={currentUserProfile}
                  projectMembers={projectMembers || []}
                  masterData={masterData || []}
                  tasks={tasks || []}
                  sprints={sprints || []}
                  allUsers={allUsers || []}
                  activityLogs={activityLogs || []}
                  selectedTaskForDetail={selectedTaskForDetail}
                  expandedSprintId={expandedSprintId}
                  hasPermission={hasPermission}
                  updateTaskField={updateTaskField}
                  updateTaskStatus={updateTaskStatus}
                  handleQuickCreate={handleQuickCreate}
                  setSelectedTaskForDetail={setSelectedTaskForDetail}
                  setIsTaskDetailModalOpen={setIsTaskDetailModalOpen}
                  setIsNewTaskModalOpen={setIsNewTaskModalOpen}
                  deleteTask={deleteTask}
                  bulkDeleteTasks={bulkDeleteTasks}
                  fetchTasks={fetchTasks}
                  setExpandedSprintId={setExpandedSprintId}
                  setIsNewSprintModalOpen={setIsNewSprintModalOpen}
                  setIsEditSprintModalOpen={setIsEditSprintModalOpen}
                  setEditingSprint={setEditingSprint}
                  handleStartSprint={handleStartSprint}
                  handleCompleteSprint={handleCompleteSprint}
                  handleDeleteSprint={handleDeleteSprint}
                  handleDragEndPlanning={handleDragEndPlanning}
                  fetchMasterData={fetchMasterData}
                  fetchProjects={fetchProjects}
                  setTasks={setTasks}
                  socket={socket}
                  qaInitialStatusFilter={qaInitialStatusFilter}
                  exportTasksToCSV={exportTasksToCSV}
                  safeFormat={safeFormat}
                  StyledDropdown={StyledDropdown}
                  updateProjectRole={updateProjectRole}
                  removeProjectMember={removeProjectMember}
                />
              </motion.div>
            </AnimatePresence>

            {/* Network Latency Monitor & Status Footer Bar */}
            {effectiveRole === 'admin' && (
            <div className="h-8 bg-white border-t border-slate-100 flex items-center justify-between px-6 text-[10px] font-black uppercase tracking-wider text-slate-400 shrink-0 z-10 select-none">
              <div className="flex items-center gap-4">
                <div 
                  onClick={checkLatency}
                  className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 px-2 py-1 rounded transition-colors group"
                  title="Klik untuk ping ulang koneksi server"
                >
                  <Wifi className={`w-3.5 h-3.5 transition-transform group-hover:scale-110 ${
                    latencyStatus === 'excellent' ? 'text-emerald-500' :
                    latencyStatus === 'warning' ? 'text-amber-500' :
                    latencyStatus === 'poor' ? 'text-rose-500' : 'text-slate-400'
                  }`} />
                  <span className="text-slate-600 font-extrabold">
                    API PING: {apiLatency !== null ? `${apiLatency}ms` : 'Menghubungkan...'}
                  </span>
                  {latencyStatus === 'excellent' && (
                    <span className="text-[9px] bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded font-black tracking-wider">Sangat Baik</span>
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

                <HeaderNetworkStatus latencyStatus={latencyStatus === "excellent" ? "good" : latencyStatus} latencyText={`API PING: ${apiLatency !== null ? apiLatency + "ms" : "Menghubungkan..."}`} selectedProjectKey={selectedProject?.key || ""} />
              </div>
            </div>
            )}
          </React.Fragment>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center bg-slate-50/50 p-8 text-center">
            <div className="w-16 h-16 rounded-xl bg-indigo-100/80 border border-indigo-200 flex items-center justify-center text-indigo-600 mb-4 shadow-sm">
              <FolderKanban className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">Pilih atau Buat Proyek Baru</h3>
            <p className="text-sm text-slate-500 max-w-md mb-6">
              Silakan pilih salah satu proyek dari sidebar di sebelah kiri, atau buat proyek baru untuk mulai mengelola tugas & sprint tim Anda.
            </p>
            <button
              onClick={() => setIsNewProjectModalOpen(true)}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-sm shadow-md shadow-indigo-200 transition-all flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Buat Proyek Baru</span>
            </button>
          </div>
        )}

        {/* </main> */}

        {/* Modals */}
        <Modal
          isOpen={isNewSprintModalOpen}
          onClose={() => {
            setIsNewSprintModalOpen(false);
            setSelectedSprintBacklog(new Set());
          }}
          title="Buat Fase Baru"
        >
          <div className="space-y-4 max-h-[80vh] overflow-y-auto pr-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nama Fase
              </label>
              <Input
                value={newSprintName}
                onChange={(e: any) => setNewSprintName(e.target.value)}
                placeholder="contoh: Fase 1 - Fondasi"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tujuan Fase
              </label>
              <Textarea
                value={newSprintGoal}
                onChange={(e: any) => setNewSprintGoal(e.target.value)}
                placeholder="Apa yang ingin dicapai dalam sprint ini?"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={newSprintStartDate}
                  onChange={(e: any) => setNewSprintStartDate(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={newSprintEndDate}
                  onChange={(e: any) => setNewSprintEndDate(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm"
                />
              </div>
            </div>

            <Button
              onClick={wrapAppSubmit("createSprint", handleCreateSprint)} disabled={isSubmitting["createSprint"]}
              className="w-full justify-center bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200 py-3 rounded-xl font-bold"
            >
              Create Phase & Assign Tasks
            </Button>
          </div>
        </Modal>

        <Modal
          isOpen={isEditSprintModalOpen}
          onClose={() => setIsEditSprintModalOpen(false)}
          title="Edit Phase"
          maxWidth="max-w-xl"
        >
          {editingSprint && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-wider mb-1">
                  Name
                </label>
                <Input
                  value={editingSprint.name}
                  onChange={(e: any) =>
                    setEditingSprint({ ...editingSprint, name: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-wider mb-1">
                  Goal
                </label>
                <Textarea
                  value={editingSprint.goal}
                  onChange={(e: any) =>
                    setEditingSprint({ ...editingSprint, goal: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-wider mb-1">
                  Status
                </label>
                <select
                  value={editingSprint.status}
                  onChange={(e: any) =>
                    setEditingSprint({
                      ...editingSprint,
                      status: e.target.value as
                        | "planned"
                        | "active"
                        | "completed",
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm bg-white"
                >
                  <option value="planned">Planned</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-wider mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={
                      editingSprint.startDate
                        ? typeof editingSprint.startDate === "string"
                          ? editingSprint.startDate
                          : format(
                              ensureDate(editingSprint.startDate),
                              "yyyy-MM-dd",
                            )
                        : ""
                    }
                    onChange={(e: any) =>
                      setEditingSprint({
                        ...editingSprint,
                        startDate: e.target.value,
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-wider mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={
                      editingSprint.endDate
                        ? typeof editingSprint.endDate === "string"
                          ? editingSprint.endDate
                          : format(
                              ensureDate(editingSprint.endDate),
                              "yyyy-MM-dd",
                            )
                        : ""
                    }
                    onChange={(e: any) =>
                      setEditingSprint({
                        ...editingSprint,
                        endDate: e.target.value,
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-wider mb-1">
                  Status
                </label>
                <select
                  value={editingSprint.status}
                  onChange={(e: any) =>
                    setEditingSprint({
                      ...editingSprint,
                      status: e.target.value as any,
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 text-sm font-medium outline-none"
                >
                  <option value="planned">Planned</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-50">
                <Button
                  variant="secondary"
                  onClick={() => setIsEditSprintModalOpen(false)}
                  className="flex-1 justify-center"
                >
                  Cancel
                </Button>
                <Button
                  onClick={wrapAppSubmit("updateSprint", handleUpdateSprint)} disabled={isSubmitting["updateSprint"]}
                  className="flex-1 justify-center bg-indigo-600 hover:bg-indigo-700"
                >
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </Modal>

        <Modal
          isOpen={isNewProjectModalOpen}
          onClose={() => setIsNewProjectModalOpen(false)}
          title="Create New Project"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Project Name
              </label>
              <Input
                value={newProjectName}
                onChange={(e: any) => setNewProjectName(e.target.value)}
                placeholder="e.g. Website Redesign"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Project Key (Short)
              </label>
              <Input
                value={newProjectKey}
                onChange={(e: any) => setNewProjectKey(e.target.value.toUpperCase())}
                placeholder="e.g. KAN"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={newProjectDescription}
                onChange={(e) => setNewProjectDescription(e.target.value)}
                className="w-full border border-gray-200 rounded-lg p-2 text-sm"
                placeholder="Describe this project..."
                rows={3}
              />
            </div>
            <Button
              onClick={wrapAppSubmit("createProject", handleCreateProject)} disabled={isSubmitting["createProject"]}
              className="w-full justify-center"
            >
              Create Project
            </Button>
          </div>
        </Modal>

        {/* Keyboard Shortcuts Modal */}
        <Modal
          isOpen={isShortcutsModalOpen}
          onClose={() => setIsShortcutsModalOpen(false)}
          title="Keyboard Shortcuts"
          maxWidth="max-w-md"
        >
          <div className="space-y-4">
            <p className="text-xs text-slate-500 font-medium">
              Use these global shortcuts to navigate and perform common actions more efficiently.
            </p>
            <div className="divide-y divide-slate-100">
              <div className="flex justify-between items-center py-2.5">
                <span className="text-sm font-semibold text-slate-700">Open Create Task Modal</span>
                <kbd className="px-2.5 py-1 text-xs font-bold font-mono bg-slate-100 text-slate-800 rounded border border-slate-200 shadow-sm">n</kbd>
              </div>
              <div className="flex justify-between items-center py-2.5">
                <span className="text-sm font-semibold text-slate-700">Open Create Project Modal</span>
                <kbd className="px-2.5 py-1 text-xs font-bold font-mono bg-slate-100 text-slate-800 rounded border border-slate-200 shadow-sm">p</kbd>
              </div>
              <div className="flex justify-between items-center py-2.5">
                <span className="text-sm font-semibold text-slate-700">Focus Search Bar</span>
                <kbd className="px-2.5 py-1 text-xs font-bold font-mono bg-slate-100 text-slate-800 rounded border border-slate-200 shadow-sm">/</kbd>
              </div>
              <div className="flex justify-between items-center py-2.5">
                <span className="text-sm font-semibold text-slate-700">Toggle Shortcuts Menu</span>
                <kbd className="px-2.5 py-1 text-xs font-bold font-mono bg-slate-100 text-slate-800 rounded border border-slate-200 shadow-sm">?</kbd>
              </div>
              <div className="flex justify-between items-center py-2.5">
                <span className="text-sm font-semibold text-slate-700">Close Modals / Deselect</span>
                <kbd className="px-2.5 py-1 text-xs font-bold font-mono bg-slate-100 text-slate-800 rounded border border-slate-200 shadow-sm">Esc</kbd>
              </div>
            </div>
            <div className="pt-2 flex justify-end">
              <Button
                onClick={() => setIsShortcutsModalOpen(false)}
                className="justify-center bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
              >
                Got it
              </Button>
            </div>
          </div>
        </Modal>

        {/* Caching & Sinkronisasi State (Client-Side Caching) Modal */}
        <Modal
          isOpen={isSyncModalOpen}
          onClose={() => setIsSyncModalOpen(false)}
          title="Sinkronisasi & Diagnostik Cache Lokal"
          maxWidth="max-w-xl"
        >
          <div className="space-y-6">
            <p className="text-xs text-slate-500 font-semibold leading-relaxed">
              LanPro menggunakan teknologi <strong>SWR (Stale-While-Revalidate)</strong> yang menyimpan data proyek Anda secara lokal di browser. Aplikasi dapat dimuat secara instan tanpa visual flickering, dan tersinkronisasi di latar belakang.
            </p>

            {/* Connection & General Stats Card */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 border border-slate-200/50 rounded-xl p-4 flex flex-col justify-between">
                <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider block mb-1">Status Koneksi</span>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`w-2.5 h-2.5 rounded-full ${navigator.onLine ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                  <span className="text-xs font-bold text-slate-700">
                    {navigator.onLine ? 'Online (Terhubung)' : 'Offline (Mode Cache)'}
                  </span>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200/50 rounded-xl p-4 flex flex-col justify-between">
                <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider block mb-1">Kapasitas Cache Terpakai</span>
                <div className="flex items-end justify-between mt-1">
                  <span className="text-sm font-black text-slate-800">
                    {cacheStats?.totalSizeKB || '0.00 KB'}
                  </span>
                  <span className="text-[10px] text-slate-500 font-bold">
                    {cacheStats?.itemsCount || 0} entitas disimpan
                  </span>
                </div>
              </div>
            </div>

            {/* Cache Entities Details List */}
            <div className="bg-white border border-slate-200/60 rounded-xl overflow-hidden shadow-sm">
              <div className="bg-slate-50/50 px-4 py-2 border-b border-slate-100 flex items-center justify-between text-[10px] text-slate-500 font-black uppercase tracking-wider">
                <span>Entitas Data</span>
                <span>Detail Kapasitas</span>
              </div>

              <div className="divide-y divide-slate-100 max-h-[220px] overflow-y-auto">
                {(!cacheStats || !cacheStats.details || cacheStats.details.length === 0) ? (
                  <div className="text-center py-8 text-xs text-slate-400 font-medium">
                    Belum ada data yang tercache secara lokal.
                  </div>
                ) : (
                  cacheStats.details.map((item: any, idx: number) => (
                    <div key={idx} className="px-4 py-3 flex items-center justify-between hover:bg-slate-50/30 transition-all">
                      <div>
                        <span className="text-xs font-bold text-slate-800 capitalize tracking-tight block">
                          {item.key.replace(/_(\d+)/g, ' (Proyek #$1)')}
                        </span>
                        <span className="text-[9px] text-slate-400 font-semibold block mt-0.5">
                          Sinkron terakhir: {item.lastUpdated || 'Tidak diketahui'}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-black rounded-lg">
                          {item.size}
                        </span>
                        <span className="text-[9px] text-slate-400 font-bold block mt-1">
                          {item.count > 0 ? `${item.count} items` : '1 item'}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Action Buttons Container */}
            <div className="pt-2 flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => {
                  CacheManager.clearAll();
                  toast.success("Cache lokal berhasil dibersihkan! Aplikasi akan dimuat ulang.");
                  setTimeout(() => {
                    window.location.reload();
                  }, 1200);
                }}
                className="flex-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black rounded-xl transition-all uppercase tracking-wider text-center cursor-pointer"
              >
                Clear Cache
              </button>

              <Button
                onClick={handleSyncAll}
                disabled={isSyncing}
                className="flex-1 justify-center bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
              >
                {isSyncing ? (
                  <div className="flex items-center gap-2">
                    <RefreshCcw className="w-4 h-4 animate-spin" />
                    Syncing...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <RefreshCcw className="w-4 h-4" />
                    Sync All State
                  </div>
                )}
              </Button>
            </div>
          </div>
        </Modal>

        <Modal
          isOpen={isNewTaskModalOpen}
          onClose={() => setIsNewTaskModalOpen(false)}
          title="Add New Issue"
          maxWidth="max-w-3xl"
        >
          <div className="space-y-4">
            {/* Group 1: Basic Info */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Issue Title
                </label>
                <Input
                  value={newTaskTitle}
                  onChange={(e: any) => setNewTaskTitle(e.target.value)}
                  placeholder="What needs to be done?"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Type
                  </label>
                  <select
                    value={newTaskType}
                    onChange={(e: any) => setNewTaskType(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                  >
                    {masterData.filter((m) => m.type === "issue_type").length >
                    0 ? (
                      masterData
                        .filter((m) => m.type === "issue_type")
                        .map((t, idx) => (
                          <option key={t.id ? `it-${t.id}-${idx}` : `it-${idx}`} value={t.label.toLowerCase()}>
                            {t.label}
                          </option>
                        ))
                    ) : (
                      <>
                        <option value="epic">Epic</option>
                        <option value="task">Task</option>
                        <option value="subtask">Subtask</option>
                        <option value="bug">Bug</option>
                        <option value="meeting">Meeting</option>
                        <option value="document">Document</option>
                        <option value="approval">Approval</option>
                      </>
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sprint
                  </label>
                  <select
                    value={newTaskSprintId}
                    onChange={(e: any) => setNewTaskSprintId(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  >
                    <option value="">Backlog</option>
                    {sprints.map((s, idx) => (
                      <option key={s.id ? `sp-${s.id}-${idx}` : `sp-${idx}`} value={s.id}>
                        {s.name} ({s.status})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Initial Status
              </label>
              <StyledDropdown
                value={newTaskStatus}
                onChange={(val) => setNewTaskStatus(val)}
                options={masterData
                  .filter((d) => d.type === "status")
                  .map((d) => ({
                    id: d.label,
                    label: d.label,
                    icon: d.icon,
                    color: d.color,
                  }))}
                type="status"
                masterData={masterData}
              />
            </div>
            {newTaskType === "subtask" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Parent Task / Epic
                </label>
                <select
                  value={newTaskParentId}
                  onChange={(e: any) => setNewTaskParentId(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                >
                  <option value="">Select Parent...</option>
                    {tasks
                      .filter((t) => t.type !== "subtask")
                      .map((t, idx) => (
                        <option key={t.id ? `pt-${t.id}-${idx}` : `pt-${idx}`} value={t.id}>
                          {t.key}: {t.title}
                        </option>
                      ))}
                </select>
              </div>
            )}
            {/* Group 2: Assignment & Categorization */}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Priority
                </label>
                <StyledDropdown
                  value={newTaskPriority}
                  onChange={(val) => setNewTaskPriority(val)}
                  options={masterData
                    .filter((d) => d.type === "priority")
                    .map((d) => ({
                      id: d.label,
                      label: d.label,
                      icon: d.icon,
                      color: d.color,
                    }))}
                  type="priority"
                  masterData={masterData}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <StyledDropdown
                  value={newTaskCategory}
                  onChange={(val) => setNewTaskCategory(val)}
                  options={[
                    { id: "none", label: "" },
                    ...masterData.filter((d) => d.type === "category"),
                  ]}
                  type="category"
                  masterData={masterData}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Assignee
              </label>
              <select
                value={newTaskAssigneeId}
                onChange={(e: any) => setNewTaskAssigneeId(e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              >
                <option value="">Unassigned</option>
                {projectMembers.map((m, idx) => (
                  <option key={m?.uid ? `pm-${m.uid}-${idx}` : `pm-${idx}`} value={m?.uid}>
                    {m?.displayName || m?.email || "Anggota Tim"}
                  </option>
                ))}
                {selectedProject?.pendingInvites?.map((email, idx) => (
                  <option key={email ? `pi-${email}-${idx}` : `pi-${idx}`} value={email}>
                    {email} (Pending)
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Release
              </label>
              <StyledDropdown
                value={newTaskRelease}
                onChange={(val) => setNewTaskRelease(val)}
                options={[
                  { id: "none", label: "" },
                  ...masterData
                    .filter((d) => d.type === "release")
                    .sort((a, b) => (a.order || 0) - (b.order || 0)),
                ]}
                type="release"
                masterData={masterData}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Story Points
                </label>
                <Input
                  type="number"
                  value={newTaskStoryPoints || ""}
                  onChange={(e: any) =>
                    setNewTaskStoryPoints(parseInt(e.target.value) || 0)
                  }
                  placeholder="e.g. 5"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Labels (comma separated)
                </label>
                <Input
                  value={newTaskLabels}
                  onChange={(e: any) => setNewTaskLabels(e.target.value)}
                  placeholder="e.g. frontend, bug"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Business Value
                </label>
                <select
                  value={newTaskBusinessValue}
                  onChange={(e: any) => setNewTaskBusinessValue(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                >
                  <option value="">Not Set</option>
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  System Risk
                </label>
                <select
                  value={newTaskProjectRisk}
                  onChange={(e: any) => setNewTaskProjectRisk(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                >
                  <option value="">Not Set</option>
                  <option value="high">High Risk</option>
                  <option value="medium">Medium Risk</option>
                  <option value="low">Low Risk</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Environment
              </label>
              <StyledDropdown
                value={newTaskEnvironment}
                onChange={(val) => setNewTaskEnvironment(val)}
                options={[
                  { id: "none", label: "None" },
                  ...masterData.filter((d) => d.type === "environment"),
                ]}
                type="environment"
                masterData={masterData}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Figma URL
              </label>
              <Input
                type="url"
                value={newTaskFigmaUrl}
                onChange={(e: any) => setNewTaskFigmaUrl(e.target.value)}
                placeholder="https://figma.com/..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Acceptance Criteria
              </label>
              <textarea
                value={newTaskAcceptanceCriteria}
                onChange={(e: any) =>
                  setNewTaskAcceptanceCriteria(e.target.value)
                }
                placeholder="What are the conditions for completion?"
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                rows={3}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={newTaskDescription}
                onChange={(e: any) => setNewTaskDescription(e.target.value)}
                placeholder="Add description..."
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                rows={4}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Attachments
              </label>
              <input
                type="file"
                multiple
                onChange={(e: any) => {
                  const files = Array.from(e.target.files || []) as File[];
                  const validFiles: File[] = [];
                  for (const f of files) {
                    const check = validateFileClient(f);
                    if (!check.valid) {
                      toast.error(check.error || "Gagal Mengunggah Dokumen: Format file tidak didukung atau ukuran melebihi batas maksimum (Max 10MB).");
                    } else {
                      validFiles.push(f);
                    }
                  }
                  setNewTaskAttachments(validFiles);
                }}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date
                </label>
                <Input
                  type="date"
                  value={newTaskStartDate}
                  onChange={(e: any) => setNewTaskStartDate(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date
                </label>
                <Input
                  type="date"
                  value={newTaskEndDate}
                  onChange={(e: any) => setNewTaskEndDate(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Due Date
                </label>
                <Input
                  type="date"
                  value={newTaskDueDate}
                  onChange={(e: any) => setNewTaskDueDate(e.target.value)}
                />
              </div>
            </div>
            <Button
              onClick={wrapAppSubmit("createTask", handleCreateTask)} disabled={isSubmitting["createTask"]}
              className="w-full justify-center"
            >
              Create Issue
            </Button>
          </div>
        </Modal>
        <Modal
          isOpen={isEditTaskModalOpen}
          onClose={() => setIsEditTaskModalOpen(false)}
          title={`Edit Issue: ${editingTask?.key}`}
          maxWidth="max-w-3xl"
        >
          {editingTask && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Issue Title
                </label>
                <Input
                  value={editingTask.title ?? ""}
                  onChange={(e: any) =>
                    setEditingTask({ ...editingTask, title: e.target.value })
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Assignee
                  </label>
                  <select
                    value={
                      editingTask.assigneeId || editingTask.assigneeEmail || ""
                    }
                    onChange={(e: any) =>
                      setEditingTask({
                        ...editingTask,
                        assigneeId: e.target.value,
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg"
                  >
                    <option value="">Unassigned</option>
                    {projectMembers.map((m, idx) => (
                      <option key={m?.uid ? `pm-edit-${m.uid}-${idx}` : `pm-edit-${idx}`} value={m?.uid}>
                        {m?.displayName || m?.email || "Anggota Tim"}
                      </option>
                    ))}
                    {selectedProject?.pendingInvites?.map((email, idx) => (
                      <option key={email ? `pi-edit-${email}-${idx}` : `pi-edit-${idx}`} value={email}>
                        {email} (Pending)
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    value={editingTask.status ?? ""}
                    onChange={(e: any) =>
                      setEditingTask({ ...editingTask, status: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg"
                  >
                    {masterData
                      .filter((d) => d.type === "status")
                      .sort((a, b) => (a.order || 0) - (b.order || 0))
                      .map((s, idx) => (
                        <option key={s.id ? `e-st-${s.id}-${idx}` : `e-st-${idx}`} value={s.label}>
                          {s.label}
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Priority
                  </label>
                  <select
                    value={editingTask.priority ?? ""}
                    onChange={(e: any) =>
                      setEditingTask({
                        ...editingTask,
                        priority: e.target.value,
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg"
                  >
                    {masterData
                      .filter((d) => d.type === "priority")
                      .sort((a, b) => (a.order || 0) - (b.order || 0))
                      .map((p, idx) => (
                        <option key={p.id ? `e-pr-${p.id}-${idx}` : `e-pr-${idx}`} value={p.label}>
                          {p.label}
                        </option>
                      ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <select
                    value={editingTask.category || ""}
                    onChange={(e: any) =>
                      setEditingTask({
                        ...editingTask,
                        category: e.target.value,
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg"
                  >
                    <option value="">None</option>
                    {masterData
                      .filter((d) => d.type === "category")
                      .sort((a, b) => (a.order || 0) - (b.order || 0))
                      .map((c, idx) => (
                        <option key={c.id ? `e-cat-${c.id}-${idx}` : `e-cat-${idx}`} value={c.label}>
                          {c.label}
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Release
                  </label>
                  <select
                    value={editingTask.release || ""}
                    onChange={(e: any) =>
                      setEditingTask({
                        ...editingTask,
                        release: e.target.value,
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg"
                  >
                    <option value="">None</option>
                    {masterData
                      .filter((d) => d.type === "release")
                      .sort((a, b) => (a.order || 0) - (b.order || 0))
                      .map((r, idx) => (
                        <option key={r.id ? `e-rel-${r.id}-${idx}` : `e-rel-${idx}`} value={r.label}>
                          {r.label}
                        </option>
                      ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Business Value
                  </label>
                  <select
                    value={editingTask.businessValue || ""}
                    onChange={(e: any) =>
                      setEditingTask({
                        ...editingTask,
                        businessValue: e.target.value,
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm"
                  >
                    <option value="">Not Set</option>
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    System Risk
                  </label>
                  <select
                    value={editingTask.projectRisk || ""}
                    onChange={(e: any) =>
                      setEditingTask({
                        ...editingTask,
                        projectRisk: e.target.value,
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm"
                  >
                    <option value="">Not Set</option>
                    <option value="high">High Risk</option>
                    <option value="medium">Medium Risk</option>
                    <option value="low">Low Risk</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Story Points
                  </label>
                  <Input
                    type="number"
                    value={editingTask.storyPoints || ""}
                    onChange={(e: any) =>
                      setEditingTask({
                        ...editingTask,
                        storyPoints: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Environment
                  </label>
                  <select
                    value={editingTask.environment || ""}
                    onChange={(e: any) =>
                      setEditingTask({
                        ...editingTask,
                        environment: e.target.value,
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm"
                  >
                    <option value="">None</option>
                    {masterData
                      .filter((d) => d.type === "environment")
                      .map((e, idx) => (
                        <option key={e.id ? `e-env-${e.id}-${idx}` : `e-env-${idx}`} value={e.label}>
                          {e.label}
                        </option>
                      ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Acceptance Criteria
                </label>
                <textarea
                  value={editingTask.acceptanceCriteria || ""}
                  onChange={(e: any) =>
                    setEditingTask({
                      ...editingTask,
                      acceptanceCriteria: e.target.value,
                    })
                  }
                  placeholder="Completion criteria..."
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date
                  </label>
                  <Input
                    type="date"
                    value={editingTask.startDate || ""}
                    onChange={(e: any) =>
                      setEditingTask({
                        ...editingTask,
                        startDate: e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Date
                  </label>
                  <Input
                    type="date"
                    value={editingTask.endDate || ""}
                    onChange={(e: any) =>
                      setEditingTask({
                        ...editingTask,
                        endDate: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
              <Button
                onClick={wrapAppSubmit("updateTask", handleUpdateTask)} disabled={isSubmitting["updateTask"]}
                className="w-full justify-center"
              >
                Save Changes
              </Button>
            </div>
          )}
        </Modal>


        <Modal
          isOpen={isEditProjectModalOpen}
          onClose={() => setIsEditProjectModalOpen(false)}
          title="Edit Project"
          maxWidth="max-w-2xl"
        >
          {editingProject && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Project Name
                </label>
                <Input
                  value={editingProject.name ?? ""}
                  onChange={(e: any) =>
                    setEditingProject({
                      ...editingProject,
                      name: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Project Key
                </label>
                <Input
                  value={editingProject.key ?? ""}
                  onChange={(e: any) =>
                    setEditingProject({
                      ...editingProject,
                      key: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={editingProject.description || ""}
                  onChange={(e) =>
                    setEditingProject({
                      ...editingProject,
                      description: e.target.value,
                    })
                  }
                  className="w-full border border-gray-200 rounded-lg p-2 text-sm"
                  placeholder="Describe project..."
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    value={editingProject.status || "Active"}
                    onChange={(e) =>
                      setEditingProject({
                        ...editingProject,
                        status: e.target.value as any,
                      })
                    }
                    className="w-full border border-gray-200 rounded-lg p-2 text-sm"
                  >
                    <option value="Active">Active</option>
                    <option value="On Hold">On Hold</option>
                    <option value="Completed">Completed</option>
                    <option value="Archived">Archived</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ID (Ref)
                  </label>
                  <div className="px-3 py-2 bg-gray-50 rounded-lg text-sm text-gray-500 font-mono border border-gray-100 italic">
                    #{editingProject.id.slice(-6).toUpperCase()}
                  </div>
                </div>
              </div>
              <div className="pt-2">
                <Button
                  onClick={wrapAppSubmit("updateProject", handleUpdateProject)} disabled={isSubmitting["updateProject"]}
                  className="w-full justify-center"
                >
                  Save Changes
                </Button>
              </div>

              {hasPermission(
                effectiveRole,
                "configuration",
                "delete",
                (currentUser?.uid || user?.uid) === editingProject.ownerId,
                currentUserProfile?.permissions,
              ) && (
                <div className="mt-6 pt-6 border-t border-red-50">
                  <p className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-3">
                    Danger Zone
                  </p>
                  <Button
                    onClick={() => deleteProject(editingProject)}
                    variant="danger"
                    className="w-full justify-center"
                  >
                    <Trash2 className="w-4 h-4" />
                    Terminate Project (Permanent Delete)
                  </Button>
                </div>
              )}
            </div>
          )}
        </Modal>

        {confirmAction?.isOpen && (
          <ConfirmationModal
            isOpen={confirmAction?.isOpen || false}
            onClose={() => setConfirmAction(null)}
            title={confirmAction?.title || "Konfirmasi Tindakan"}
            message={confirmAction?.message || ""}
            isLoading={confirmAction?.isLoading}
            onConfirm={async () => {
              if (confirmAction?.onConfirm) {
                setConfirmAction(prev => prev ? { ...prev, isLoading: true } : prev);
                try {
                  await confirmAction.onConfirm();
                } catch (e) {
                  console.error("Action error:", e);
                }
              }
              setConfirmAction(null);
            }}
            confirmText={confirmAction?.confirmText || (confirmAction?.isAlert ? "OK" : "Ya, Lanjutkan")}
            cancelText={confirmAction?.cancelText || "Batal"}
            isAlert={confirmAction?.isAlert || false}
            variant={
              confirmAction?.variant ||
              (confirmAction?.isAlert
                ? "info"
                : (confirmAction?.title?.toLowerCase().includes("danger") ||
                   confirmAction?.title?.toLowerCase().includes("hapus") ||
                   confirmAction?.title?.toLowerCase().includes("delete") ||
                   confirmAction?.title?.toLowerCase().includes("terminate"))
                ? "danger"
                : "warning")
            }
            closeOnBackdropClick={
              confirmAction?.closeOnBackdropClick ??
              !(
                confirmAction?.variant === "danger" ||
                confirmAction?.title?.toLowerCase().includes("danger") ||
                confirmAction?.title?.toLowerCase().includes("hapus") ||
                confirmAction?.title?.toLowerCase().includes("delete") ||
                confirmAction?.title?.toLowerCase().includes("terminate")
              )
            }
          />
        )}

        <ProfileEditModal
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
          userProfile={currentUser}
          onProfileUpdated={(updatedProfile) => {
            if (currentUser) {
              const newUser = { ...currentUser, ...updatedProfile };
              setCurrentUser(newUser);
              setCurrentUserProfile(newUser);
              localStorage.setItem("sessionUser", JSON.stringify(newUser));
            }
          }}
        />
      </div>
    </div>
  </PresenceProvider>
  );
}

export default App;
