import React, { useState, useEffect } from 'react';
import { UserProfile, Project, Task, AppRole, UserPermissions } from '../../types';
import { UserAvatar } from './styles';
import { 
  ArrowLeft, ShieldCheck, Award, UserCog, Users, Eye, CheckCircle, 
  Layout, Mail, Phone, Calendar, Key, Check, X, Shield, Clock, Building,
  Lock, ShieldAlert, Trash2, Plus, UserPlus, Save, RefreshCw, HelpCircle, Server, Edit3, RotateCcw
} from 'lucide-react';
import { ResponsiveTable } from "../../components/ResponsiveTable";
import { cn } from '../../lib/utils';
import { toast } from 'sonner';
import { apiRequest } from '../../lib/api';
import { DEFAULT_PERMISSIONS as ROLE_DEFAULT_PERMISSIONS, getUserPermissions } from '../../lib/permissions';

interface UserDetailViewProps {
  user: UserProfile | null;
  onBack: () => void;
  projects: Project[];
  tasks: Task[];
  departments?: any[];
  positions?: any[];
  masterData?: any[];
  onUserUpdated?: () => void;
}

const MODULE_DESCRIPTIONS: Record<string, { label: string; desc: string }> = {
  dashboard: { label: 'Dashboard Executive', desc: 'Akses ke executive KPI summary & analytics widget' },
  meetingNotes: { label: 'Notulensi Rapat (Notes)', desc: 'Membuat & mengelola catatan rapat serta AI Companion' },
  wiki: { label: 'Wiki & Dokumentasi', desc: 'Dokumentasi internal, SOP, dan pengetahuan tim' },
  notebooklm: { label: 'NotebookLM AI Workspace', desc: 'Workspace catatan AI dan analisa sumber data' },
  list: { label: 'Pengelolaan Issue / Tugas', desc: 'Daftar tugas, pembuatan issue, dan pelacakan status' },
  sprints: { label: 'Sprint & Planning', desc: 'Sprint planning, backlog management, dan alokasi tugas' },
  board: { label: 'Papan Kanban', desc: 'Visualisasi alur kerja papan Kanban dan drag & drop task' },
  qa: { label: 'Pengujian QA & Test Case', desc: 'Membuat test suite, test case, dan melacak hasil pengujian' },
  timeline: { label: 'Roadmap & Timeline', desc: 'Visualisasi linimasa proyek dan milestone' },
  access: { label: 'Akses Tim & Proyek', desc: 'Manajemen anggota tim dan delegasi proyek' },
  userManagement: { label: 'Manajemen Pengguna System', desc: 'Mengelola profil user, role, dan clearance status' },
  masterData: { label: 'Master Data Setup', desc: 'Konfigurasi master data departemen, jabatan, dan role' },
  auditLog: { label: 'Log Audit Sistem', desc: 'Riwayat aktivitas user dan catatan keamanan' },
  dbExplorer: { label: 'Database Explorer', desc: 'Inspeksi tabel dan query database' },
  settings: { label: 'Konfigurasi Sistem', desc: 'Pengaturan Email SMTP, WhatsApp Gateway, & Template' },
  flowchart: { label: 'Diagram & Flowchart', desc: 'Pembuatan diagram proses dan flowchart kerja' },
};

const ROLE_DESCRIPTIONS: Record<string, { label: string; desc: string; icon: React.ReactNode }> = {
  admin: {
    label: 'Administrator (Super User)',
    desc: 'Memiliki akses penuh ke seluruh modul sistem, master data, serta konfigurasi server.',
    icon: <ShieldCheck className="w-4 h-4 text-rose-600" />
  },
  head: {
    label: 'Department Head',
    desc: 'Wewenang supervisi departemen, persetujuan modul rapat & dokumentasi.',
    icon: <Award className="w-4 h-4 text-purple-600" />
  },
  manager: {
    label: 'Project Manager',
    desc: 'Pengelolaan penuh pada proyek, tugas, sprint, kanban, dan pengujian QA.',
    icon: <UserCog className="w-4 h-4 text-blue-600" />
  },
  user: {
    label: 'Standard User (Anggota Tim)',
    desc: 'Akses membuat & memperbarui tugas, notulensi rapat, serta catatan AI.',
    icon: <Users className="w-4 h-4 text-indigo-600" />
  },
  viewer: {
    label: 'Observer (Read-Only)',
    desc: 'Akses hanya melihat data (read-only) tanpa hak mengubah atau membuat data.',
    icon: <Eye className="w-4 h-4 text-slate-500" />
  }
};

export const UserDetailView: React.FC<UserDetailViewProps> = ({
  user,
  onBack,
  projects = [],
  tasks = [],
  departments = [],
  positions = [],
  masterData = [],
  onUserUpdated
}) => {
  if (!user) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#f8fafc]">
        <h2 className="text-xl font-bold text-slate-800 mb-2">Pengguna tidak ditemukan</h2>
        <button onClick={onBack} className="px-4 py-2 bg-indigo-600 text-white rounded-md text-xs font-medium">
          Kembali
        </button>
      </div>
    );
  }

  // Form Edit State
  const [editRole, setEditRole] = useState<AppRole>(user.role || 'user');
  const [editStatus, setEditStatus] = useState<'approved' | 'pending' | 'rejected'>(user.status || 'approved');
  const [editDepartment, setEditDepartment] = useState<string>(user.department || '');
  const [editPosition, setEditPosition] = useState<string>(user.position || '');
  const [editFullName, setEditFullName] = useState<string>(user.displayName || user.username || '');
  const [editEmail, setEditEmail] = useState<string>(user.email || '');
  const [editPhone, setEditPhone] = useState<string>(user.phone || '');
  const [editPassword, setEditPassword] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // System Permissions Matrix State
  const [editPermissions, setEditPermissions] = useState<UserPermissions>(() => {
    return getUserPermissions(user.role || 'user', user.permissions);
  });

  // Project Delegation State
  const [selectedAssignProjectId, setSelectedAssignProjectId] = useState<string>('');
  const [selectedAssignProjectRole, setSelectedAssignProjectRole] = useState<string>('Member');
  const [userProjectsList, setUserProjectsList] = useState<Project[]>([]);

  // Sync state when user changes
  useEffect(() => {
    if (user) {
      setEditRole(user.role || 'user');
      setEditStatus(user.status || 'approved');
      setEditDepartment(user.department || '');
      setEditPosition(user.position || '');
      setEditFullName(user.displayName || user.username || '');
      setEditEmail(user.email || '');
      setEditPhone(user.phone || '');
      setEditPassword('');
      setEditPermissions(getUserPermissions(user.role || 'user', user.permissions));
    }
  }, [user]);

  // Compute user projects
  useEffect(() => {
    const list = (projects || []).filter(p =>
      (p.members && (p.members.includes(user.id) || p.members.includes(user.uid))) ||
      p.ownerId === user.id ||
      p.ownerId === user.uid
    );
    setUserProjectsList(list);
  }, [projects, user]);

  const userTasks = (tasks || []).filter(t =>
    t.assigneeId === user.id ||
    t.assigneeId === user.uid ||
    (t.assignees && (t.assignees.includes(user.id) || t.assignees.includes(user.uid))) ||
    t.assigneeEmail === user?.email
  );

  const getDeptName = (deptId?: string) => {
    const allDepts = departments.length > 0 ? departments : masterData.filter(d => d.type === 'department');
    const found = allDepts.find((d: any) => (d.id || d.code) === deptId || d.label === deptId);
    return found?.name || found?.label || deptId || 'Umum';
  };

  const getPosName = (posId?: string) => {
    const allPos = positions.length > 0 ? positions : masterData.filter(d => d.type === 'jabatan' || d.type === 'position');
    const found = allPos.find((p: any) => (p.id || p.code) === posId || p.label === posId);
    return found?.name || found?.label || posId || 'Anggota Tim';
  };

  const handleTogglePermission = (module: keyof UserPermissions, action: 'read' | 'create' | 'update' | 'delete') => {
    setEditPermissions(prev => {
      const currentModule = prev[module] || { read: false, create: false, update: false, delete: false };
      return {
        ...prev,
        [module]: {
          ...currentModule,
          [action]: !currentModule[action]
        }
      };
    });
  };

  const handleResetToRoleDefaults = () => {
    const defaultPerms = ROLE_DEFAULT_PERMISSIONS[editRole] || ROLE_DEFAULT_PERMISSIONS.user;
    setEditPermissions(defaultPerms);
    toast.success(`Matrix hak akses di-reset ke default role "${editRole}".`);
  };

  const handleSaveUser = async () => {
    if (!editFullName.trim()) {
      toast.error('Nama Lengkap wajib diisi.');
      return;
    }

    setIsSaving(true);
    try {
      const payload: any = {
        displayName: editFullName.trim(),
        email: editEmail.trim(),
        phone: editPhone.trim(),
        role: editRole,
        status: editStatus,
        department: editDepartment,
        position: editPosition,
        permissions: editPermissions
      };

      if (editPassword.trim()) {
        payload.password = editPassword.trim();
      }

      const res = await apiRequest(`/api/users/${user.id || user.uid}`, {
        method: 'PUT',
        body: payload
      });

      if (res.status === 'success' || res.data) {
        toast.success(`Data & Hak Akses Pengguna ${editFullName} Berhasil Diperbarui!`);
        if (onUserUpdated) onUserUpdated();
      } else {
        toast.error(res.message || 'Gagal memperbarui data user.');
      }
    } catch (e: any) {
      console.error('Save user error:', e);
      toast.error(e.message || 'Terjadi kesalahan saat menyimpan perubahan user.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAssignToProject = async () => {
    if (!selectedAssignProjectId) {
      toast.error('Pilih project terlebih dahulu');
      return;
    }

    try {
      const p = projects.find(proj => proj.id === selectedAssignProjectId);
      if (!p) return;

      const currentMembers = p.members || [];
      const userId = user.id || user.uid;
      const updatedMembers = Array.from(new Set([...currentMembers, userId]));
      const updatedRoles = { ...(p.memberRoles || {}), [userId]: selectedAssignProjectRole };

      await apiRequest(`/api/projects/${p.id}`, {
        method: 'PUT',
        body: { members: updatedMembers, memberRoles: updatedRoles }
      });

      toast.success(`Pengguna berhasil ditugaskan ke project ${p.name}`);
      setSelectedAssignProjectId('');
      if (onUserUpdated) onUserUpdated();
    } catch (e) {
      toast.error('Gagal menugaskan pengguna ke project');
    }
  };

  const handleRemoveFromProject = async (projectId: string) => {
    try {
      const p = projects.find(proj => proj.id === projectId);
      if (!p) return;

      const userId = user.id || user.uid;
      const updatedMembers = (p.members || []).filter(m => m !== userId);
      const updatedRoles = { ...(p.memberRoles || {}) };
      delete updatedRoles[userId];

      await apiRequest(`/api/projects/${p.id}`, {
        method: 'PUT',
        body: { members: updatedMembers, memberRoles: updatedRoles }
      });

      toast.success(`Pengguna dikeluarkan dari project ${p.name}`);
      if (onUserUpdated) onUserUpdated();
    } catch (e) {
      toast.error('Gagal mengeluarkan pengguna dari project');
    }
  };

  const generateRandomPassword = () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let pass = "";
    for (let i = 0; i < 12; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setEditPassword(pass);
    navigator.clipboard.writeText(pass);
    toast.success(`Password acak dibuat: "${pass}". Berhasil disalin ke clipboard!`);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-slate-950 overflow-y-auto p-3 md:p-6">
      <div className="flex flex-col space-y-5 min-h-full animate-in fade-in duration-700">
        {/* Velzon Sticky Header Bar */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-6 py-3.5 flex items-center justify-between sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-600 text-slate-700 dark:text-slate-200 rounded-md transition-all flex items-center gap-2 text-xs font-medium cursor-pointer shadow-xs"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Manajemen Pengguna</span>
          </button>
          <div className="h-4 w-px bg-slate-200 dark:bg-slate-800" />
          <div className="flex flex-col">
            <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 tracking-wider uppercase">
              DETAIL PROFIL & MATRIX HAK AKSES
            </span>
            <h1 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              {user.displayName || user.username}
            </h1>
          </div>
        </div>

        <button
          onClick={handleSaveUser}
          disabled={isSaving}
          className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-medium shadow-xs transition disabled:opacity-50"
        >
          {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          <span>Simpan Perubahan User</span>
        </button>
      </div>

      {/* Main Content Area */}
      <div className="w-full space-y-5 flex-1">
        {/* Profile Card Header */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-lg shadow-xs border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-center md:items-start gap-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-50 dark:bg-indigo-950/20 rounded-bl-full pointer-events-none opacity-60" />
          
          <UserAvatar user={user} className="w-20 h-20 text-2xl shadow-sm border-2 border-white dark:border-slate-800 ring-2 ring-indigo-50 dark:ring-indigo-950 shrink-0" />
          
          <div className="flex-1 text-center md:text-left space-y-2 z-10">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">{user.displayName || user.username}</h2>
                <p className="text-xs text-slate-400 mt-0.5">@{user.username || user.email?.split('@')[0]}</p>
              </div>
              <div className="flex items-center justify-center gap-2">
                <span className={cn(
                  "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold uppercase border shadow-xs",
                  editRole === 'admin' ? "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800" :
                  editRole === 'head' ? "bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800" :
                  editRole === 'manager' ? "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800" :
                  editRole === 'user' ? "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800" :
                  "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700"
                )}>
                  {editRole === 'admin' && <ShieldCheck className="w-3.5 h-3.5 shrink-0" />}
                  {editRole === 'head' && <Award className="w-3.5 h-3.5 shrink-0" />}
                  {editRole === 'manager' && <UserCog className="w-3.5 h-3.5 shrink-0" />}
                  {editRole === 'user' && <Users className="w-3.5 h-3.5 shrink-0" />}
                  {editRole === 'viewer' && <Eye className="w-3.5 h-3.5 shrink-0" />}
                  <span>{editRole}</span>
                </span>
                
                <span className={cn(
                  "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold uppercase border shadow-xs",
                  editStatus === 'approved' ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800" :
                  editStatus === 'pending' ? "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800" :
                  "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800"
                )}>
                  {editStatus === 'approved' ? <CheckCircle className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                  <span>{editStatus}</span>
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5 text-xs text-slate-600 dark:text-slate-300">
                <div className="p-1.5 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-md">
                  <Mail className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="text-[10px] uppercase font-medium text-slate-400">Email Address</div>
                  <div className="font-semibold text-slate-800 dark:text-slate-100 text-xs">{editEmail || 'Tidak tersedia'}</div>
                </div>
              </div>

              <div className="flex items-center gap-2.5 text-xs text-slate-600 dark:text-slate-300">
                <div className="p-1.5 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-md">
                  <Phone className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="text-[10px] uppercase font-medium text-slate-400">WhatsApp / HP</div>
                  <div className="font-semibold text-slate-800 dark:text-slate-100 text-xs">{editPhone || 'Tidak tersedia'}</div>
                </div>
              </div>

              <div className="flex items-center gap-2.5 text-xs text-slate-600 dark:text-slate-300">
                <div className="p-1.5 bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 rounded-md">
                  <Building className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="text-[10px] uppercase font-medium text-slate-400">Departemen / Posisi</div>
                  <div className="font-semibold text-slate-800 dark:text-slate-100 text-xs">{getDeptName(editDepartment)} • {getPosName(editPosition)}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 2-Column Grid Layout */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          
          {/* LEFT COLUMN: Account & Organization Settings + Permissions Matrix (5 cols) */}
          <div className="xl:col-span-5 space-y-5">
            {/* Account & Organization Form */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 space-y-4 shadow-xs">
              <h4 className="font-semibold text-slate-800 dark:text-slate-100 text-xs uppercase tracking-wider border-b border-slate-200 dark:border-slate-800 pb-2.5 flex items-center gap-2">
                <Lock className="w-4 h-4 text-indigo-500" />
                Pengaturan Akun & Organisasi
              </h4>

              <div className="space-y-3">
                {/* System Role Selection */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">System Role</label>
                  <select
                    value={editRole}
                    onChange={(e) => {
                      const newRole = e.target.value as AppRole;
                      setEditRole(newRole);
                      setEditPermissions(ROLE_DEFAULT_PERMISSIONS[newRole] || ROLE_DEFAULT_PERMISSIONS.user);
                    }}
                    className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-xs font-medium text-slate-800 dark:text-slate-100 outline-none focus:border-indigo-500 transition-all cursor-pointer"
                  >
                    <option value="admin">Administrator (Full Access)</option>
                    <option value="head">Department Head (Head)</option>
                    <option value="manager">Project Manager (Manager)</option>
                    <option value="user">Standard User (User)</option>
                    <option value="viewer">Observer (Viewer - Read Only)</option>

                    {masterData
                      .filter(d => d.type === 'project_role' && (d.roleType === 'SYSTEM' || d.role_type === 'SYSTEM'))
                      .map(role => {
                        const roleValue = (role.label || '').toLowerCase();
                        if (['admin', 'head', 'manager', 'user', 'viewer', 'administrator'].includes(roleValue)) return null;
                        return (
                          <option key={role.id} value={role.label}>
                            {role.label}
                          </option>
                        );
                      })
                    }
                  </select>
                </div>

                {/* Role Description Card */}
                {editRole && ROLE_DESCRIPTIONS[editRole] && (
                  <div className="p-2.5 rounded-md border text-xs leading-relaxed flex gap-2.5 bg-indigo-50/50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800 text-indigo-900 dark:text-indigo-200">
                    <div className="shrink-0 mt-0.5">
                      {ROLE_DESCRIPTIONS[editRole].icon}
                    </div>
                    <div className="space-y-0.5">
                      <p className="font-semibold text-xs text-indigo-950 dark:text-indigo-100">
                        {ROLE_DESCRIPTIONS[editRole].label}
                      </p>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400">
                        {ROLE_DESCRIPTIONS[editRole].desc}
                      </p>
                    </div>
                  </div>
                )}

                {/* Account Status */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Account Status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as any)}
                    className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-xs font-medium text-slate-800 dark:text-slate-100 outline-none focus:border-indigo-500 transition-all cursor-pointer"
                  >
                    <option value="approved">Active / Approved</option>
                    <option value="pending">Waiting for Approval</option>
                    <option value="rejected">Suspended / Rejected</option>
                  </select>
                </div>

                {/* Department & Position */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Department</label>
                    <select
                      value={editDepartment}
                      onChange={(e) => setEditDepartment(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-xs font-medium text-slate-800 dark:text-slate-100 outline-none focus:border-indigo-500 transition-all cursor-pointer"
                    >
                      <option value="">Select Department</option>
                      {(departments.length > 0 ? departments : masterData.filter(d => d.type === 'department')).map(opt => (
                        <option key={opt.id || opt.code} value={opt.id || opt.code}>{opt.name || opt.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Position</label>
                    <select
                      value={editPosition}
                      onChange={(e) => setEditPosition(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-xs font-medium text-slate-800 dark:text-slate-100 outline-none focus:border-indigo-500 transition-all cursor-pointer"
                    >
                      <option value="">Select Position</option>
                      {(positions.length > 0 ? positions : masterData.filter(d => d.type === 'jabatan' || d.type === 'position')).map(opt => (
                        <option key={opt.id || opt.code} value={opt.id || opt.code}>{opt.name || opt.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Full Name & Email */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Full Name</label>
                  <input
                    value={editFullName}
                    onChange={(e) => setEditFullName(e.target.value)}
                    placeholder="Nama lengkap..."
                    className="w-full px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-md text-xs font-medium outline-none focus:border-indigo-500 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Email</label>
                    <input
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      placeholder="email@domain.com"
                      className="w-full px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-md text-xs font-medium outline-none focus:border-indigo-500 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Nomor HP / WhatsApp</label>
                    <input
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      placeholder="08123456789"
                      className="w-full px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-md text-xs font-medium outline-none focus:border-indigo-500 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
                    />
                  </div>
                </div>

                {/* Password Reset */}
                <div className="space-y-1 pt-1 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Update Password</label>
                    <button
                      type="button"
                      onClick={generateRandomPassword}
                      className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-medium cursor-pointer"
                    >
                      <Key className="w-3 h-3" /> Buat Password Acak
                    </button>
                  </div>
                  <input
                    type="text"
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    placeholder="Kosongkan jika tidak diubah..."
                    className="w-full px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-md text-xs font-medium outline-none focus:border-indigo-500 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>
            </div>

            {/* Custom System Permissions Matrix Table */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 space-y-3 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2.5">
                <div>
                  <h4 className="font-semibold text-slate-800 dark:text-slate-100 text-xs uppercase tracking-wider">Active System Permissions & Overrides</h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-normal mt-0.5">Konfigurasi hak akses modul spesifik untuk akun pengguna ini.</p>
                </div>
                <button
                  type="button"
                  onClick={handleResetToRoleDefaults}
                  className="px-2.5 py-1 text-[11px] bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-md font-medium transition flex items-center gap-1 shrink-0"
                  title="Reset to role default permissions"
                >
                  <RotateCcw className="w-3 h-3" /> Reset Role Default
                </button>
              </div>

              {editRole === 'admin' && (
                <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 p-2.5 rounded-md text-xs">
                  <ShieldAlert className="w-4 h-4 shrink-0 text-amber-500" />
                  <span>Role <strong>Administrator</strong> memiliki akses penuh secara default, namun override per-modul di bawah akan diberlakukan secara eksplisit.</span>
                </div>
              )}

              <div className="border border-slate-200 dark:border-slate-800 rounded-md overflow-hidden shadow-xs max-w-full overflow-x-auto">
                <ResponsiveTable className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-2 px-3 font-semibold text-[10px] text-slate-500 dark:text-slate-400 uppercase">Module</th>
                      {(['read', 'create', 'update', 'delete'] as const).map(action => (
                        <th key={action} className="py-2 px-1 font-semibold text-[10px] text-slate-500 dark:text-slate-400 uppercase text-center w-14">
                          {action}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                    {(Object.keys(MODULE_DESCRIPTIONS) as Array<keyof UserPermissions>).map(module => {
                      const moduleInfo = MODULE_DESCRIPTIONS[module] || { label: module, desc: "" };
                      return (
                        <tr key={module} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="py-2 px-3 font-medium text-slate-700 dark:text-slate-200 text-xs">
                            <div className="inline-flex items-center gap-1" title={moduleInfo.desc}>
                              <span>{moduleInfo.label}</span>
                            </div>
                          </td>
                          {(['read', 'create', 'update', 'delete'] as const).map(action => {
                            const isChecked = editPermissions[module]?.[action];
                            const isDefaultGranted = ROLE_DEFAULT_PERMISSIONS[editRole]?.[module]?.[action];
                            const isOverride = isChecked !== isDefaultGranted;

                            return (
                              <td key={action} className="py-1.5 px-1 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleTogglePermission(module, action)}
                                  className={cn(
                                    "w-5 h-5 rounded-md flex items-center justify-center mx-auto transition-all cursor-pointer border relative",
                                    isChecked
                                      ? "bg-indigo-600 text-white border-indigo-500 shadow-xs"
                                      : "bg-slate-50 dark:bg-slate-800 text-slate-300 dark:text-slate-600 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700",
                                    isOverride && "ring-2 ring-amber-400 ring-offset-1 dark:ring-offset-slate-900"
                                  )}
                                  title={isChecked ? `Granted (${isOverride ? 'Explicit Override' : 'Role Default'}). Click to revoke.` : `Revoked (${isOverride ? 'Explicit Override' : 'Role Default'}). Click to grant.`}
                                >
                                  <Check className={cn("w-3 h-3 text-current", isChecked ? "opacity-100" : "opacity-0")} />
                                  {isOverride && (
                                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-amber-500 rounded-full ring-1 ring-white dark:ring-slate-900" />
                                  )}
                                </button>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </ResponsiveTable>
              </div>
            </div>

          </div>

          {/* RIGHT COLUMN: Work Overview, Project Involvement & Tasks (7 cols) */}
          <div className="xl:col-span-7 space-y-5">

            {/* Work Overview Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-lg flex items-center gap-3 shadow-xs">
                <div className="w-9 h-9 rounded-md bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                  <Server className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">Total Proyek Terkait</span>
                  <span className="text-base font-bold text-slate-800 dark:text-slate-100 leading-none">{userProjectsList.length} Proyek</span>
                </div>
              </div>
              
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-lg flex items-center gap-3 shadow-xs">
                <div className="w-9 h-9 rounded-md bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                  <CheckCircle className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">Tugas Ditugaskan</span>
                  <span className="text-base font-bold text-slate-800 dark:text-slate-100 leading-none">{userTasks.length} Tugas</span>
                </div>
              </div>
            </div>

            {/* Form Delegasi Project Baru */}
            <div className="bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 rounded-lg p-4 shadow-xs space-y-3">
              <div className="space-y-0.5">
                <h4 className="font-semibold text-indigo-950 dark:text-indigo-100 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <UserPlus className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                  Delegasikan ke Proyek Baru
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-300">Tambahkan akses proyek dan peranan pengguna ini dalam tim.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center">
                <div className="sm:col-span-5">
                  <select
                    value={selectedAssignProjectId}
                    onChange={(e) => setSelectedAssignProjectId(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-xs font-medium text-slate-800 dark:text-slate-100 outline-none focus:border-indigo-500 truncate"
                  >
                    <option value="">-- Pilih Proyek --</option>
                    {projects.filter(p => {
                      const r = p.memberRoles || {};
                      const uId = user.id || user.uid;
                      return !Object.keys(r).includes(uId) && !(p.members || []).includes(uId);
                    }).map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-4">
                  <select
                    value={selectedAssignProjectRole}
                    onChange={(e) => setSelectedAssignProjectRole(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-xs font-medium text-slate-800 dark:text-slate-100 outline-none focus:border-indigo-500"
                  >
                    <option value="Owner">Owner</option>
                    <option value="Lead">Lead</option>
                    <option value="Manager">Manager</option>
                    <option value="Member">Member</option>
                    <option value="Viewer">Viewer</option>
                  </select>
                </div>

                <div className="sm:col-span-3">
                  <button
                    type="button"
                    onClick={handleAssignToProject}
                    className="w-full flex items-center justify-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-xs font-medium shadow-xs transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Delegasikan</span>
                  </button>
                </div>
              </div>
            </div>

            {/* List Proyek Terkait */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-lg shadow-xs border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layout className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <h3 className="text-xs font-semibold text-slate-800 dark:text-slate-100 uppercase tracking-wider">Proyek Terkait ({userProjectsList.length})</h3>
                </div>
              </div>
              
              {userProjectsList.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-6 text-center">Pengguna belum tergabung dalam proyek aktif.</p>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1 custom-scrollbar">
                  {userProjectsList.map(p => {
                    const uId = user.id || user.uid;
                    const roleInProject = p.memberRoles?.[uId] || (p.ownerId === uId ? 'Owner' : 'Member');
                    const projectTasks = userTasks.filter(t => t.projectId === p.id);

                    return (
                      <div key={p.id} className="p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-md space-y-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-semibold text-xs text-slate-800 dark:text-slate-100">{p.name}</div>
                            <div className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400 uppercase mt-0.5">{p.key}</div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-semibold uppercase px-2 py-0.5 bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 rounded-md border border-indigo-200 dark:border-indigo-800">
                              {roleInProject}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveFromProject(p.id)}
                              className="p-1 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-md transition-colors"
                              title="Keluarkan dari project"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Tasks in project */}
                        {projectTasks.length > 0 && (
                          <div className="pt-1.5 border-t border-slate-200/60 dark:border-slate-800 space-y-1">
                            <div className="text-[10px] text-slate-400 font-medium uppercase">Tugas Terdelegasi ({projectTasks.length}):</div>
                            <div className="space-y-1">
                              {projectTasks.map(t => (
                                <div key={t.id} className="flex items-center justify-between text-xs bg-white dark:bg-slate-900 p-1.5 px-2 rounded-md border border-slate-200/80 dark:border-slate-800">
                                  <span className="font-medium text-slate-700 dark:text-slate-300 truncate max-w-[240px]">{t.title}</span>
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">{t.status || 'todo'}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* List Tugas / Issue Terkait */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-lg shadow-xs border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                  <h3 className="text-xs font-semibold text-slate-800 dark:text-slate-100 uppercase tracking-wider">Semua Tugas Ditugaskan ({userTasks.length})</h3>
                </div>
              </div>
              {userTasks.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-6 text-center">Tidak ada tugas aktif yang ditugaskan kepada pengguna ini.</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
                  {userTasks.map(t => (
                    <div key={t.id} className="p-2.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-md flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-xs text-slate-800 dark:text-slate-100 truncate max-w-[280px]">{t.title}</div>
                        <div className="text-[10px] font-mono text-slate-400 uppercase mt-0.5">{t.key || 'TASK'}</div>
                      </div>
                      <span className={cn(
                        "text-[10px] font-semibold uppercase px-2 py-0.5 rounded-md border",
                        t.status === 'completed' || t.status === 'done' ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800" : "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800"
                      )}>
                        {t.status || 'todo'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

        </div>
      </div>
    </div>
  </div>
  );
};

export default UserDetailView;
