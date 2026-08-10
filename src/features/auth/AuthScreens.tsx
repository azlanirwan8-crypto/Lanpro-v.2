import React, { useState, useEffect, useMemo } from "react";
import { LogIn, Lock, Activity, Users, FileText, Bot, ArrowRight, UserPlus, Fingerprint, RefreshCcw, Eye, EyeOff, Building, MapPin, Building2, User, Phone, Briefcase, Mail, AlertCircle, X } from "lucide-react";
import { Button, Input, VelzonFloatingParticles, GoogleIcon, cn } from "../../components/ui/CoreUI";
import { motion, AnimatePresence } from "framer-motion";
import { apiRequest, setAuthToken } from "../../lib/api";
import { googleSignIn } from "../../lib/firebase";
import { registrationSchema, evaluatePasswordStrength } from "../../lib/registrationSchema";
import { toast } from "sonner";
import { VelzonSuccessIcon } from "../../components/AuthToastContainer";

export const AuthHeroPanel = () => (
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

export const AuthWatermarkPattern = () => (
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

export const RegisterScreen = ({
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

export const LoginSkeletonState = ({ loadingText }: { loadingText?: string }) => {
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

export const LoginScreen = ({
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


