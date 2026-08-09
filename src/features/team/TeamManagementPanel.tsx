import React, { useState } from 'react';
import { 
  Users, UserPlus, FileText, LayoutGrid, Zap, Search, X, Trash2, Mail, Download, ChevronDown
} from 'lucide-react';
import { UserProfile, Project, Task, AppRole, MasterData } from '../../types';
import { UserAvatar } from '../../components/ui/UserAvatar';
import { toast } from 'sonner';
import { apiRequest } from '../../lib/api';
import { ConfirmationModal } from '../../components/ui/ConfirmationModal';

export const TeamManagementPanel = ({ 
  projectMembers: propMembers,
  selectedProject,
  tasks: propTasks,
  currentUserProfile,
  userRole,
  hasPermission,
  StyledDropdown,
  updateProjectRole,
  removeProjectMember,
  masterData: propMaster,
  onRefreshProjects
}: {
  projectMembers: UserProfile[];
  selectedProject: Project | null;
  tasks: Task[];
  currentUserProfile: UserProfile | null;
  userRole: AppRole | null;
  hasPermission: (...args: any[]) => boolean;
  StyledDropdown: any;
  updateProjectRole: (uid: string, role: string) => void;
  removeProjectMember: (uid: string) => Promise<void>;
  masterData: MasterData[];
  onRefreshProjects?: () => void;
}) => {
  const [teamSearch, setTeamSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [memberToDelete, setMemberToDelete] = useState<any | null>(null);
  const [inviteToCancel, setInviteToCancel] = useState<any | null>(null);
  
  const projectMembers = Array.isArray(propMembers) ? propMembers : [];
  const tasks = Array.isArray(propTasks) ? propTasks : [];
  const masterData = Array.isArray(propMaster) ? propMaster : [];

  const allPeople = [
    ...projectMembers.map(m => ({ ...m, isPending: false })), 
    ...(selectedProject?.pendingInvites || []).map(email => ({ uid: email, email, displayName: email.split('@')[0], isPending: true }))
  ];

  const handleExportTeamCSV = () => {
    try {
      const filtered = allPeople.filter(p => {
        const search = teamSearch.toLowerCase();
        const pUser = p as any;
        const matchesSearch = (p?.displayName?.toLowerCase().includes(search) || 
                              p?.email?.toLowerCase().includes(search) ||
                              pUser?.username?.toLowerCase().includes(search));
        
        const role = selectedProject?.memberRoles?.[p.uid] || 'viewer';
        const matchesRole = roleFilter === 'all' || role === roleFilter;
        return matchesSearch && matchesRole;
      });

      if (filtered.length === 0) {
        toast.error('Tidak ada data tim untuk di-export');
        return;
      }

      const headers = ['UID/Email', 'Nama Lengkap', 'Username', 'Project Role', 'Status', 'Jumlah Tugas', 'Beban Kerja'];
      const rows = filtered.map(p => {
        const role = selectedProject?.memberRoles?.[p.uid] || 'viewer';
        const isPending = p.isPending;
        const taskCount = tasks.filter(t => t.assigneeId === p.uid).length;
        const workload = taskCount === 0 ? 'Idle' : taskCount > 4 ? 'Overloaded' : 'Optimal';
        return [
          p.uid,
          p?.displayName || '',
          (p as any)?.username || '',
          role,
          isPending ? 'Pending' : 'Active',
          taskCount,
          workload
        ];
      });

      const csvContent = "data:text/csv;charset=utf-8," 
        + [headers.join(','), ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))].join('\n');
      
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `team_members_export_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success(`Berhasil meng-export ${filtered.length} anggota tim ke CSV!`);
    } catch (e) {
      console.error(e);
      toast.error('Gagal meng-export CSV');
    }
  };
  
  const activeTeam = allPeople.filter(p => !p.isPending).length;
  const pendingInvites = allPeople.filter(p => p.isPending).length;
  const totalTasks = tasks.length;
  const assignedTasks = tasks.filter(t => t.assigneeId).length;

  return (
    <div className="p-6 md:p-8 w-full space-y-6 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Team Management</h1>
        </div>
      </div>

      {/* Confirmation Modals */}
      {!!memberToDelete && (
        <ConfirmationModal
          isOpen={!!memberToDelete}
          onClose={() => setMemberToDelete(null)}
          title="Hapus Anggota Tim?"
          message={`Apakah Anda yakin ingin menghapus ${memberToDelete?.displayName || memberToDelete?.email} dari proyek ini? Tindakan ini akan menghapus akses mereka ke seluruh papan kanban, tugas, dan flowchart di proyek ini.`}
          onConfirm={async () => {
            if (!memberToDelete) return;
            const uid = memberToDelete.uid;
            setMemberToDelete(null);
            await removeProjectMember(uid);
          }}
          confirmText="Ya, Hapus"
          cancelText="Batal"
          variant="danger"
        />
      )}

      {!!inviteToCancel && (
        <ConfirmationModal
          isOpen={!!inviteToCancel}
          onClose={() => setInviteToCancel(null)}
          title="Batalkan Undangan?"
          message={`Apakah Anda yakin ingin membatalkan undangan untuk ${inviteToCancel?.email || inviteToCancel?.displayName}?`}
          onConfirm={async () => {
            if (!inviteToCancel || !selectedProject) return;
            const emailToCancel = inviteToCancel.email;
            setInviteToCancel(null);
            try {
              const newPending = (selectedProject.pendingInvites || []).filter((e: string) => e !== emailToCancel);
              const effectiveUserId = currentUserProfile?.uid || "guest";
              const data = await apiRequest(`/api/projects/${selectedProject.id}`, {
                method: 'PUT',
                headers: { 
                  'x-user-id': effectiveUserId
                },
                body: { pendingInvites: newPending }
              });
              if (data.status === 'success') {
                toast.success('Undangan berhasil dibatalkan');
                if (onRefreshProjects) {
                  onRefreshProjects();
                }
              } else {
                toast.error(data.message || 'Gagal membatalkan undangan');
              }
            } catch (e: any) {
              console.error(e);
              toast.error('Gagal membatalkan undangan: ' + (e.message || e));
            }
          }}
          confirmText="Ya, Batalkan"
          cancelText="Batal"
          variant="danger"
        />
      )}

      {/* Team Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex items-center gap-5 transition-all hover:shadow-md hover:-translate-y-1">
              <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shadow-inner">
                  <Users className="w-7 h-7" />
              </div>
              <div>
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Team</div>
                  <div className="text-4xl font-black text-slate-900 leading-none mt-1">{activeTeam}</div>
              </div>
          </div>
          <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex items-center gap-5 transition-all hover:shadow-md hover:-translate-y-1">
              <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center shadow-inner">
                  <LayoutGrid className="w-7 h-7" />
              </div>
              <div>
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Assigned Tasks</div>
                  <div className="text-4xl font-black text-slate-900 leading-none mt-1">{assignedTasks}</div>
              </div>
          </div>
          <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex items-center gap-5 transition-all hover:shadow-md hover:-translate-y-1">
              <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center shadow-inner">
                  <Mail className="w-7 h-7" />
              </div>
              <div>
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pending Invites</div>
                  <div className="text-4xl font-black text-slate-900 leading-none mt-1">{pendingInvites}</div>
              </div>
          </div>
          <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex items-center gap-5 transition-all hover:shadow-md hover:-translate-y-1">
              <div className="w-14 h-14 bg-violet-50 text-violet-600 rounded-2xl flex items-center justify-center shadow-inner">
                  <Zap className="w-7 h-7" />
              </div>
              <div>
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Team Velocity</div>
                  <div className="text-4xl font-black text-slate-900 leading-none mt-1">4.2</div>
              </div>
          </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] items-center">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search members by name, role, or username..." 
            value={teamSearch} 
            onChange={(e) => setTeamSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:ring-4 focus:ring-indigo-500/10 focus:bg-white outline-none text-slate-700 transition-all font-bold placeholder:font-medium placeholder:text-slate-400"
          />
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          <div className="relative w-full sm:w-[180px]">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full pl-4 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-indigo-500/10 outline-none text-slate-750 font-bold text-sm cursor-pointer appearance-none"
            >
              <option value="all">Semua Role</option>
              <option value="admin">Admin</option>
              <option value="system analyst">System Analyst</option>
              <option value="arsitektur">Architecture</option>
              <option value="dba">DBA</option>
              <option value="ui/ux">UI/UX</option>
              <option value="developer">Developer</option>
              <option value="qa">QA</option>
              <option value="bisnis analyst">Business Analyst</option>
              <option value="member">Member</option>
              <option value="viewer">Viewer</option>
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
          <button
            onClick={handleExportTeamCSV}
            className="flex items-center justify-center gap-2 px-5 py-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 hover:border-indigo-300 rounded-2xl text-sm font-bold shadow-xs transition-all active:scale-95 cursor-pointer w-full sm:w-auto"
          >
            <Download className="w-4 h-4 text-indigo-650" /> Export CSV
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-[0_8px_40px_rgb(0,0,0,0.04)] overflow-hidden">
        <table className="w-full text-left min-w-[800px]">
          <thead>
            <tr className="bg-slate-50/50 border-b border-slate-100">
              <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">MEMBERS</th>
              <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">ALLOCATION</th>
              <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">ROLE</th>
              <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">STATUS</th>
              <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">ACTION</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 italic-rows">
            {allPeople.filter(p => {
              const search = teamSearch.toLowerCase();
              const pUser = p as any;
              const matchesSearch = (p?.displayName?.toLowerCase().includes(search) || 
                      p?.email?.toLowerCase().includes(search) ||
                      pUser?.username?.toLowerCase().includes(search));
              
              const role = selectedProject?.memberRoles?.[p.uid] || 'viewer';
              const matchesRole = roleFilter === 'all' || role === roleFilter;
              return matchesSearch && matchesRole;
            }).map((person: any, i) => {
              const name = person?.displayName || person?.email || 'Unknown';
              const initialsMatch = name.match(/\b\w/g);
              const initials = (initialsMatch ? initialsMatch.join('') : name.substring(0, 2)).substring(0, 2).toUpperCase();
              const colors = ['bg-blue-600', 'bg-indigo-600', 'bg-violet-600', 'bg-emerald-600'];
              const bgColor = colors[i % colors.length];
              const isOwner = selectedProject?.ownerId === person.uid || selectedProject?.ownerId === person.id;
              
                return (
                  <tr key={person.uid} className="hover:bg-indigo-50/30 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          {person.photoURL ? (
                            <img src={person.photoURL} className="w-11 h-11 rounded-2xl object-cover shadow-sm ring-2 ring-white" referrerPolicy="no-referrer" />
                          ) : (
                            <div className={`w-11 h-11 rounded-2xl ${bgColor} flex items-center justify-center text-white font-black text-[10px] shadow-sm ring-2 ring-white`}>
                              {initials}
                            </div>
                          )}
                          <div className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white shadow-sm ${person.isPending ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                        </div>
                        <div className="flex flex-col">
                          <div className="font-bold text-slate-800 tracking-tight text-sm leading-tight">{name}</div>
                          <div className="text-[10px] text-slate-400 font-black uppercase tracking-tighter mt-0.5">{person?.username || '@' + person.uid.toLowerCase()}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-6">
                        <div className="flex flex-col min-w-[50px]">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Tasks</span>
                          <span className="font-black text-slate-700 text-lg leading-tight mt-0.5">
                            {tasks.filter(t => t.assigneeId === person.uid).length}
                          </span>
                        </div>
                        {/* Workload Status Bar */}
                        <div className="flex-1 min-w-[140px] max-w-[200px]">
                          {(() => {
                            const count = tasks.filter(t => t.assigneeId === person.uid).length;
                            const isPending = person.isPending;
                            
                            if (isPending) {
                              return (
                                <span className="text-[10px] text-slate-400 italic font-semibold">Undangan Terkirim</span>
                              );
                            }
                            
                            // Workload classification
                            let statusText = "Idle";
                            let statusColor = "bg-slate-50 text-slate-500 border-slate-150";
                            let barColor = "bg-slate-300";
                            let fillPercent = 0;
                            
                            if (count > 0 && count <= 4) {
                              statusText = "Optimal";
                              statusColor = "bg-emerald-50 text-emerald-700 border-emerald-100";
                              barColor = "bg-emerald-500";
                              fillPercent = Math.min(100, (count / 4) * 100);
                            } else if (count > 4) {
                              statusText = "Overloaded";
                              statusColor = "bg-rose-50 text-rose-700 border-rose-100";
                              barColor = "bg-rose-500";
                              fillPercent = 100;
                            }
                            
                            return (
                              <div className="space-y-1">
                                <div className="flex items-center justify-between">
                                  <span className={`inline-flex px-1.5 py-0.5 rounded text-[9px] font-extrabold border ${statusColor}`}>
                                    {statusText}
                                  </span>
                                  <span className="text-[10px] font-bold text-slate-500">{Math.round(fillPercent)}% load</span>
                                </div>
                                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                  <div className={`h-full ${barColor} rounded-full transition-all`} style={{ width: `${fillPercent}%` }} />
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {hasPermission(userRole, 'team', 'update', false, currentUserProfile?.permissions) ? (
                        <StyledDropdown
                          value={selectedProject?.memberRoles?.[person.uid] || 'viewer'}
                          onChange={(val: any) => updateProjectRole(person.uid, val)}
                          options={[
                            { id: 'admin', label: 'Admin' },
                            { id: 'system analyst', label: 'System Analyst' },
                            { id: 'arsitektur', label: 'Architecture' },
                            { id: 'dba', label: 'DBA' },
                            { id: 'ui/ux', label: 'UI/UX' },
                            { id: 'developer', label: 'Developer' },
                            { id: 'qa', label: 'QA' },
                            { id: 'bisnis analyst', label: 'Business Analyst' },
                            { id: 'member', label: 'Member' },
                            { id: 'viewer', label: 'Viewer' },
                            ...(masterData || []).filter((d: any) => d.type === 'project_role' && (d.roleType === 'PROJECT' || d.role_type === 'PROJECT' || (!d.roleType && !d.role_type))).map((d: any) => ({ id: d.label.toLowerCase(), label: d.label, color: d.color, icon: d.icon }))
                          ]}
                          type="role"
                          masterData={masterData}
                          disabled={person.isPending}
                        />
                      ) : (
                        <span className="text-sm text-slate-600 font-medium capitalize">
                          {selectedProject?.memberRoles?.[person.uid] || 'viewer'}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border shadow-sm ${
                         person.isPending ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                       }`}>
                         <div className={`w-1.5 h-1.5 rounded-full ${person.isPending ? 'bg-amber-500' : 'bg-emerald-500'} ${person.isPending ? 'animate-pulse' : ''}`} />
                         {person.isPending ? 'Pending' : 'Active'}
                       </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 text-slate-400">
                        {person.isPending && hasPermission(userRole, 'team', 'update', false, currentUserProfile?.permissions) && (
                          <button 
                            onClick={() => setInviteToCancel(person)}
                            className="p-2.5 text-slate-400 hover:text-rose-500 hover:bg-white rounded-xl transition-all hover:shadow-md active:scale-95 cursor-pointer"
                            title="Cancel Invite"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                        {!isOwner ? (
                          hasPermission(userRole, 'team', 'delete', false, currentUserProfile?.permissions) && (
                            <button 
                              onClick={() => setMemberToDelete(person)}
                              className="p-2 bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white border border-rose-200/80 rounded-xl transition-all shadow-xs active:scale-95 cursor-pointer font-bold flex items-center justify-center"
                              title="Hapus Anggota"
                            >
                              <Trash2 className="w-4 h-4 shrink-0" />
                            </button>
                          )
                        ) : (
                          <span className="text-[10px] bg-slate-100 text-slate-500 px-2.5 py-1 rounded-xl font-bold uppercase tracking-wider">
                            Owner
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
            })}
          </tbody>
        </table>
        {allPeople.length === 0 && (
          <div className="p-12 text-center text-gray-400 italic font-medium">
            No members found. Invite people to collaborate.
          </div>
        )}
      </div>
    </div>
  );
};
