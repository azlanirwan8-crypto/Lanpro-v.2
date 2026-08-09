import React from 'react';
import { UserProfile, Project, Task, AppRole, UserPermissions } from '../../types';
import { UserAvatar } from './styles';
import { 
  ArrowLeft, ShieldCheck, Award, UserCog, Users, Eye, CheckCircle, 
  Layout, Mail, Phone, Calendar, Key, Check, X, Shield, Clock, Building
} from 'lucide-react';
import { cn } from '../../lib/utils';

interface UserDetailViewProps {
  user: UserProfile | null;
  onBack: () => void;
  projects: Project[];
  tasks: Task[];
  departments?: any[];
  positions?: any[];
}

export const UserDetailView: React.FC<UserDetailViewProps> = ({
  user,
  onBack,
  projects,
  tasks,
  departments = [],
  positions = []
}) => {
  if (!user) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#f8fafc]">
        <h2 className="text-xl font-bold text-slate-800 mb-2">Pengguna tidak ditemukan</h2>
        <button onClick={onBack} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold">
          Kembali
        </button>
      </div>
    );
  }

  const userProjects = (projects || []).filter(p =>
    (p.members && (p.members.includes(user.id) || p.members.includes(user.uid))) ||
    p.ownerId === user.id ||
    p.ownerId === user.uid
  );

  const userTasks = (tasks || []).filter(t =>
    t.assigneeId === user.id ||
    t.assigneeId === user.uid ||
    (t.assignees && (t.assignees.includes(user.id) || t.assignees.includes(user.uid))) ||
    t.assigneeEmail === user?.email
  );

  const getDeptName = (deptId?: string) => {
    const found = departments.find((d: any) => (d.id || d.code) === deptId);
    return found?.name || deptId || 'Umum';
  };

  const getPosName = (posId?: string) => {
    const found = positions.find((p: any) => (p.id || p.code) === posId);
    return found?.name || posId || 'Anggota Tim';
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#f8fafc] overflow-y-auto">
      {/* Velzon Header Bar */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-30 shadow-2xs">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 bg-slate-100 hover:bg-indigo-600 hover:text-white rounded-xl text-slate-700 transition-all flex items-center gap-2 text-xs font-bold cursor-pointer shadow-2xs"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Manajemen Pengguna</span>
          </button>
          <div className="h-5 w-px bg-slate-200" />
          <div className="flex flex-col">
            <span className="text-xs font-black text-indigo-600 tracking-wider uppercase">
              DETAIL PROFIL PENGGUNA
            </span>
            <h1 className="text-base font-black text-slate-800 tracking-tight">
              {user.displayName || user.username}
            </h1>
          </div>
        </div>
      </div>

      {/* Main Content Container */}
      <div className="p-6 max-w-7xl mx-auto w-full space-y-6">
        {/* Profile Card Header */}
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row items-center md:items-start gap-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-50 rounded-bl-full pointer-events-none opacity-60" />
          
          <UserAvatar user={user} className="w-24 h-24 text-3xl shadow-md border-4 border-white ring-4 ring-indigo-50 shrink-0" />
          
          <div className="flex-1 text-center md:text-left space-y-2 z-10">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-black text-slate-800 tracking-tight">{user.displayName || user.username}</h2>
                <p className="text-xs font-semibold text-slate-400 mt-0.5">@{user.username || user.email?.split('@')[0]}</p>
              </div>
              <div className="flex items-center justify-center gap-2">
                <span className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider border shadow-2xs",
                  user.role === 'admin' ? "bg-rose-50 text-rose-700 border-rose-200" :
                  user.role === 'head' ? "bg-purple-50 text-purple-700 border-purple-200" :
                  user.role === 'manager' ? "bg-blue-50 text-blue-700 border-blue-200" :
                  user.role === 'user' ? "bg-indigo-50 text-indigo-700 border-indigo-200" :
                  "bg-slate-100 text-slate-700 border-slate-300"
                )}>
                  {user.role === 'admin' && <ShieldCheck className="w-3.5 h-3.5 shrink-0" />}
                  {user.role === 'head' && <Award className="w-3.5 h-3.5 shrink-0" />}
                  {user.role === 'manager' && <UserCog className="w-3.5 h-3.5 shrink-0" />}
                  {user.role === 'user' && <Users className="w-3.5 h-3.5 shrink-0" />}
                  {user.role === 'viewer' && <Eye className="w-3.5 h-3.5 shrink-0" />}
                  <span>{user.role}</span>
                </span>
                
                <span className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold uppercase tracking-wider border",
                  user.status === 'approved' ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                  user.status === 'pending' ? "bg-amber-50 text-amber-700 border-amber-200" :
                  "bg-rose-50 text-rose-700 border-rose-200"
                )}>
                  {user.status === 'approved' ? <CheckCircle className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                  <span>{user.status}</span>
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-4 border-t border-slate-100">
              <div className="flex items-center gap-3 text-xs font-semibold text-slate-600">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-400">Email Address</div>
                  <div className="font-bold text-slate-800">{user.email || 'Tidak tersedia'}</div>
                </div>
              </div>

              <div className="flex items-center gap-3 text-xs font-semibold text-slate-600">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                  <Phone className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-400">WhatsApp / HP</div>
                  <div className="font-bold text-slate-800">{user.phone || 'Tidak tersedia'}</div>
                </div>
              </div>

              <div className="flex items-center gap-3 text-xs font-semibold text-slate-600">
                <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
                  <Building className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-400">Departemen / Posisi</div>
                  <div className="font-bold text-slate-800">{getDeptName(user.department)} • {getPosName(user.position)}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats & Overview Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Proyek Terlibat */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layout className="w-5 h-5 text-indigo-600" />
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Proyek Terkait ({userProjects.length})</h3>
              </div>
            </div>
            {userProjects.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-6 text-center">Pengguna belum tergabung dalam proyek aktif.</p>
            ) : (
              <div className="space-y-2.5">
                {userProjects.map(p => (
                  <div key={p.id} className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between">
                    <div>
                      <div className="font-bold text-xs text-slate-800">{p.name}</div>
                      <div className="text-[10px] font-mono text-indigo-600 uppercase mt-0.5">{p.key}</div>
                    </div>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-lg">
                      {p.ownerId === (user.id || user.uid) ? 'Owner' : 'Member'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Tugas / Issue Terkait */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-violet-600" />
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Tugas Ditugaskan ({userTasks.length})</h3>
              </div>
            </div>
            {userTasks.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-6 text-center">Tidak ada tugas aktif yang ditugaskan kepada pengguna ini.</p>
            ) : (
              <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                {userTasks.map(t => (
                  <div key={t.id} className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between">
                    <div>
                      <div className="font-bold text-xs text-slate-800 truncate max-w-[240px]">{t.title}</div>
                      <div className="text-[10px] font-mono text-slate-500 uppercase mt-0.5">{t.key || 'TASK'}</div>
                    </div>
                    <span className={cn(
                      "text-[10px] font-black uppercase px-2 py-0.5 rounded-lg border",
                      t.status === 'completed' || t.status === 'done' ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200"
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
  );
};

export default UserDetailView;
